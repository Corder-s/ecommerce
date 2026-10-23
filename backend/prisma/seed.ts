import { PrismaClient, PlatformRole, TenantRole, TenantStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting development database seeding (sample records only)...');

  // 1. Create Platform Super Admin (Separate from tenant memberships)
  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin.dev@gaushilp.example' },
    update: {},
    create: {
      name: 'Development Super Admin',
      email: 'superadmin.dev@gaushilp.example',
      platformRole: PlatformRole.SUPER_ADMIN,
    },
  });
  console.log(`  ✓ Platform Super Admin prepared: ${superAdmin.email}`);

  // 2. Create Sample Tenant 1: Traditional Handmade Diyas
  const tenantDiyas = await prisma.tenant.upsert({
    where: { storeSlug: 'artisan-diyas' },
    update: {},
    create: {
      businessName: 'Vedic Clay & Cow Dung Diyas',
      storeSlug: 'artisan-diyas',
      status: TenantStatus.ACTIVE,
    },
  });
  console.log(`  ✓ Tenant prepared: ${tenantDiyas.businessName} (${tenantDiyas.storeSlug})`);

  // 3. Create Sample Tenant 2: Natural Cow Dung Dhoop & Havan
  const tenantDhoop = await prisma.tenant.upsert({
    where: { storeSlug: 'natural-dhoop' },
    update: {},
    create: {
      businessName: 'GauShilp Natural Dhoop & Havan',
      storeSlug: 'natural-dhoop',
      status: TenantStatus.ACTIVE,
    },
  });
  console.log(`  ✓ Tenant prepared: ${tenantDhoop.businessName} (${tenantDhoop.storeSlug})`);

  // 4. Create Seller User 1 (Store Owner for Tenant 1, also Customer for Tenant 2)
  const sellerA = await prisma.user.upsert({
    where: { email: 'artisan.ramesh.dev@gaushilp.example' },
    update: {},
    create: {
      name: 'Ramesh Sharma',
      email: 'artisan.ramesh.dev@gaushilp.example',
      phone: '+919876543210',
      platformRole: PlatformRole.USER,
    },
  });

  // Assign STORE_OWNER in Tenant 1
  await prisma.tenantMembership.upsert({
    where: {
      userId_tenantId: {
        userId: sellerA.id,
        tenantId: tenantDiyas.id,
      },
    },
    update: {},
    create: {
      userId: sellerA.id,
      tenantId: tenantDiyas.id,
      role: TenantRole.STORE_OWNER,
    },
  });

  // Assign CUSTOMER in Tenant 2 (demonstrating multi-tenant multi-role membership for single user)
  await prisma.tenantMembership.upsert({
    where: {
      userId_tenantId: {
        userId: sellerA.id,
        tenantId: tenantDhoop.id,
      },
    },
    update: {},
    create: {
      userId: sellerA.id,
      tenantId: tenantDhoop.id,
      role: TenantRole.CUSTOMER,
    },
  });
  console.log(`  ✓ Multi-tenant user prepared: ${sellerA.email} (STORE_OWNER in Diyas, CUSTOMER in Dhoop)`);

  // 5. Create Store Manager for Tenant 1
  const managerA = await prisma.user.upsert({
    where: { email: 'manager.suresh.dev@gaushilp.example' },
    update: {},
    create: {
      name: 'Suresh Verma',
      email: 'manager.suresh.dev@gaushilp.example',
      platformRole: PlatformRole.USER,
    },
  });

  await prisma.tenantMembership.upsert({
    where: {
      userId_tenantId: {
        userId: managerA.id,
        tenantId: tenantDiyas.id,
      },
    },
    update: {},
    create: {
      userId: managerA.id,
      tenantId: tenantDiyas.id,
      role: TenantRole.STORE_MANAGER,
    },
  });
  console.log(`  ✓ Store Manager prepared: ${managerA.email}`);

  console.log('✅ Development seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
