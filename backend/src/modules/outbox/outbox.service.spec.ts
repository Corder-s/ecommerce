import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { OutboxEventStatus } from '@prisma/client';
import { OutboxService } from './outbox.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { DomainEventType } from './interfaces/outbox.interface';

describe('OutboxService', () => {
  let service: OutboxService;

  const mockPrisma = {
    outboxEvent: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
  };

  const sampleEvent = {
    id: 'evt-1',
    eventType: DomainEventType.ORDER_CREATED,
    tenantId: 'tenant-1',
    payload: { orderId: 'ord-1', orderNumber: 'GS-1001' },
    status: OutboxEventStatus.PENDING,
    retryCount: 0,
    maxRetries: 5,
    lastError: null,
    scheduledAt: new Date(),
    processedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OutboxService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<OutboxService>(OutboxService);
    jest.clearAllMocks();
  });

  describe('createEvent', () => {
    it('should create an outbox event with default PENDING status', async () => {
      mockPrisma.outboxEvent.create.mockResolvedValue(sampleEvent);

      const result = await service.createEvent({
        eventType: DomainEventType.ORDER_CREATED,
        tenantId: 'tenant-1',
        payload: { orderId: 'ord-1' },
      });

      expect(mockPrisma.outboxEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          eventType: DomainEventType.ORDER_CREATED,
          tenantId: 'tenant-1',
          status: OutboxEventStatus.PENDING,
          maxRetries: 5,
        }),
      });
      expect(result.id).toBe('evt-1');
    });

    it('should support passing a transactional client tx to commit atomically', async () => {
      const mockTx = {
        outboxEvent: {
          create: jest.fn().mockResolvedValue(sampleEvent),
        },
      };

      await service.createEvent(
        {
          eventType: DomainEventType.ORDER_CREATED,
          payload: { orderId: 'ord-1' },
        },
        mockTx as any,
      );

      expect(mockTx.outboxEvent.create).toHaveBeenCalled();
      expect(mockPrisma.outboxEvent.create).not.toHaveBeenCalled();
    });
  });

  describe('getPendingEvents', () => {
    it('should query pending events due for processing', async () => {
      mockPrisma.outboxEvent.findMany.mockResolvedValue([sampleEvent]);

      const result = await service.getPendingEvents(10);

      expect(mockPrisma.outboxEvent.findMany).toHaveBeenCalledWith({
        where: {
          status: OutboxEventStatus.PENDING,
          scheduledAt: { lte: expect.any(Date) },
        },
        orderBy: { createdAt: 'asc' },
        take: 10,
      });
      expect(result).toHaveLength(1);
    });
  });

  describe('markProcessing & markProcessed', () => {
    it('should transition status to PROCESSING', async () => {
      mockPrisma.outboxEvent.update.mockResolvedValue({
        ...sampleEvent,
        status: OutboxEventStatus.PROCESSING,
      });

      const result = await service.markProcessing('evt-1');

      expect(mockPrisma.outboxEvent.update).toHaveBeenCalledWith({
        where: { id: 'evt-1' },
        data: { status: OutboxEventStatus.PROCESSING },
      });
      expect(result.status).toBe(OutboxEventStatus.PROCESSING);
    });

    it('should mark event as PROCESSED and set processedAt timestamp', async () => {
      mockPrisma.outboxEvent.update.mockResolvedValue({
        ...sampleEvent,
        status: OutboxEventStatus.PROCESSED,
        processedAt: new Date(),
      });

      const result = await service.markProcessed('evt-1');

      expect(mockPrisma.outboxEvent.update).toHaveBeenCalledWith({
        where: { id: 'evt-1' },
        data: {
          status: OutboxEventStatus.PROCESSED,
          processedAt: expect.any(Date),
          lastError: null,
        },
      });
      expect(result.status).toBe(OutboxEventStatus.PROCESSED);
    });
  });

  describe('handleFailure', () => {
    it('should schedule exponential backoff retry for transient failure', async () => {
      mockPrisma.outboxEvent.findUnique.mockResolvedValue({
        ...sampleEvent,
        retryCount: 1,
        maxRetries: 5,
      });
      mockPrisma.outboxEvent.update.mockImplementation(({ data }) => ({
        ...sampleEvent,
        ...data,
      }));

      const result = await service.handleFailure('evt-1', new Error('Network timeout'));

      expect(result.status).toBe(OutboxEventStatus.PENDING);
      expect(result.retryCount).toBe(2);
      expect(result.lastError).toBe('Network timeout');
      // Delay = min(300, 2^2 * 2 = 8s) -> scheduled in future
      expect(result.scheduledAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('should transition directly to DEAD_LETTER if error is permanent', async () => {
      mockPrisma.outboxEvent.findUnique.mockResolvedValue({
        ...sampleEvent,
        retryCount: 0,
        maxRetries: 5,
      });
      mockPrisma.outboxEvent.update.mockImplementation(({ data }) => ({
        ...sampleEvent,
        ...data,
      }));

      const result = await service.handleFailure(
        'evt-1',
        new Error('Permanent failure: Recipient mailbox does not exist'),
      );

      expect(result.status).toBe(OutboxEventStatus.DEAD_LETTER);
      expect(result.retryCount).toBe(1);
    });

    it('should transition to DEAD_LETTER when maximum retries are exhausted', async () => {
      mockPrisma.outboxEvent.findUnique.mockResolvedValue({
        ...sampleEvent,
        retryCount: 4,
        maxRetries: 5,
      });
      mockPrisma.outboxEvent.update.mockImplementation(({ data }) => ({
        ...sampleEvent,
        ...data,
      }));

      const result = await service.handleFailure('evt-1', new Error('Persistent failure'));

      expect(result.status).toBe(OutboxEventStatus.DEAD_LETTER);
      expect(result.retryCount).toBe(5);
    });

    it('should throw NotFoundException if event does not exist', async () => {
      mockPrisma.outboxEvent.findUnique.mockResolvedValue(null);

      await expect(service.handleFailure('unknown', 'error')).rejects.toThrow(NotFoundException);
    });
  });

  describe('replayEvent', () => {
    it('should reset dead-lettered event to PENDING for manual recovery', async () => {
      mockPrisma.outboxEvent.update.mockResolvedValue({
        ...sampleEvent,
        status: OutboxEventStatus.PENDING,
        retryCount: 0,
        lastError: null,
      });

      const result = await service.replayEvent('evt-1');

      expect(mockPrisma.outboxEvent.update).toHaveBeenCalledWith({
        where: { id: 'evt-1' },
        data: {
          status: OutboxEventStatus.PENDING,
          retryCount: 0,
          scheduledAt: expect.any(Date),
          lastError: null,
        },
      });
      expect(result.status).toBe(OutboxEventStatus.PENDING);
    });
  });
});
