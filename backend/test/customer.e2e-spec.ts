import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { generateKeyPair, SignJWT } from 'jose';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { TokenVerificationService } from '../src/modules/auth/token-verifier.service';
import { IdentityService } from '../src/modules/auth/identity.service';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { PlatformRole, ProductStatus, TenantStatus } from '@prisma/client';

describe('Customer Management APIs (e2e)', () => {
  let app: INestApplication;
  let testKeyPair: Awaited<ReturnType<typeof generateKeyPair>>;
  let tokenVerifierService: TokenVerificationService;
  let identityService: IdentityService;
  let prismaService: PrismaService;

  const ISSUER = 'https://auth.gaushilp.example/';
  const AUDIENCE = 'gaushilp-api';

  beforeAll(async () => {
    testKeyPair = await generateKeyPair('RS256');

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

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

    tokenVerifierService = moduleFixture.get<TokenVerificationService>(TokenVerificationService);
    tokenVerifierService.setCustomKeyProvider(testKeyPair.publicKey);

    identityService = moduleFixture.get<IdentityService>(IdentityService);
    prismaService = moduleFixture.get<PrismaService>(PrismaService);

    // Mock identity resolution for test customers
    jest.spyOn(identityService, 'resolveUserFromToken').mockImplementation(async (payload) => {
      if (payload.sub === 'sub-customer-a') {
        return {
          id: 'customer-a-uuid',
          name: 'Customer A',
          email: 'customer-a@example.com',
          phone: '+919876543210',
          platformRole: PlatformRole.USER,
          memberships: [],
        };
      }

      return {
        id: 'customer-b-uuid',
        name: 'Customer B',
        email: 'customer-b@example.com',
        phone: '+919876543211',
        platformRole: PlatformRole.USER,
        memberships: [],
      };
    });

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const generateToken = async (sub: string) => {
    return new SignJWT({ sub })
      .setProtectedHeader({ alg: 'RS256' })
      .setIssuedAt()
      .setIssuer(ISSUER)
      .setAudience(AUDIENCE)
      .setExpirationTime('1h')
      .sign(testKeyPair.privateKey);
  };

  // ===========================================================================
  // 1. Unauthenticated Security Boundaries
  // ===========================================================================
  describe('Unauthenticated Security Boundaries', () => {
    it('should reject unauthenticated profile requests with 401', () => {
      return request(app.getHttpServer()).get('/api/v1/customers/me').expect(401);
    });

    it('should reject unauthenticated address listing with 401', () => {
      return request(app.getHttpServer()).get('/api/v1/customers/me/addresses').expect(401);
    });

    it('should reject unauthenticated address creation with 401', () => {
      return request(app.getHttpServer())
        .post('/api/v1/customers/me/addresses')
        .send({ fullName: 'Test' })
        .expect(401);
    });

    it('should reject unauthenticated wishlist listing with 401', () => {
      return request(app.getHttpServer()).get('/api/v1/customers/me/wishlist').expect(401);
    });

    it('should reject unauthenticated wishlist addition with 401', () => {
      return request(app.getHttpServer())
        .post('/api/v1/customers/me/wishlist')
        .send({ productId: '00000000-0000-0000-0000-000000000001' })
        .expect(401);
    });
  });

  // ===========================================================================
  // 2. Customer Profile
  // ===========================================================================
  describe('Customer Profile', () => {
    it("should retrieve authenticated customer's own profile", async () => {
      const token = await generateToken('sub-customer-a');

      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValueOnce({
        id: 'customer-a-uuid',
        name: 'Customer A',
        email: 'customer-a@example.com',
        phone: '+919876543210',
        platformRole: PlatformRole.USER,
        createdAt: new Date(),
        updatedAt: new Date(),
        customerProfile: {
          id: 'cp-1',
          userId: 'customer-a-uuid',
          avatarUrl: 'https://images.example.com/a.jpg',
          bio: 'Handcrafted items enthusiast',
          dateOfBirth: null,
          preferences: { notifications: true },
          isActive: true,
          deactivatedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      } as any);

      return request(app.getHttpServer())
        .get('/api/v1/customers/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe('customer-a-uuid');
          expect(res.body.name).toBe('Customer A');
          expect(res.body.profile.bio).toBe('Handcrafted items enthusiast');
          expect(res.body.profile.isActive).toBe(true);
        });
    });

    it('should update permitted fields and ignore client-supplied id', async () => {
      const token = await generateToken('sub-customer-a');

      jest
        .spyOn(prismaService.user, 'findUnique')
        .mockResolvedValueOnce({
          id: 'customer-a-uuid',
          name: 'Customer A',
          email: 'customer-a@example.com',
          customerProfile: null,
        } as any)
        .mockResolvedValueOnce({
          id: 'customer-a-uuid',
          name: 'Customer A Updated',
          email: 'customer-a@example.com',
          phone: '+919876543210',
          platformRole: PlatformRole.USER,
          createdAt: new Date(),
          updatedAt: new Date(),
          customerProfile: {
            id: 'cp-1',
            bio: 'New artisan bio',
            isActive: true,
            deactivatedAt: null,
          },
        } as any);

      jest.spyOn(prismaService, '$transaction').mockImplementation(async (cb: any) => {
        return cb(prismaService);
      });
      jest.spyOn(prismaService.user, 'update').mockResolvedValueOnce({} as any);
      jest.spyOn(prismaService.customerProfile, 'upsert').mockResolvedValueOnce({} as any);

      return request(app.getHttpServer())
        .patch('/api/v1/customers/me')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Customer A Updated',
          bio: 'New artisan bio',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.name).toBe('Customer A Updated');
          expect(res.body.profile.bio).toBe('New artisan bio');
        });
    });

    it('should reject invalid input payload with 400', async () => {
      const token = await generateToken('sub-customer-a');

      return request(app.getHttpServer())
        .patch('/api/v1/customers/me')
        .set('Authorization', `Bearer ${token}`)
        .send({
          phone: 'invalid-phone-letters',
        })
        .expect(400);
    });
  });

  // ===========================================================================
  // 3. Saved Addresses & Cross-Customer Isolation
  // ===========================================================================
  describe('Saved Addresses & Customer Isolation', () => {
    it('should reject address creation with missing required fields (400)', async () => {
      const token = await generateToken('sub-customer-a');

      return request(app.getHttpServer())
        .post('/api/v1/customers/me/addresses')
        .set('Authorization', `Bearer ${token}`)
        .send({
          fullName: 'Arjun',
          // missing phone, addressLine1, city, state, postalCode
        })
        .expect(400);
    });

    it('should reject address creation with invalid postal code (400)', async () => {
      const token = await generateToken('sub-customer-a');

      return request(app.getHttpServer())
        .post('/api/v1/customers/me/addresses')
        .set('Authorization', `Bearer ${token}`)
        .send({
          fullName: 'Arjun Sharma',
          phone: '+919876543210',
          addressLine1: 'Vrindavan Street 1',
          city: 'Mathura',
          state: 'Uttar Pradesh',
          postalCode: 'AB', // too short, requires 3-10 chars
        })
        .expect(400);
    });

    it('should allow customer to create an address (201)', async () => {
      const token = await generateToken('sub-customer-a');

      jest.spyOn(prismaService.customerAddress, 'count').mockResolvedValueOnce(0);
      jest
        .spyOn(prismaService.customerAddress, 'updateMany')
        .mockResolvedValueOnce({ count: 0 } as any);
      jest.spyOn(prismaService, '$transaction').mockImplementation(async (cb: any) => {
        return cb(prismaService);
      });
      jest.spyOn(prismaService.customerAddress, 'create').mockResolvedValueOnce({
        id: 'addr-a-1',
        userId: 'customer-a-uuid',
        fullName: 'Arjun Sharma',
        phone: '+919876543210',
        addressLine1: 'Flat 402, Vrindavan Heights',
        city: 'Mathura',
        state: 'Uttar Pradesh',
        postalCode: '281001',
        country: 'IN',
        isDefault: true,
        addressType: 'HOME',
      } as any);

      return request(app.getHttpServer())
        .post('/api/v1/customers/me/addresses')
        .set('Authorization', `Bearer ${token}`)
        .send({
          fullName: 'Arjun Sharma',
          phone: '+919876543210',
          addressLine1: 'Flat 402, Vrindavan Heights',
          city: 'Mathura',
          state: 'Uttar Pradesh',
          postalCode: '281001',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.id).toBe('addr-a-1');
          expect(res.body.isDefault).toBe(true);
        });
    });

    it("should prevent Customer B from modifying Customer A's address (404)", async () => {
      const tokenCustomerB = await generateToken('sub-customer-b');

      // Address addr-a-1 belongs to Customer A; query for Customer B returns null
      jest.spyOn(prismaService.customerAddress, 'findFirst').mockResolvedValueOnce(null);

      return request(app.getHttpServer())
        .patch('/api/v1/customers/me/addresses/addr-a-1')
        .set('Authorization', `Bearer ${tokenCustomerB}`)
        .send({ city: 'Hacked City' })
        .expect(404);
    });

    it("should prevent Customer B from deleting Customer A's address (404)", async () => {
      const tokenCustomerB = await generateToken('sub-customer-b');

      jest.spyOn(prismaService.customerAddress, 'findFirst').mockResolvedValueOnce(null);

      return request(app.getHttpServer())
        .delete('/api/v1/customers/me/addresses/addr-a-1')
        .set('Authorization', `Bearer ${tokenCustomerB}`)
        .expect(404);
    });

    it("should prevent Customer B from setting default on Customer A's address (404)", async () => {
      const tokenCustomerB = await generateToken('sub-customer-b');

      jest.spyOn(prismaService.customerAddress, 'findFirst').mockResolvedValueOnce(null);

      return request(app.getHttpServer())
        .patch('/api/v1/customers/me/addresses/addr-a-1/default')
        .set('Authorization', `Bearer ${tokenCustomerB}`)
        .expect(404);
    });
  });

  // ===========================================================================
  // 4. Wishlist & Availability Rules
  // ===========================================================================
  describe('Wishlist Management & Isolation', () => {
    const validProductId = 'a0000000-0000-4000-8000-000000000001';

    it('should add a valid product to customer wishlist (201)', async () => {
      const token = await generateToken('sub-customer-a');

      jest.spyOn(prismaService.product, 'findUnique').mockResolvedValueOnce({
        id: validProductId,
        name: 'Clay Lamp',
        status: ProductStatus.PUBLISHED,
        tenant: { id: 't-1', status: TenantStatus.ACTIVE },
      } as any);
      jest.spyOn(prismaService.wishlistItem, 'findUnique').mockResolvedValueOnce(null);
      jest.spyOn(prismaService.wishlistItem, 'create').mockResolvedValueOnce({
        id: 'w-item-1',
        userId: 'customer-a-uuid',
        productId: validProductId,
        createdAt: new Date(),
        product: {
          id: validProductId,
          name: 'Clay Lamp',
          price: 120,
          currency: 'INR',
          status: ProductStatus.PUBLISHED,
          images: [],
        },
      } as any);

      return request(app.getHttpServer())
        .post('/api/v1/customers/me/wishlist')
        .set('Authorization', `Bearer ${token}`)
        .send({ productId: validProductId })
        .expect(201)
        .expect((res) => {
          expect(res.body.id).toBe('w-item-1');
          expect(res.body.product.name).toBe('Clay Lamp');
        });
    });

    it('should reject duplicate wishlist addition with 409 Conflict', async () => {
      const token = await generateToken('sub-customer-a');

      jest.spyOn(prismaService.product, 'findUnique').mockResolvedValueOnce({
        id: validProductId,
        status: ProductStatus.PUBLISHED,
        tenant: { status: TenantStatus.ACTIVE },
      } as any);
      jest.spyOn(prismaService.wishlistItem, 'findUnique').mockResolvedValueOnce({
        id: 'existing-w-item',
        userId: 'customer-a-uuid',
        productId: validProductId,
      } as any);

      return request(app.getHttpServer())
        .post('/api/v1/customers/me/wishlist')
        .set('Authorization', `Bearer ${token}`)
        .send({ productId: validProductId })
        .expect(409)
        .expect((res) => {
          expect(res.body.error.message).toContain('Product is already in your wishlist');
        });
    });

    it('should reject adding archived product to wishlist with 400', async () => {
      const token = await generateToken('sub-customer-a');
      const archivedProductId = 'a0000000-0000-4000-8000-000000000002';

      jest.spyOn(prismaService.product, 'findUnique').mockResolvedValueOnce({
        id: archivedProductId,
        status: ProductStatus.ARCHIVED,
        tenant: { status: TenantStatus.ACTIVE },
      } as any);

      return request(app.getHttpServer())
        .post('/api/v1/customers/me/wishlist')
        .set('Authorization', `Bearer ${token}`)
        .send({ productId: archivedProductId })
        .expect(400);
    });

    it("should prevent Customer B from removing Customer A's wishlist item (404)", async () => {
      const tokenCustomerB = await generateToken('sub-customer-b');

      // Item belongs to Customer A; Customer B cannot find it
      jest.spyOn(prismaService.wishlistItem, 'findFirst').mockResolvedValue(null);

      return request(app.getHttpServer())
        .delete('/api/v1/customers/me/wishlist/w-item-1')
        .set('Authorization', `Bearer ${tokenCustomerB}`)
        .expect(404);
    });

    it('should allow Customer A to remove their own wishlist item (200)', async () => {
      const tokenCustomerA = await generateToken('sub-customer-a');

      jest.spyOn(prismaService.wishlistItem, 'findFirst').mockResolvedValueOnce({
        id: 'w-item-1',
        userId: 'customer-a-uuid',
      } as any);
      jest.spyOn(prismaService.wishlistItem, 'delete').mockResolvedValueOnce({} as any);

      return request(app.getHttpServer())
        .delete('/api/v1/customers/me/wishlist/w-item-1')
        .set('Authorization', `Bearer ${tokenCustomerA}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
        });
    });

    it('should accurately set isPurchasable: false for unpublished product in wishlist listing', async () => {
      const token = await generateToken('sub-customer-a');

      jest.spyOn(prismaService.wishlistItem, 'count').mockResolvedValueOnce(1);
      jest.spyOn(prismaService.wishlistItem, 'findMany').mockResolvedValueOnce([
        {
          id: 'w-draft-item',
          productId: 'p-draft',
          createdAt: new Date(),
          product: {
            id: 'p-draft',
            name: 'Draft Diya',
            slug: 'draft-diya',
            price: 200,
            currency: 'INR',
            status: ProductStatus.DRAFT, // Unpublished product
            images: [],
            category: null,
            tenant: {
              id: 't-1',
              businessName: 'Vedic Pottery',
              storeSlug: 'vedic-pottery',
              isPublished: true,
              status: TenantStatus.ACTIVE,
            },
          },
        },
      ] as any);

      return request(app.getHttpServer())
        .get('/api/v1/customers/me/wishlist')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.items).toHaveLength(1);
          expect(res.body.items[0].isPurchasable).toBe(false);
        });
    });
  });
});
