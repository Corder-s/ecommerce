import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { generateKeyPair, SignJWT } from 'jose';
import { createSharp } from '../src/modules/files/validators/file-image.validator';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { TokenVerificationService } from '../src/modules/auth/token-verifier.service';
import { IdentityService } from '../src/modules/auth/identity.service';
import { PrismaService } from '../src/common/prisma/prisma.service';
import {
  OBJECT_STORAGE_PROVIDER_TOKEN,
  SandboxObjectStorageProvider,
} from '../src/integrations/object-storage';
import { PlatformRole, TenantRole, FileStatus, FilePurpose, FileVisibility } from '@prisma/client';

describe('Object Storage, Secure Uploads & CDN (Step 11 e2e)', () => {
  let app: INestApplication;
  let testKeyPair: Awaited<ReturnType<typeof generateKeyPair>>;
  let tokenVerifierService: TokenVerificationService;
  let identityService: IdentityService;
  let storageProvider: SandboxObjectStorageProvider;

  const ISSUER = 'https://auth.gaushilp.example/';
  const AUDIENCE = 'gaushilp-api';

  const userAId = 'u1111111-0000-4000-8000-000000000001';
  const userBId = 'u2222222-0000-4000-8000-000000000002';
  const tenantAId = 't1111111-0000-4000-8000-000000000001';
  const tenantBId = 't2222222-0000-4000-8000-000000000002';

  let userAToken: string;
  let userBToken: string;
  let validPngBuffer: Buffer;

  const mockUserA = {
    id: userAId,
    email: 'artisan.a@gaushilp.com',
    name: 'Artisan Alpha',
    platformRole: PlatformRole.USER,
    memberships: [
      {
        id: 'mem-a',
        tenantId: tenantAId,
        role: TenantRole.STORE_OWNER,
        status: 'ACTIVE' as const,
      },
    ],
  };

  const mockUserB = {
    id: userBId,
    email: 'artisan.b@gaushilp.com',
    name: 'Artisan Beta',
    platformRole: PlatformRole.USER,
    memberships: [
      {
        id: 'mem-b',
        tenantId: tenantBId,
        role: TenantRole.STORE_OWNER,
        status: 'ACTIVE' as const,
      },
    ],
  };

  const inMemoryStoredFiles: any[] = [];
  const inMemoryProducts: any[] = [];

  const mockPrisma = {
    storedFile: {
      create: jest.fn().mockImplementation(({ data }) => {
        const file = {
          id: `file-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          tenantId: data.tenant?.connect?.id || null,
          uploadedByUserId: data.uploadedBy.connect.id,
          purpose: data.purpose,
          objectKey: data.objectKey,
          originalFileName: data.originalFileName,
          contentType: data.contentType,
          fileSize: data.fileSize,
          checksum: data.checksum || null,
          width: data.width || null,
          height: data.height || null,
          publicUrl: data.publicUrl || null,
          status: data.status || FileStatus.PENDING,
          visibility: data.visibility || FileVisibility.PUBLIC,
          errorMessage: data.errorMessage || null,
          verifiedAt: data.verifiedAt || null,
          attachedAt: data.attachedAt || null,
          deletedAt: data.deletedAt || null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        inMemoryStoredFiles.push(file);
        return Promise.resolve(file);
      }),
      findUnique: jest.fn().mockImplementation(({ where }) => {
        if (where.id) {
          const file = inMemoryStoredFiles.find((f) => f.id === where.id);
          return Promise.resolve(file || null);
        }
        if (where.objectKey) {
          const file = inMemoryStoredFiles.find((f) => f.objectKey === where.objectKey);
          return Promise.resolve(file || null);
        }
        return Promise.resolve(null);
      }),
      update: jest.fn().mockImplementation(({ where, data }) => {
        const index = inMemoryStoredFiles.findIndex((f) => f.id === where.id);
        if (index === -1) return Promise.resolve(null);
        inMemoryStoredFiles[index] = {
          ...inMemoryStoredFiles[index],
          ...data,
          updatedAt: new Date(),
        };
        return Promise.resolve(inMemoryStoredFiles[index]);
      }),
      findMany: jest.fn().mockImplementation(({ where, skip = 0, take = 20 }) => {
        const results = inMemoryStoredFiles.filter((f) => {
          if (where?.tenantId && f.tenantId !== where.tenantId) return false;
          if (where?.purpose && f.purpose !== where.purpose) return false;
          if (where?.status) {
            if (typeof where.status === 'object' && where.status.not) {
              if (f.status === where.status.not) return false;
            } else if (f.status !== where.status) {
              return false;
            }
          }
          return true;
        });
        return Promise.resolve(results.slice(skip, skip + take));
      }),
      count: jest.fn().mockImplementation(({ where }) => {
        const results = inMemoryStoredFiles.filter((f) => {
          if (where?.tenantId && f.tenantId !== where.tenantId) return false;
          return true;
        });
        return Promise.resolve(results.length);
      }),
    },
    tenantMembership: {
      findUnique: jest.fn().mockImplementation(({ where }) => {
        const uId = where.userId_tenantId?.userId;
        const tId = where.userId_tenantId?.tenantId;
        if (uId === userAId && tId === tenantAId) {
          return Promise.resolve(mockUserA.memberships[0]);
        }
        if (uId === userBId && tId === tenantBId) {
          return Promise.resolve(mockUserB.memberships[0]);
        }
        return Promise.resolve(null);
      }),
    },
    tenant: {
      count: jest.fn().mockResolvedValue(0),
      findUnique: jest.fn().mockResolvedValue({ id: tenantAId, businessName: 'Store A' }),
    },
    product: {
      count: jest.fn().mockImplementation(({ where }) => {
        if (where?.images?.has) {
          const targetUrl = where.images.has;
          const matched = inMemoryProducts.filter((p) => p.images?.includes(targetUrl));
          return Promise.resolve(matched.length);
        }
        return Promise.resolve(0);
      }),
    },
  };

  beforeAll(async () => {
    testKeyPair = await generateKeyPair('RS256');

    validPngBuffer = await createSharp({
      create: {
        width: 120,
        height: 120,
        channels: 3,
        background: { r: 255, g: 140, b: 0 },
      },
    })
      .png()
      .toBuffer();

    userAToken = await new SignJWT({
      sub: 'auth0|artisan-alpha',
      email: mockUserA.email,
      name: mockUserA.name,
    })
      .setProtectedHeader({ alg: 'RS256', kid: 'test-key-id' })
      .setIssuer(ISSUER)
      .setAudience(AUDIENCE)
      .setExpirationTime('2h')
      .sign(testKeyPair.privateKey);

    userBToken = await new SignJWT({
      sub: 'auth0|artisan-beta',
      email: mockUserB.email,
      name: mockUserB.name,
    })
      .setProtectedHeader({ alg: 'RS256', kid: 'test-key-id' })
      .setIssuer(ISSUER)
      .setAudience(AUDIENCE)
      .setExpirationTime('2h')
      .sign(testKeyPair.privateKey);

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
    storageProvider = app.get(OBJECT_STORAGE_PROVIDER_TOKEN);

    // Mock token verification to return parsed payload
    jest.spyOn(tokenVerifierService, 'verifyToken').mockImplementation(async (token: string) => {
      if (token === userAToken) {
        return {
          sub: 'auth0|artisan-alpha',
          email: mockUserA.email,
          name: mockUserA.name,
          iss: ISSUER,
          aud: AUDIENCE,
          exp: Math.floor(Date.now() / 1000) + 7200,
          iat: Math.floor(Date.now() / 1000),
        };
      }
      if (token === userBToken) {
        return {
          sub: 'auth0|artisan-beta',
          email: mockUserB.email,
          name: mockUserB.name,
          iss: ISSUER,
          aud: AUDIENCE,
          exp: Math.floor(Date.now() / 1000) + 7200,
          iat: Math.floor(Date.now() / 1000),
        };
      }
      throw new Error('Invalid token');
    });

    // Mock user resolution
    jest.spyOn(identityService, 'resolveUserFromToken').mockImplementation(async (claims: any) => {
      if (claims.email === mockUserA.email) return mockUserA as any;
      if (claims.email === mockUserB.email) return mockUserB as any;
      return null;
    });

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('1. Presigned Upload Intents (POST /api/v1/files/upload-intents)', () => {
    it('should generate a server-controlled presigned upload URL and PENDING record for product image', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/files/upload-intents')
        .set('Authorization', `Bearer ${userAToken}`)
        .set('x-tenant-id', tenantAId)
        .send({
          purpose: FilePurpose.PRODUCT_IMAGE,
          fileName: 'terracotta_diya.png',
          contentType: 'image/png',
          fileSize: 1024 * 300, // 300KB
        })
        .expect(201);

      expect(response.body.fileId).toBeDefined();
      expect(response.body.uploadUrl).toContain('sandbox-r2.gaushilp.local/upload');
      expect(response.body.objectKey).toMatch(
        new RegExp(`^tenants/${tenantAId}/product_image/.+\\.png$`),
      );
      expect(response.body.visibility).toBe(FileVisibility.PUBLIC);
      expect(response.body.expiresAt).toBeDefined();
    });

    it('should reject upload intent if tenant context is missing for product image', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/files/upload-intents')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          purpose: FilePurpose.PRODUCT_IMAGE,
          fileName: 'diya.png',
          contentType: 'image/png',
          fileSize: 10000,
        })
        .expect(400);

      expect(JSON.stringify(response.body)).toContain('Tenant context is required');
    });

    it('should reject upload intent if user does not belong to the target store tenant', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/files/upload-intents')
        .set('Authorization', `Bearer ${userBToken}`) // User B attempting on Tenant A
        .set('x-tenant-id', tenantAId)
        .send({
          purpose: FilePurpose.PRODUCT_IMAGE,
          fileName: 'attack.png',
          contentType: 'image/png',
          fileSize: 10000,
        })
        .expect(403);

      expect(JSON.stringify(response.body)).toContain('Access denied');
    });

    it('should reject upload intent if file size exceeds purpose limit (e.g. logo > 2MB)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/files/upload-intents')
        .set('Authorization', `Bearer ${userAToken}`)
        .set('x-tenant-id', tenantAId)
        .send({
          purpose: FilePurpose.STORE_LOGO,
          fileName: 'large_logo.png',
          contentType: 'image/png',
          fileSize: 4 * 1024 * 1024, // 4MB
        })
        .expect(400);

      expect(JSON.stringify(response.body)).toContain('exceeds maximum allowed limit');
    });

    it('should reject invalid or executable file extensions (e.g. .exe, .sh, .html)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/files/upload-intents')
        .set('Authorization', `Bearer ${userAToken}`)
        .set('x-tenant-id', tenantAId)
        .send({
          purpose: FilePurpose.PRODUCT_IMAGE,
          fileName: 'trojan.exe',
          contentType: 'image/png',
          fileSize: 50000,
        })
        .expect(400);
    });
  });

  describe('2. Direct Upload Verification (POST /api/v1/files/:fileId/complete)', () => {
    it('should fail with 400 if client claims upload is complete but object is missing in storage', async () => {
      // 1. Create intent
      const intentRes = await request(app.getHttpServer())
        .post('/api/v1/files/upload-intents')
        .set('Authorization', `Bearer ${userAToken}`)
        .set('x-tenant-id', tenantAId)
        .send({
          purpose: FilePurpose.PRODUCT_IMAGE,
          fileName: 'missing_diya.png',
          contentType: 'image/png',
          fileSize: validPngBuffer.length,
        })
        .expect(201);

      // Do NOT simulate upload in storage
      const response = await request(app.getHttpServer())
        .post(`/api/v1/files/${intentRes.body.fileId}/complete`)
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(400);

      expect(JSON.stringify(response.body)).toContain('Uploaded object was not found in storage');
    });

    it('should reject corrupted / malicious file disguised as an image and clean up storage', async () => {
      // 1. Create intent
      const intentRes = await request(app.getHttpServer())
        .post('/api/v1/files/upload-intents')
        .set('Authorization', `Bearer ${userAToken}`)
        .set('x-tenant-id', tenantAId)
        .send({
          purpose: FilePurpose.PRODUCT_IMAGE,
          fileName: 'fake_image.png',
          contentType: 'image/png',
          fileSize: 200,
        })
        .expect(201);

      // 2. Simulate upload of malicious HTML/JS disguised as PNG
      const maliciousBuffer = Buffer.from('<script>alert("malicious payload")</script>');
      storageProvider.simulateUpload(intentRes.body.objectKey, maliciousBuffer, 'image/png');

      // 3. Complete upload -> Expect security rejection
      const response = await request(app.getHttpServer())
        .post(`/api/v1/files/${intentRes.body.fileId}/complete`)
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(400);

      expect(JSON.stringify(response.body)).toContain('Security rejection');

      // 4. Verify object was purged from storage
      const head = await storageProvider.headObject(intentRes.body.objectKey);
      expect(head.exists).toBe(false);
    });

    it('should successfully verify valid image, update status to VERIFIED, and build public CDN URL', async () => {
      // 1. Create intent
      const intentRes = await request(app.getHttpServer())
        .post('/api/v1/files/upload-intents')
        .set('Authorization', `Bearer ${userAToken}`)
        .set('x-tenant-id', tenantAId)
        .send({
          purpose: FilePurpose.PRODUCT_IMAGE,
          fileName: 'organic_ghee_pot.png',
          contentType: 'image/png',
          fileSize: validPngBuffer.length,
        })
        .expect(201);

      // 2. Simulate client upload to sandbox storage
      storageProvider.simulateUpload(intentRes.body.objectKey, validPngBuffer, 'image/png');

      // 3. Complete upload
      const response = await request(app.getHttpServer())
        .post(`/api/v1/files/${intentRes.body.fileId}/complete`)
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(200);

      expect(response.body.status).toBe(FileStatus.VERIFIED);
      expect(response.body.publicUrl).toBe(
        `https://media.gaushilp.example.com/${intentRes.body.objectKey}`,
      );
      expect(response.body.width).toBe(120);
      expect(response.body.height).toBe(120);
      expect(response.body.verifiedAt).toBeDefined();
    });

    it('should reject unauthorized cross-tenant user completing another tenant’s file', async () => {
      // User A creates intent
      const intentRes = await request(app.getHttpServer())
        .post('/api/v1/files/upload-intents')
        .set('Authorization', `Bearer ${userAToken}`)
        .set('x-tenant-id', tenantAId)
        .send({
          purpose: FilePurpose.PRODUCT_IMAGE,
          fileName: 'user_a_only.png',
          contentType: 'image/png',
          fileSize: validPngBuffer.length,
        })
        .expect(201);

      storageProvider.simulateUpload(intentRes.body.objectKey, validPngBuffer, 'image/png');

      // User B tries to complete User A's upload
      await request(app.getHttpServer())
        .post(`/api/v1/files/${intentRes.body.fileId}/complete`)
        .set('Authorization', `Bearer ${userBToken}`)
        .expect(403);
    });
  });

  describe('3. File Retrieval & Listing (GET /api/v1/files)', () => {
    it('should list files for store tenant with pagination and purpose filter', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/files')
        .set('Authorization', `Bearer ${userAToken}`)
        .set('x-tenant-id', tenantAId)
        .query({ page: 1, limit: 10, purpose: FilePurpose.PRODUCT_IMAGE })
        .expect(200);

      expect(response.body.files).toBeDefined();
      expect(Array.isArray(response.body.files)).toBe(true);
      expect(response.body.page).toBe(1);
    });

    it('should retrieve single file metadata by ID', async () => {
      // Find a verified file
      const verified = inMemoryStoredFiles.find((f) => f.status === FileStatus.VERIFIED);
      if (verified) {
        const response = await request(app.getHttpServer())
          .get(`/api/v1/files/${verified.id}`)
          .set('Authorization', `Bearer ${userAToken}`)
          .expect(200);

        expect(response.body.id).toBe(verified.id);
        expect(response.body.status).toBe(FileStatus.VERIFIED);
        expect(response.body.publicUrl).toBeDefined();
      }
    });
  });

  describe('4. File Deletion & Active Reference Protection (DELETE /api/v1/files/:fileId)', () => {
    it('should reject deletion with 409 Conflict if file is actively referenced by a product', async () => {
      // Create a verified file and simulate it being referenced in a product
      const intentRes = await request(app.getHttpServer())
        .post('/api/v1/files/upload-intents')
        .set('Authorization', `Bearer ${userAToken}`)
        .set('x-tenant-id', tenantAId)
        .send({
          purpose: FilePurpose.PRODUCT_IMAGE,
          fileName: 'referenced_diya.png',
          contentType: 'image/png',
          fileSize: validPngBuffer.length,
        })
        .expect(201);

      storageProvider.simulateUpload(intentRes.body.objectKey, validPngBuffer, 'image/png');

      const completed = await request(app.getHttpServer())
        .post(`/api/v1/files/${intentRes.body.fileId}/complete`)
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(200);

      // Add product reference
      inMemoryProducts.push({
        id: 'prod-1',
        name: 'Sacred Clay Diya',
        images: [completed.body.publicUrl],
      });

      // Attempt to delete actively referenced file
      const response = await request(app.getHttpServer())
        .delete(`/api/v1/files/${intentRes.body.fileId}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(409);

      expect(JSON.stringify(response.body)).toContain('actively referenced');
    });

    it('should successfully delete unreferenced file from storage and mark DELETED', async () => {
      const intentRes = await request(app.getHttpServer())
        .post('/api/v1/files/upload-intents')
        .set('Authorization', `Bearer ${userAToken}`)
        .set('x-tenant-id', tenantAId)
        .send({
          purpose: FilePurpose.PRODUCT_IMAGE,
          fileName: 'unreferenced_artifact.png',
          contentType: 'image/png',
          fileSize: validPngBuffer.length,
        })
        .expect(201);

      storageProvider.simulateUpload(intentRes.body.objectKey, validPngBuffer, 'image/png');

      await request(app.getHttpServer())
        .post(`/api/v1/files/${intentRes.body.fileId}/complete`)
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(200);

      const deleteRes = await request(app.getHttpServer())
        .delete(`/api/v1/files/${intentRes.body.fileId}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(200);

      expect(deleteRes.body.success).toBe(true);

      // Check storage object removed
      const head = await storageProvider.headObject(intentRes.body.objectKey);
      expect(head.exists).toBe(false);
    });
  });
});
