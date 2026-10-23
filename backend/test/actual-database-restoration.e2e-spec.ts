import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { AppModule } from '../src/app.module';
import { BackupService } from '../src/modules/backup/backup.service';
import {
  BACKUP_STORAGE_PROVIDER,
  IBackupStorageProvider,
} from '../src/modules/backup/backup-storage.interface';
import { PrismaService } from '../src/common/prisma/prisma.service';
import {
  PlatformRole,
  TenantRole,
  TenantStatus,
  UserStatus,
  MembershipStatus,
  OrderStatus,
  PaymentStatus,
  PaymentRecordStatus,
  ProductStatus,
} from '@prisma/client';

describe('Actual PostgreSQL Database Restoration & Integrity Verification (Task A)', () => {
  let app: INestApplication;
  let backupService: BackupService;
  let sourcePrisma: PrismaService;
  let targetPrisma: PrismaClient;
  let storageProvider: IBackupStorageProvider;

  const targetDbUrl = 'postgresql://postgres@127.0.0.1:5433/gaushilp_restore_target?schema=public';

  const testUserId = '11111111-2222-4333-8444-555555555551';
  const sellerUserId = '11111111-2222-4333-8444-555555555552';
  const tenantId = '22222222-3333-4444-8555-666666666661';
  const categoryId = '33333333-4444-4555-8666-777777777771';
  const productId = '44444444-5555-4666-8777-888888888881';
  const orderId = '55555555-6666-4777-8888-999999999991';
  const orderItemId = '66666666-7777-4888-8999-000000000001';
  const paymentId = '77777777-8888-4999-8000-111111111111';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    backupService = moduleFixture.get<BackupService>(BackupService);
    sourcePrisma = moduleFixture.get<PrismaService>(PrismaService);
    storageProvider = moduleFixture.get<IBackupStorageProvider>(BACKUP_STORAGE_PROVIDER);

    await app.init();

    // Initialize isolated target Prisma client connected to gaushilp_restore_target
    targetPrisma = new PrismaClient({
      datasources: {
        db: {
          url: targetDbUrl,
        },
      },
    });
    await targetPrisma.$connect();

    // Clean up source database records
    await sourcePrisma.paymentRecord.deleteMany({ where: { orderId } }).catch(() => {});
    await sourcePrisma.orderItem.deleteMany({ where: { orderId } }).catch(() => {});
    await sourcePrisma.order.deleteMany({ where: { id: orderId } }).catch(() => {});
    await sourcePrisma.product.deleteMany({ where: { id: productId } }).catch(() => {});
    await sourcePrisma.category.deleteMany({ where: { id: categoryId } }).catch(() => {});
    await sourcePrisma.tenantMembership.deleteMany({ where: { tenantId } }).catch(() => {});
    await sourcePrisma.tenant.deleteMany({ where: { id: tenantId } }).catch(() => {});
    await sourcePrisma.user
      .deleteMany({ where: { id: { in: [testUserId, sellerUserId] } } })
      .catch(() => {});

    // Clean up target database records completely to prevent residual conflicts
    await targetPrisma.paymentRecord.deleteMany().catch(() => {});
    await targetPrisma.orderItem.deleteMany().catch(() => {});
    await targetPrisma.order.deleteMany().catch(() => {});
    await targetPrisma.product.deleteMany().catch(() => {});
    await targetPrisma.category.deleteMany().catch(() => {});
    await targetPrisma.tenantMembership.deleteMany().catch(() => {});
    await targetPrisma.tenant.deleteMany().catch(() => {});
    await targetPrisma.userIdentity.deleteMany().catch(() => {});
    await targetPrisma.user.deleteMany().catch(() => {});
  });

  afterAll(async () => {
    if (targetPrisma) {
      await targetPrisma.$disconnect();
    }
    if (app) {
      await app.close();
    }
  });

  it('1. Seed representative relational data into primary PostgreSQL database', async () => {
    // 1. Create Customer User
    const customer = await sourcePrisma.user.create({
      data: {
        id: testUserId,
        email: 'customer.restoredrill@gaushilp.com',
        name: 'Arjun Customer',
        phone: '+919876543201',
        platformRole: PlatformRole.USER,
        status: UserStatus.ACTIVE,
      },
    });
    expect(customer.id).toBe(testUserId);

    // 2. Create Seller User
    const seller = await sourcePrisma.user.create({
      data: {
        id: sellerUserId,
        email: 'seller.restoredrill@gaushilp.com',
        name: 'Vedic Artisan Seller',
        phone: '+919876543202',
        platformRole: PlatformRole.USER,
        status: UserStatus.ACTIVE,
      },
    });
    expect(seller.id).toBe(sellerUserId);

    // 3. Create Tenant
    const tenant = await sourcePrisma.tenant.create({
      data: {
        id: tenantId,
        businessName: 'Vedic Organic Artisans Trust',
        storeSlug: 'vedic-organic-artisans',
        status: TenantStatus.ACTIVE,
        currency: 'INR',
      },
    });
    expect(tenant.id).toBe(tenantId);

    // 4. Create Tenant Membership
    await sourcePrisma.tenantMembership.create({
      data: {
        tenantId,
        userId: sellerUserId,
        role: TenantRole.STORE_OWNER,
        status: MembershipStatus.ACTIVE,
      },
    });

    // 5. Create Category
    await sourcePrisma.category.create({
      data: {
        id: categoryId,
        tenantId,
        name: 'Handcrafted Dhoop & Incense',
        slug: 'handcrafted-dhoop',
      },
    });

    // 6. Create Product
    const product = await sourcePrisma.product.create({
      data: {
        id: productId,
        tenantId,
        categoryId,
        name: 'Panchagavya Herbal Dhoop Cones',
        slug: 'panchagavya-herbal-dhoop-cones',
        price: 299.0,
        currency: 'INR',
        sku: 'DHOOP-PG-250',
        stock: 100,
        status: ProductStatus.PUBLISHED,
      },
    });
    expect(product.id).toBe(productId);

    // 7. Create Order & Items
    const order = await sourcePrisma.order.create({
      data: {
        id: orderId,
        orderNumber: 'GS-RESTORE-2026-001',
        tenantId,
        userId: testUserId,
        status: OrderStatus.CONFIRMED,
        paymentStatus: PaymentStatus.PAID,
        currency: 'INR',
        subtotal: 299.0,
        taxAmount: 0.0,
        shippingAmount: 0.0,
        totalAmount: 299.0,
        shippingAddress: { city: 'Mathura', state: 'UP', postalCode: '281001' },
      },
    });
    expect(order.id).toBe(orderId);

    await sourcePrisma.orderItem.create({
      data: {
        id: orderItemId,
        orderId,
        productId,
        productName: 'Panchagavya Herbal Dhoop Cones',
        sku: 'DHOOP-PG-250',
        quantity: 1,
        unitPrice: 299.0,
        subtotal: 299.0,
      },
    });

    // 8. Create Payment Record
    await sourcePrisma.paymentRecord.create({
      data: {
        id: paymentId,
        orderId,
        tenantId,
        userId: testUserId,
        provider: 'sandbox',
        providerPaymentId: 'pay_sandbox_restore_123',
        amount: 299.0,
        currency: 'INR',
        status: PaymentRecordStatus.SUCCEEDED,
      },
    });
  });

  let backupManifestId: string;
  let originalChecksum: string;
  let originalEncryptedPayload: Buffer;

  it('2. Create an encrypted database backup with unencrypted SHA-256 checksum and manifest', async () => {
    const manifest = await backupService.createDatabaseBackup();

    expect(manifest).toBeDefined();
    expect(manifest.backupId).toMatch(/^bkp_/);
    expect(manifest.status).toBe('VERIFIED');
    expect(manifest.sha256Checksum).toHaveLength(64);
    expect(manifest.encryptedSizeBytes).toBeGreaterThan(0);

    // Confirm that seeded records are recorded in manifest
    expect(manifest.recordCounts?.users).toBeGreaterThanOrEqual(2);
    expect(manifest.recordCounts?.tenants).toBeGreaterThanOrEqual(1);
    expect(manifest.recordCounts?.products).toBeGreaterThanOrEqual(1);
    expect(manifest.recordCounts?.orders).toBeGreaterThanOrEqual(1);

    backupManifestId = manifest.backupId;
    originalChecksum = manifest.sha256Checksum;

    // Cache original encrypted payload to verify it remains untouched
    originalEncryptedPayload = await storageProvider.downloadBackup(manifest.storageLocation);
    expect(originalEncryptedPayload.length).toBe(manifest.encryptedSizeBytes);
  });

  it('3. Perform actual PostgreSQL restoration into isolated target database (gaushilp_restore_target)', async () => {
    const startTime = Date.now();

    // Call restoreDatabase passing the live targetPrisma client connected to gaushilp_restore_target
    const restoreResult = await backupService.restoreDatabase(backupManifestId, targetPrisma);

    expect(restoreResult).toBeDefined();
    expect(restoreResult.status).toBe('SUCCESS');
    expect(restoreResult.checksumVerified).toBe(true);
    expect(restoreResult.durationMs).toBeGreaterThan(0);
    expect(restoreResult.durationMs).toBeLessThanOrEqual(Date.now() - startTime + 50);

    console.log(`Measured Actual PostgreSQL Restoration Duration: ${restoreResult.durationMs}ms`);
    console.log('Restored Tables & Row Counts:', restoreResult.restoredRecords);
  });

  it('4. Verify actual row counts and query representative records in target PostgreSQL database', async () => {
    // 1. Verify User table in target database
    const restoredUser = await targetPrisma.user.findUnique({
      where: { id: testUserId },
    });
    expect(restoredUser).toBeDefined();
    expect(restoredUser?.email).toBe('customer.restoredrill@gaushilp.com');
    expect(restoredUser?.name).toBe('Arjun Customer');

    // 2. Verify Tenant table in target database
    const restoredTenant = await targetPrisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        memberships: true,
      },
    });
    expect(restoredTenant).toBeDefined();
    expect(restoredTenant?.businessName).toBe('Vedic Organic Artisans Trust');
    expect(restoredTenant?.memberships.length).toBeGreaterThanOrEqual(1);
    expect(restoredTenant?.memberships[0].userId).toBe(sellerUserId);

    // 3. Verify Product table & foreign-key link to Category & Tenant
    const restoredProduct = await targetPrisma.product.findUnique({
      where: { id: productId },
      include: {
        category: true,
        tenant: true,
      },
    });
    expect(restoredProduct).toBeDefined();
    expect(restoredProduct?.name).toBe('Panchagavya Herbal Dhoop Cones');
    expect(restoredProduct?.tenant.id).toBe(tenantId);
    expect(restoredProduct?.category?.id).toBe(categoryId);
    expect(Number(restoredProduct?.price)).toBe(299.0);
    expect(restoredProduct?.stock).toBe(100);

    // 4. Verify Order, OrderItems and PaymentRecords with full relational integrity
    const restoredOrder = await targetPrisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        payments: true,
        user: true,
      },
    });
    expect(restoredOrder).toBeDefined();
    expect(restoredOrder?.orderNumber).toBe('GS-RESTORE-2026-001');
    expect(restoredOrder?.user.id).toBe(testUserId);
    expect(Number(restoredOrder?.totalAmount)).toBe(299.0);
    expect(restoredOrder?.items.length).toBe(1);
    expect(restoredOrder?.items[0].productId).toBe(productId);
    expect(restoredOrder?.payments.length).toBe(1);
    expect(restoredOrder?.payments[0].providerPaymentId).toBe('pay_sandbox_restore_123');
    expect(restoredOrder?.payments[0].status).toBe(PaymentRecordStatus.SUCCEEDED);
  });

  it('5. Confirm that original backup remains untouched with identical checksum and bytes', async () => {
    // 1. Re-download backup payload from storage
    const currentPayload = await storageProvider.downloadBackup(
      `backups/db/daily/${backupManifestId}.dump.enc`,
    );

    // 2. Exact byte-by-byte match
    expect(currentPayload.equals(originalEncryptedPayload)).toBe(true);

    // 3. Re-verify integrity through BackupService
    const isIntegrityValid = await backupService.verifyBackupIntegrity(backupManifestId);
    expect(isIntegrityValid).toBe(true);

    const manifest = await backupService.getManifest(backupManifestId);
    expect(manifest?.sha256Checksum).toBe(originalChecksum);
    expect(manifest?.status).toBe('VERIFIED');
  });
});
