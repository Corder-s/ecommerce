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

describe('Shopping Cart & Checkout Validation (e2e)', () => {
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
  // 1. Unauthenticated Access Control
  // ===========================================================================
  describe('Unauthenticated Access Control', () => {
    it('should reject unauthenticated cart retrieval with 401', () => {
      return request(app.getHttpServer()).get('/api/v1/cart').expect(401);
    });

    it('should reject unauthenticated add to cart with 401', () => {
      return request(app.getHttpServer())
        .post('/api/v1/cart/items')
        .send({ productId: 'a0000000-0000-4000-8000-000000000001' })
        .expect(401);
    });

    it('should reject unauthenticated checkout validation with 401', () => {
      return request(app.getHttpServer())
        .post('/api/v1/checkout/validate')
        .send({ addressId: 'a0000000-0000-4000-8000-000000000001' })
        .expect(401);
    });
  });

  // ===========================================================================
  // 2. Cart Operations & Calculations
  // ===========================================================================
  describe('Cart Operations & Validation', () => {
    const validProductId = 'a0000000-0000-4000-8000-000000000001';

    it('should add published product to cart and calculate subtotals using trusted DB price (201)', async () => {
      const token = await generateToken('sub-customer-a');

      jest.spyOn(prismaService.product, 'findUnique').mockResolvedValueOnce({
        id: validProductId,
        name: 'Handcrafted Clay Diya',
        price: 150,
        currency: 'INR',
        status: ProductStatus.PUBLISHED,
        tenant: {
          id: 'tenant-1',
          businessName: 'Vedic Pottery',
          storeSlug: 'vedic-pottery',
          isPublished: true,
          status: TenantStatus.ACTIVE,
        },
      } as any);

      jest
        .spyOn(prismaService.cart, 'findUnique')
        .mockResolvedValueOnce({
          id: 'cart-a-1',
          userId: 'customer-a-uuid',
          currency: 'INR',
          updatedAt: new Date(),
        } as any)
        .mockResolvedValueOnce({
          id: 'cart-a-1',
          userId: 'customer-a-uuid',
          currency: 'INR',
          updatedAt: new Date(),
        } as any);

      jest.spyOn(prismaService.cartItem, 'findUnique').mockResolvedValueOnce(null);
      jest.spyOn(prismaService.cartItem, 'create').mockResolvedValueOnce({} as any);

      jest.spyOn(prismaService.cartItem, 'findMany').mockResolvedValueOnce([
        {
          id: 'cart-item-1',
          cartId: 'cart-a-1',
          productId: validProductId,
          quantity: 2,
          priceSnapshot: 150,
          createdAt: new Date(),
          updatedAt: new Date(),
          product: {
            id: validProductId,
            name: 'Handcrafted Clay Diya',
            slug: 'handcrafted-clay-diya',
            sku: 'DIY-01',
            price: 150,
            currency: 'INR',
            status: ProductStatus.PUBLISHED,
            images: [],
            tenant: {
              id: 'tenant-1',
              businessName: 'Vedic Pottery',
              storeSlug: 'vedic-pottery',
              isPublished: true,
              status: TenantStatus.ACTIVE,
            },
          },
        },
      ] as any);

      return request(app.getHttpServer())
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${token}`)
        .send({
          productId: validProductId,
          quantity: 2,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.itemCount).toBe(2);
          expect(res.body.subtotal.amount).toBe(300);
          expect(res.body.subtotal.minorUnits).toBe(30000); // 30000 paise
          expect(res.body.items[0].unitPrice.amount).toBe(150);
        });
    });

    it('should reject adding unpublished product to cart (400)', async () => {
      const token = await generateToken('sub-customer-a');

      jest.spyOn(prismaService.product, 'findUnique').mockResolvedValueOnce({
        id: validProductId,
        name: 'Draft Diya',
        status: ProductStatus.DRAFT,
        tenant: { isPublished: true, status: TenantStatus.ACTIVE },
      } as any);

      return request(app.getHttpServer())
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${token}`)
        .send({ productId: validProductId })
        .expect(400)
        .expect((res) => {
          expect(res.body.error.message).toContain('Product is not available for purchase');
        });
    });

    it('should prevent Customer B from updating Customer A cart item (404 IDOR)', async () => {
      const tokenCustomerB = await generateToken('sub-customer-b');

      // Item belongs to Customer A
      jest.spyOn(prismaService.cartItem, 'findUnique').mockResolvedValueOnce({
        id: 'cart-item-1',
        cart: { userId: 'customer-a-uuid' },
        product: { status: ProductStatus.PUBLISHED },
      } as any);

      return request(app.getHttpServer())
        .patch('/api/v1/cart/items/cart-item-1')
        .set('Authorization', `Bearer ${tokenCustomerB}`)
        .send({ quantity: 5 })
        .expect(404);
    });

    it('should prevent Customer B from removing Customer A cart item (404 IDOR)', async () => {
      const tokenCustomerB = await generateToken('sub-customer-b');

      jest.spyOn(prismaService.cartItem, 'findUnique').mockResolvedValueOnce({
        id: 'cart-item-1',
        cart: { userId: 'customer-a-uuid' },
      } as any);

      return request(app.getHttpServer())
        .delete('/api/v1/cart/items/cart-item-1')
        .set('Authorization', `Bearer ${tokenCustomerB}`)
        .expect(404);
    });
  });

  // ===========================================================================
  // 3. Checkout Preparation & Validation
  // ===========================================================================
  describe('Checkout Preparation & Validation', () => {
    const validSavedAddressId = 'a0000000-0000-4000-8000-000000000002';

    it('should validate single store checkout with saved address (200)', async () => {
      const token = await generateToken('sub-customer-a');

      jest.spyOn(prismaService.cart, 'findUnique').mockResolvedValueOnce({
        id: 'cart-1',
        userId: 'customer-a-uuid',
        currency: 'INR',
        items: [
          {
            id: 'item-1',
            cartId: 'cart-1',
            productId: 'prod-1',
            quantity: 2,
            priceSnapshot: 200,
            product: {
              id: 'prod-1',
              tenantId: 'tenant-1',
              name: 'Organic Incense',
              slug: 'organic-incense',
              sku: 'INC-01',
              price: 200,
              currency: 'INR',
              status: ProductStatus.PUBLISHED,
              tenant: {
                id: 'tenant-1',
                businessName: 'Vedic Aromas',
                storeSlug: 'vedic-aromas',
                currency: 'INR',
                isPublished: true,
                status: TenantStatus.ACTIVE,
              },
            },
          },
        ],
      } as any);

      jest.spyOn(prismaService.customerAddress, 'findFirst').mockResolvedValueOnce({
        id: validSavedAddressId,
        userId: 'customer-a-uuid',
        fullName: 'Arjun Sharma',
        phone: '+919876543210',
        addressLine1: 'Vrindavan Enclave',
        city: 'Mathura',
        state: 'UP',
        postalCode: '281001',
        country: 'IN',
        addressType: 'HOME',
      } as any);

      return request(app.getHttpServer())
        .post('/api/v1/checkout/validate')
        .set('Authorization', `Bearer ${token}`)
        .send({ addressId: validSavedAddressId })
        .expect(200)
        .expect((res) => {
          expect(res.body.isValid).toBe(true);
          expect(res.body.isReadyForOrder).toBe(true);
          expect(res.body.tenantId).toBe('tenant-1');
          expect(res.body.pricing.subtotal.amount).toBe(400); // 200 * 2
          expect(res.body.pricing.subtotal.minorUnits).toBe(40000);
          expect(res.body.shippingAddress.fullName).toBe('Arjun Sharma');
        });
    });

    it('should validate checkout with inline delivery address (200)', async () => {
      const token = await generateToken('sub-customer-a');

      jest.spyOn(prismaService.cart, 'findUnique').mockResolvedValueOnce({
        id: 'cart-1',
        userId: 'customer-a-uuid',
        currency: 'INR',
        items: [
          {
            id: 'item-1',
            cartId: 'cart-1',
            productId: 'prod-1',
            quantity: 1,
            priceSnapshot: 150,
            product: {
              id: 'prod-1',
              tenantId: 'tenant-1',
              name: 'Dhoop Cones',
              slug: 'dhoop-cones',
              sku: 'DHP-01',
              price: 150,
              currency: 'INR',
              status: ProductStatus.PUBLISHED,
              tenant: {
                id: 'tenant-1',
                businessName: 'Vedic Aromas',
                storeSlug: 'vedic-aromas',
                currency: 'INR',
                isPublished: true,
                status: TenantStatus.ACTIVE,
              },
            },
          },
        ],
      } as any);

      return request(app.getHttpServer())
        .post('/api/v1/checkout/validate')
        .set('Authorization', `Bearer ${token}`)
        .send({
          shippingAddress: {
            fullName: 'Sunita Sharma',
            phone: '+919876543212',
            addressLine1: 'Street 9, Sector 2',
            city: 'Agra',
            state: 'Uttar Pradesh',
            postalCode: '282001',
          },
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.isValid).toBe(true);
          expect(res.body.shippingAddress.fullName).toBe('Sunita Sharma');
          expect(res.body.shippingAddress.city).toBe('Agra');
        });
    });

    it('should reject checkout if cart is empty (400)', async () => {
      const token = await generateToken('sub-customer-a');

      jest.spyOn(prismaService.cart, 'findUnique').mockResolvedValueOnce({
        id: 'cart-1',
        userId: 'customer-a-uuid',
        items: [],
      } as any);

      return request(app.getHttpServer())
        .post('/api/v1/checkout/validate')
        .set('Authorization', `Bearer ${token}`)
        .send({ addressId: validSavedAddressId })
        .expect(400)
        .expect((res) => {
          expect(res.body.error.message).toContain('Your shopping cart is empty');
        });
    });

    it('should reject checkout if multi-seller cart has no tenantId specified (400)', async () => {
      const token = await generateToken('sub-customer-a');

      jest.spyOn(prismaService.cart, 'findUnique').mockResolvedValueOnce({
        id: 'cart-1',
        userId: 'customer-a-uuid',
        items: [
          {
            product: {
              tenantId: 'tenant-a',
              status: ProductStatus.PUBLISHED,
              tenant: { id: 'tenant-a', isPublished: true, status: TenantStatus.ACTIVE },
            },
          },
          {
            product: {
              tenantId: 'tenant-b',
              status: ProductStatus.PUBLISHED,
              tenant: { id: 'tenant-b', isPublished: true, status: TenantStatus.ACTIVE },
            },
          },
        ],
      } as any);

      return request(app.getHttpServer())
        .post('/api/v1/checkout/validate')
        .set('Authorization', `Bearer ${token}`)
        .send({ addressId: validSavedAddressId })
        .expect(400)
        .expect((res) => {
          expect(res.body.error.message).toContain(
            'Please specify a tenantId to checkout one seller at a time',
          );
        });
    });

    it('should prevent Customer A from using Customer B saved address in checkout (404)', async () => {
      const token = await generateToken('sub-customer-a');

      jest.spyOn(prismaService.cart, 'findUnique').mockResolvedValueOnce({
        id: 'cart-1',
        userId: 'customer-a-uuid',
        items: [
          {
            product: {
              tenantId: 'tenant-1',
              status: ProductStatus.PUBLISHED,
              price: 100,
              tenant: { id: 'tenant-1', isPublished: true, status: TenantStatus.ACTIVE },
            },
          },
        ],
      } as any);

      // Address belongs to Customer B, query for Customer A returns null
      jest.spyOn(prismaService.customerAddress, 'findFirst').mockResolvedValueOnce(null);

      return request(app.getHttpServer())
        .post('/api/v1/checkout/validate')
        .set('Authorization', `Bearer ${token}`)
        .send({ addressId: 'b0000000-0000-4000-8000-000000000002' })
        .expect(404);
    });

    it('should detect price changes during checkout and include warning with recalculation', async () => {
      const token = await generateToken('sub-customer-a');

      jest.spyOn(prismaService.cart, 'findUnique').mockResolvedValueOnce({
        id: 'cart-1',
        userId: 'customer-a-uuid',
        currency: 'INR',
        items: [
          {
            productId: 'prod-1',
            quantity: 1,
            priceSnapshot: 100, // Added at 100
            product: {
              id: 'prod-1',
              tenantId: 'tenant-1',
              name: 'Terracotta Lamp',
              slug: 'terracotta-lamp',
              sku: 'TL-01',
              price: 180, // Price increased to 180
              currency: 'INR',
              status: ProductStatus.PUBLISHED,
              tenant: {
                id: 'tenant-1',
                businessName: 'Vedic Crafts',
                storeSlug: 'vedic-crafts',
                currency: 'INR',
                isPublished: true,
                status: TenantStatus.ACTIVE,
              },
            },
          },
        ],
      } as any);

      jest.spyOn(prismaService.customerAddress, 'findFirst').mockResolvedValueOnce({
        id: validSavedAddressId,
        userId: 'customer-a-uuid',
        fullName: 'Arjun Sharma',
        phone: '+919876543210',
        addressLine1: 'Vrindavan Enclave',
        city: 'Mathura',
        state: 'UP',
        postalCode: '281001',
        country: 'IN',
      } as any);

      return request(app.getHttpServer())
        .post('/api/v1/checkout/validate')
        .set('Authorization', `Bearer ${token}`)
        .send({ addressId: validSavedAddressId })
        .expect(200)
        .expect((res) => {
          expect(res.body.warnings).toHaveLength(1);
          expect(res.body.warnings[0]).toContain(
            'Price for "Terracotta Lamp" updated from INR 100.00 to INR 180.00',
          );
          expect(res.body.pricing.subtotal.amount).toBe(180); // Recalculated with trusted DB price
        });
    });
  });
});
