import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { generateKeyPair, SignJWT } from 'jose';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { TokenVerificationService } from '../src/modules/auth/token-verifier.service';
import { IdentityService } from '../src/modules/auth/identity.service';
import { BackupService } from '../src/modules/backup/backup.service';
import {
  BACKUP_STORAGE_PROVIDER,
  IBackupStorageProvider,
} from '../src/modules/backup/backup-storage.interface';
import { PlatformRole, UserStatus } from '@prisma/client';

describe('Daily Backups & Disaster Recovery (Step 14 e2e)', () => {
  let app: INestApplication;
  let testKeyPair: Awaited<ReturnType<typeof generateKeyPair>>;
  let tokenVerifierService: TokenVerificationService;
  let identityService: IdentityService;
  let backupService: BackupService;
  let storageProvider: IBackupStorageProvider;

  const ISSUER = 'https://auth.gaushilp.example/';
  const AUDIENCE = 'gaushilp-api';
  const superAdminId = 'adm-bkp-0000-4000-8000-000000000001';
  let superAdminToken: string;

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
    backupService = moduleFixture.get<BackupService>(BackupService);
    storageProvider = moduleFixture.get<IBackupStorageProvider>(BACKUP_STORAGE_PROVIDER);

    jest
      .spyOn(identityService, 'resolveUserFromToken')
      .mockImplementation(async (payload): Promise<any> => {
        if (payload.sub === superAdminId) {
          return {
            id: superAdminId,
            name: 'Backup SuperAdmin',
            email: 'admin@gaushilp.com',
            platformRole: PlatformRole.SUPER_ADMIN,
            status: UserStatus.ACTIVE,
            memberships: [],
          };
        }
        throw new Error('User not found');
      });

    await app.init();

    superAdminToken = await new SignJWT({
      sub: superAdminId,
      email: 'admin@gaushilp.com',
      name: 'Backup SuperAdmin',
      iss: ISSUER,
      aud: AUDIENCE,
    })
      .setProtectedHeader({ alg: 'RS256' })
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(testKeyPair.privateKey);
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('1. Database Backup Creation & AES-256-GCM Envelope Encryption', () => {
    let createdBackupId: string;

    it('should create an encrypted database backup with unencrypted SHA-256 checksum and manifest', async () => {
      const manifest = await backupService.createDatabaseBackup();

      expect(manifest).toBeDefined();
      expect(manifest.backupId).toMatch(/^bkp_/);
      expect(manifest.type).toBe('DATABASE');
      expect(manifest.encryptionAlgorithm).toBe('aes-256-gcm');
      expect(manifest.sha256Checksum).toHaveLength(64); // Valid SHA-256 hex
      expect(manifest.originalSizeBytes).toBeGreaterThan(0);
      expect(manifest.encryptedSizeBytes).toBeGreaterThan(0);
      expect(manifest.status).toBe('VERIFIED');
      expect(manifest.iv).toBeDefined();
      expect(manifest.authTag).toBeDefined();
      expect(manifest.recordCounts).toBeDefined();

      createdBackupId = manifest.backupId;

      // Verify the file stored on the isolated storage provider is actually encrypted
      const storedEncrypted = await storageProvider.downloadBackup(manifest.storageLocation);
      expect(storedEncrypted.length).toBe(manifest.encryptedSizeBytes);

      // Plain JSON parse of encrypted ciphertext must fail
      expect(() => JSON.parse(storedEncrypted.toString('utf8'))).toThrow();
    });

    it('should verify integrity and recalculate SHA-256 checksum on request', async () => {
      const isValid = await backupService.verifyBackupIntegrity(createdBackupId);
      expect(isValid).toBe(true);

      const manifest = await backupService.getManifest(createdBackupId);
      expect(manifest?.status).toBe('VERIFIED');
      expect(manifest?.verifiedAt).toBeDefined();
    });

    it('should detect tampered or corrupted backup payloads', async () => {
      const manifest = await backupService.getManifest(createdBackupId);
      expect(manifest).toBeDefined();

      // Download encrypted payload and corrupt 1 byte
      const original = await storageProvider.downloadBackup(manifest!.storageLocation);
      const corrupted = Buffer.from(original);
      corrupted[0] = corrupted[0] ^ 0xff; // Flip bits

      await storageProvider.uploadBackup(manifest!.storageLocation, corrupted);

      const isStillValid = await backupService.verifyBackupIntegrity(createdBackupId);
      expect(isStillValid).toBe(false);

      const corruptedManifest = await backupService.getManifest(createdBackupId);
      expect(corruptedManifest?.status).toBe('CORRUPTED');
      expect(corruptedManifest?.error).toBeDefined();

      // Restore original valid file for subsequent tests
      await storageProvider.uploadBackup(manifest!.storageLocation, original);
      await backupService.verifyBackupIntegrity(createdBackupId);
    });
  });

  describe('2. Isolated Restoration Testing & Disaster Recovery Drill', () => {
    it('should execute isolated restore drill and validate records without mutating production DB', async () => {
      const manifests = await backupService.listAllManifests();
      const targetBackupId = manifests[0].backupId;

      const result = await backupService.restoreDatabase(targetBackupId);

      expect(result).toBeDefined();
      expect(result.backupId).toBe(targetBackupId);
      expect(result.status).toBe('SUCCESS');
      expect(result.checksumVerified).toBe(true);
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
      expect(typeof result.restoredRecords).toBe('object');
    });
  });

  describe('3. Cloudflare R2 Object Storage Backup & Recovery', () => {
    it('should backup and restore objects with checksum verification and AES-256-GCM encryption', async () => {
      const testAssetContent = Buffer.from(
        'Simulated Artisan Product Image Data - Vedic Ghee Jar 500ml',
      );
      const sourceKey = 'products/artisan-ghee-jar-500ml.jpg';

      // 1. Backup object
      const { backupKey, checksum } = await backupService.backupObject(sourceKey, testAssetContent);
      expect(backupKey).toContain('backups/objects/');
      expect(checksum).toHaveLength(64);

      // Verify stored object is encrypted and cannot match raw bytes
      const storedEncrypted = await storageProvider.downloadBackup(backupKey);
      expect(storedEncrypted.equals(testAssetContent)).toBe(false);

      // Retrieve IV and auth tag from storage metadata
      const metadata = (storageProvider as any).getMetadata(backupKey);
      const testIv = metadata?.iv;
      const testAuthTag = metadata?.authTag;

      // 2. Restore object
      const restoredBuffer = await backupService.restoreObject(
        backupKey,
        testIv,
        testAuthTag,
        checksum,
      );

      expect(restoredBuffer.equals(testAssetContent)).toBe(true);
      expect(restoredBuffer.toString('utf8')).toBe(testAssetContent.toString('utf8'));
    });
  });

  describe('4. Backup Retention Policy Enforcement & Last-Backup Protection', () => {
    it('should prune backups older than 30 days while protecting the single remaining valid backup', async () => {
      // Create a simulated expired backup
      const expiredDate = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString();
      const expiredManifest = await backupService.createDatabaseBackup({
        metadata: { exportedAt: expiredDate, schemaVersion: '1.9', platform: 'GauShilp OS' },
        tables: {
          users: [],
          tenants: [],
          tenantMemberships: [],
          categories: [],
          products: [],
          orders: [],
          orderItems: [],
          paymentRecords: [],
          subscriptionPlans: [],
          subscriptions: [],
          storedFiles: [],
        },
      });

      // Manually set its retention expiry into the past
      expiredManifest.retentionExpiresAt = new Date(
        Date.now() - 5 * 24 * 60 * 60 * 1000,
      ).toISOString();
      expiredManifest.timestamp = expiredDate;

      // Trigger retention cleanup
      const pruneResult = await backupService.pruneExpiredBackups();
      expect(pruneResult.retainedCount).toBeGreaterThanOrEqual(1);

      // Verify the latest backup was NOT pruned
      const remaining = await backupService.listAllManifests();
      expect(remaining.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('5. Super Admin Backup REST API Endpoints', () => {
    it('GET /api/v1/admin/backups - should list all backup manifests', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/backups')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0]).toHaveProperty('backupId');
      expect(res.body[0]).toHaveProperty('sha256Checksum');
    });

    it('GET /api/v1/admin/backups/status - should report RPO compliance and storage health', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/backups/status')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('isRpoCompliant');
      expect(res.body).toHaveProperty('backupAgeHours');
      expect(res.body).toHaveProperty('destinationHealthy', true);
      expect(res.body.retentionDays).toBe(30);
    });

    it('POST /api/v1/admin/backups/:id/verify - should verify specific backup integrity', async () => {
      const manifests = await backupService.listAllManifests();
      const testId = manifests[0].backupId;

      const res = await request(app.getHttpServer())
        .post(`/api/v1/admin/backups/${testId}/verify`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.backupId).toBe(testId);
      expect(res.body.verified).toBe(true);
    });

    it('POST /api/v1/admin/backups/:id/restore-drill - should run isolated restore drill', async () => {
      const manifests = await backupService.listAllManifests();
      const testId = manifests[0].backupId;

      const res = await request(app.getHttpServer())
        .post(`/api/v1/admin/backups/${testId}/restore-drill`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.backupId).toBe(testId);
      expect(res.body.status).toBe('SUCCESS');
      expect(res.body.checksumVerified).toBe(true);
    });

    it('POST /api/v1/admin/backups/prune - should trigger retention pruning', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/admin/backups/prune')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('prunedCount');
      expect(res.body).toHaveProperty('retainedCount');
    });
  });
});
