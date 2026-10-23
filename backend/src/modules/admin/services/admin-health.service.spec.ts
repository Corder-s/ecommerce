import { Test, TestingModule } from '@nestjs/testing';
import { AdminHealthService } from './admin-health.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

describe('AdminHealthService', () => {
  let service: AdminHealthService;
  let mockPrisma: any;

  beforeEach(async () => {
    mockPrisma = {
      $queryRaw: jest.fn().mockResolvedValue([{ ping: 1 }]),
      outboxEvent: {
        count: jest.fn().mockImplementation((args) => {
          if (args?.where?.status === 'DEAD_LETTER') return Promise.resolve(0);
          if (args?.where?.status === 'PENDING') return Promise.resolve(5);
          if (args?.where?.status === 'PROCESSING') return Promise.resolve(1);
          return Promise.resolve(0);
        }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminHealthService,
        { provide: PrismaService, useValue: mockPrisma },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('test'),
          },
        },
      ],
    }).compile();

    service = module.get<AdminHealthService>(AdminHealthService);
  });

  it('should return system operational metrics', () => {
    const health = service.getSystemHealth();
    expect(health.status).toBe('HEALTHY');
    expect(health.nodeVersion).toBeDefined();
    expect(health.memory.heapUsedMb).toBeGreaterThan(0);
  });

  it('should return database UP status when ping query succeeds', async () => {
    const dbHealth = await service.getDatabaseHealth();
    expect(dbHealth.status).toBe('UP');
    expect(dbHealth.connected).toBe(true);
    expect(dbHealth.responseTimeMs).toBeGreaterThanOrEqual(0);
  });

  it('should return database DOWN status when ping query fails', async () => {
    mockPrisma.$queryRaw.mockRejectedValueOnce(new Error('Connection lost'));
    const dbHealth = await service.getDatabaseHealth();
    expect(dbHealth.status).toBe('DOWN');
    expect(dbHealth.connected).toBe(false);
  });

  it('should evaluate queues as HEALTHY when no dead-letter events exist', async () => {
    const queueHealth = await service.getQueuesHealth();
    expect(queueHealth.status).toBe('HEALTHY');
    expect(queueHealth.deadLetterEventsCount).toBe(0);
    expect(queueHealth.pendingEventsCount).toBe(5);
  });

  it('should evaluate queues as DEGRADED when dead-letter events exist', async () => {
    mockPrisma.outboxEvent.count.mockImplementation((args: any) => {
      if (args?.where?.status === 'DEAD_LETTER') return Promise.resolve(3);
      return Promise.resolve(0);
    });

    const queueHealth = await service.getQueuesHealth();
    expect(queueHealth.status).toBe('DEGRADED');
    expect(queueHealth.deadLetterEventsCount).toBe(3);
  });
});
