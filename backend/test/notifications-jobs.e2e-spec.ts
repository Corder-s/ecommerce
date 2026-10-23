import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { generateKeyPair, SignJWT } from 'jose';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { TokenVerificationService } from '../src/modules/auth/token-verifier.service';
import { IdentityService } from '../src/modules/auth/identity.service';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { OutboxService } from '../src/modules/outbox/outbox.service';
import { OutboxProcessor } from '../src/modules/outbox/outbox.processor';
import { EMAIL_PROVIDER, SandboxEmailProvider } from '../src/integrations/email-provider';
import { PlatformRole, TenantRole, NotificationType, OutboxEventStatus } from '@prisma/client';
import { DomainEventType } from '../src/modules/outbox/interfaces/outbox.interface';

describe('Notifications, Background Jobs & Outbox Reliability (Step 10 e2e)', () => {
  let app: INestApplication;
  let testKeyPair: Awaited<ReturnType<typeof generateKeyPair>>;
  let tokenVerifierService: TokenVerificationService;
  let identityService: IdentityService;
  let outboxService: OutboxService;
  let outboxProcessor: OutboxProcessor;
  let emailProvider: SandboxEmailProvider;

  const ISSUER = 'https://auth.gaushilp.example/';
  const AUDIENCE = 'gaushilp-api';

  const userAId = 'u0000000-0000-4000-8000-000000000001';
  const userBId = 'u0000000-0000-4000-8000-000000000002';
  const tenantId = 't0000000-0000-4000-8000-000000000001';

  let userAToken: string;
  let userBToken: string;

  const mockUserA = {
    id: userAId,
    email: 'usera@example.com',
    name: 'User Alpha',
    platformRole: PlatformRole.USER,
    memberships: [
      {
        id: 'mem-a',
        tenantId,
        role: TenantRole.STORE_OWNER,
        status: 'ACTIVE' as const,
      },
    ],
  };

  const mockUserB = {
    id: userBId,
    email: 'userb@example.com',
    name: 'User Beta',
    platformRole: PlatformRole.USER,
    memberships: [],
  };

  const mockNotifications: any[] = [];
  const mockOutboxEvents: any[] = [];

  const mockPrisma = {
    notification: {
      findMany: jest.fn().mockImplementation((args) => {
        const userId = args?.where?.recipientUserId;
        const unreadOnly = args?.where?.readAt === null;
        return mockNotifications.filter(
          (n) => n.recipientUserId === userId && (!unreadOnly || n.readAt === null),
        );
      }),
      count: jest.fn().mockImplementation((args) => {
        const userId = args?.where?.recipientUserId;
        const unreadOnly = args?.where?.readAt === null;
        return mockNotifications.filter(
          (n) => n.recipientUserId === userId && (!unreadOnly || n.readAt === null),
        ).length;
      }),
      findUnique: jest.fn().mockImplementation((args) => {
        return mockNotifications.find((n) => n.id === args?.where?.id) || null;
      }),
      findFirst: jest.fn().mockImplementation((args) => {
        const { id, recipientUserId, title } = args?.where || {};
        return (
          mockNotifications.find((n) => {
            if (id && n.id !== id) return false;
            if (recipientUserId && n.recipientUserId !== recipientUserId) return false;
            if (title && n.title !== title) return false;
            return true;
          }) || null
        );
      }),

      create: jest.fn().mockImplementation((args) => {
        const created = {
          id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          ...args.data,
          readAt: null,
          createdAt: new Date(),
        };
        mockNotifications.push(created);
        return created;
      }),
      update: jest.fn().mockImplementation((args) => {
        const notif = mockNotifications.find((n) => n.id === args?.where?.id);
        if (notif) {
          Object.assign(notif, args.data);
          return notif;
        }
        return null;
      }),
      updateMany: jest.fn().mockImplementation((args) => {
        const userId = args?.where?.recipientUserId;
        let count = 0;
        for (const n of mockNotifications) {
          if (n.recipientUserId === userId && n.readAt === null) {
            n.readAt = args?.data?.readAt || new Date();
            count++;
          }
        }
        return { count };
      }),
    },
    outboxEvent: {
      create: jest.fn().mockImplementation((args) => {
        const event = {
          id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          ...args.data,
          retryCount: 0,
          maxRetries: args.data.maxRetries || 5,
          lastError: null,
          scheduledAt: args.data.scheduledAt || new Date(),
          processedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        mockOutboxEvents.push(event);
        return event;
      }),
      findMany: jest.fn().mockImplementation((args) => {
        const status = args?.where?.status;
        return mockOutboxEvents.filter((e) => !status || e.status === status);
      }),
      findUnique: jest.fn().mockImplementation((args) => {
        return mockOutboxEvents.find((e) => e.id === args?.where?.id) || null;
      }),
      update: jest.fn().mockImplementation((args) => {
        const event = mockOutboxEvents.find((e) => e.id === args?.where?.id);
        if (event) {
          Object.assign(event, args.data);
          return event;
        }
        return null;
      }),
    },
    customer: {
      findUnique: jest.fn().mockImplementation((args) => {
        if (args?.where?.id === 'cust-alpha') {
          return {
            id: 'cust-alpha',
            user: mockUserA,
          };
        }
        return null;
      }),
    },
    tenantMembership: {
      findFirst: jest.fn().mockImplementation((args) => {
        if (args?.where?.tenantId === tenantId) {
          return {
            id: 'mem-a',
            user: mockUserA,
          };
        }
        return null;
      }),
    },
    user: {
      findUnique: jest.fn().mockImplementation((args) => {
        if (args?.where?.id === userAId || args?.where?.id === 'cust-alpha') return mockUserA;
        if (args?.where?.id === userBId) return mockUserB;
        return null;
      }),
    },
    order: {
      findUnique: jest.fn().mockImplementation((args) => {
        return {
          id: args?.where?.id,
          orderNumber: 'GS-TEST-101',
          userId: userAId,
          user: mockUserA,
        };
      }),
    },
  };

  beforeAll(async () => {
    testKeyPair = await generateKeyPair('RS256');

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());

    tokenVerifierService = app.get(TokenVerificationService);
    identityService = app.get(IdentityService);
    outboxService = app.get(OutboxService);
    outboxProcessor = app.get(OutboxProcessor);
    emailProvider = app.get(EMAIL_PROVIDER) as SandboxEmailProvider;

    tokenVerifierService.setCustomKeyProvider(testKeyPair.publicKey);
    await app.init();

    // Helper to generate JWT tokens
    const createToken = async (userId: string, email: string) => {
      return new SignJWT({
        sub: `auth0|${userId}`,
        email,
        iss: ISSUER,
        aud: AUDIENCE,
      })
        .setProtectedHeader({ alg: 'RS256' })
        .setIssuedAt()
        .setExpirationTime('1h')
        .sign(testKeyPair.privateKey);
    };

    userAToken = await createToken(userAId, mockUserA.email);
    userBToken = await createToken(userBId, mockUserB.email);

    // Mock token verification & user resolution
    jest.spyOn(tokenVerifierService, 'verifyToken').mockImplementation(async (token: string) => {
      if (token === userAToken) {
        return {
          sub: `auth0|${userAId}`,
          email: mockUserA.email,
          iss: ISSUER,
          aud: AUDIENCE,
        };
      }
      if (token === userBToken) {
        return {
          sub: `auth0|${userBId}`,
          email: mockUserB.email,
          iss: ISSUER,
          aud: AUDIENCE,
        };
      }
      throw new Error('Invalid token');
    });

    jest.spyOn(identityService, 'resolveUserFromToken').mockImplementation(async (claims: any) => {
      if (claims.sub === `auth0|${userAId}`) {
        return mockUserA as any;
      }
      if (claims.sub === `auth0|${userBId}`) {
        return mockUserB as any;
      }
      return null;
    });
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    mockNotifications.length = 0;
    mockOutboxEvents.length = 0;
    emailProvider.clearSentEmails();
    jest.clearAllMocks();
  });

  describe('1. In-App Notifications API Endpoints', () => {
    it('GET /api/v1/notifications - should return 401 when unauthenticated', async () => {
      await request(app.getHttpServer()).get('/api/v1/notifications').expect(401);
    });

    it('GET /api/v1/notifications - should list paginated notifications for caller', async () => {
      mockNotifications.push({
        id: 'notif-a1',
        recipientUserId: userAId,
        tenantId,
        type: NotificationType.ORDER_CREATED,
        title: 'New Order Received',
        message: 'Order #GS-001 placed',
        data: null,
        readAt: null,
        createdAt: new Date(),
      });

      const res = await request(app.getHttpServer())
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(200);

      expect(res.body.notifications).toHaveLength(1);
      expect(res.body.notifications[0].id).toBe('notif-a1');
      expect(res.body.unreadCount).toBe(1);
      expect(res.body.total).toBe(1);
    });

    it('GET /api/v1/notifications/unread-count - should return badge unread count', async () => {
      mockNotifications.push(
        {
          id: 'n1',
          recipientUserId: userAId,
          type: NotificationType.ORDER_CREATED,
          title: 'Order 1',
          message: 'Msg',
          readAt: null,
          createdAt: new Date(),
        },
        {
          id: 'n2',
          recipientUserId: userAId,
          type: NotificationType.PAYMENT_SUCCEEDED,
          title: 'Payment 1',
          message: 'Msg',
          readAt: new Date(), // Already read
          createdAt: new Date(),
        },
      );

      const res = await request(app.getHttpServer())
        .get('/api/v1/notifications/unread-count')
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(200);

      expect(res.body.unreadCount).toBe(1);
    });

    it('PATCH /api/v1/notifications/:id/read - should mark owned notification as read', async () => {
      mockNotifications.push({
        id: 'notif-mark-1',
        recipientUserId: userAId,
        type: NotificationType.ORDER_CREATED,
        title: 'Order',
        message: 'Msg',
        readAt: null,
        createdAt: new Date(),
      });

      const res = await request(app.getHttpServer())
        .patch('/api/v1/notifications/notif-mark-1/read')
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(200);

      expect(res.body.id).toBe('notif-mark-1');
      expect(res.body.isRead).toBe(true);
      expect(res.body.readAt).toBeDefined();
    });

    it('PATCH /api/v1/notifications/:id/read - should return 404 when attempting to mark another user notification (IDOR defense)', async () => {
      // Notification belongs to User A
      mockNotifications.push({
        id: 'notif-user-a',
        recipientUserId: userAId,
        type: NotificationType.ORDER_CREATED,
        title: 'User A Private Alert',
        message: 'Confidential',
        readAt: null,
        createdAt: new Date(),
      });

      // User B attempts to mark it as read
      await request(app.getHttpServer())
        .patch('/api/v1/notifications/notif-user-a/read')
        .set('Authorization', `Bearer ${userBToken}`)
        .expect(404);
    });

    it('PATCH /api/v1/notifications/read-all - should mark all unread notifications as read', async () => {
      mockNotifications.push(
        {
          id: 'n1',
          recipientUserId: userAId,
          type: NotificationType.ORDER_CREATED,
          title: 'Order 1',
          message: 'Msg',
          readAt: null,
          createdAt: new Date(),
        },
        {
          id: 'n2',
          recipientUserId: userAId,
          type: NotificationType.ORDER_CREATED,
          title: 'Order 2',
          message: 'Msg',
          readAt: null,
          createdAt: new Date(),
        },
      );

      const res = await request(app.getHttpServer())
        .patch('/api/v1/notifications/read-all')
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.count).toBe(2);
    });
  });

  describe('2. Transactional Outbox Pattern & Background Event Processing', () => {
    it('should create outbox event in PENDING status and process it asynchronously', async () => {
      // 1. Create outbox event
      const event = await outboxService.createEvent({
        eventType: DomainEventType.ORDER_CREATED,
        tenantId,
        payload: {
          orderId: 'ord-test-101',
          orderNumber: 'GS-TEST-101',
          customerId: 'cust-alpha',
          totalAmount: 2500,
          currency: 'INR',
        },
      });

      expect(event.id).toBeDefined();
      expect(event.status).toBe(OutboxEventStatus.PENDING);

      // 2. Process pending batch
      const { processed, failed } = await outboxProcessor.processPendingBatch();

      expect(processed).toBe(1);
      expect(failed).toBe(0);

      // 3. Verify event state in DB
      const updatedEvent = mockOutboxEvents.find((e) => e.id === event.id);
      expect(updatedEvent.status).toBe(OutboxEventStatus.PROCESSED);
      expect(updatedEvent.processedAt).toBeDefined();

      // 4. Verify email was sent via SandboxEmailProvider
      const sentEmails = emailProvider.getSentEmails();
      expect(sentEmails.length).toBeGreaterThanOrEqual(1);
      expect(sentEmails[0].to).toBe(mockUserA.email);
      expect(sentEmails[0].subject).toContain('Order Confirmed: #GS-TEST-101');

      // 5. Verify in-app notifications created
      expect(mockNotifications.length).toBeGreaterThanOrEqual(1);
      const customerNotif = mockNotifications.find(
        (n) => n.recipientUserId === userAId && n.title.includes('Order #GS-TEST-101 Confirmed'),
      );
      expect(customerNotif).toBeDefined();
    });
  });

  describe('3. Outbox Failure, Exponential Backoff & Dead-Letter Handling', () => {
    it('should handle transient failure with exponential backoff retry scheduling', async () => {
      const event = await outboxService.createEvent({
        eventType: DomainEventType.PAYMENT_SUCCEEDED,
        tenantId,
        payload: {
          paymentId: 'pay-1',
          orderId: 'ord-1',
          orderNumber: 'GS-PAY-1',
          customerId: 'cust-alpha',
          amount: 500,
        },
      });

      // Simulate transient network error
      const failedResult = await outboxService.handleFailure(
        event.id,
        new Error('Transient connection timeout'),
      );

      expect(failedResult.status).toBe(OutboxEventStatus.PENDING);
      expect(failedResult.retryCount).toBe(1);
      expect(failedResult.lastError).toBe('Transient connection timeout');
      expect(failedResult.scheduledAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('should transition to DEAD_LETTER on permanent failure', async () => {
      const event = await outboxService.createEvent({
        eventType: DomainEventType.ORDER_CREATED,
        tenantId,
        payload: { orderId: 'ord-dead' },
      });

      const failedResult = await outboxService.handleFailure(
        event.id,
        new Error('Permanent failure: Invalid email recipient address'),
      );

      expect(failedResult.status).toBe(OutboxEventStatus.DEAD_LETTER);
      expect(failedResult.retryCount).toBe(1);
    });

    it('should allow manual replay of dead-lettered events', async () => {
      const event = await outboxService.createEvent({
        eventType: DomainEventType.ORDER_CREATED,
        tenantId,
        payload: { orderId: 'ord-replay' },
      });

      // Move to dead letter
      await outboxService.handleFailure(event.id, new Error('Permanent failure'));

      // Replay
      const replayed = await outboxService.replayEvent(event.id);
      expect(replayed.status).toBe(OutboxEventStatus.PENDING);
      expect(replayed.retryCount).toBe(0);
      expect(replayed.lastError).toBeNull();
    });
  });
});
