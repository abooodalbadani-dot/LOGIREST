// ==========================================
// GENESIS SEED — Minimal Infrastructure Only
// Creates foundational records required to bypass
// scope interceptors and enable a clean login.
// ==========================================
import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log('🌱 Starting Genesis Seed...');

  // ─── 1. System Settings ─────────────────────────────────────────
  console.log('⚙️  [1/4] Creating system settings...');
  const systemSettingsConfig = {
    systemName: 'Otantik Restuarant System',
    baseCurrency: 'USD',
    timezone: process.env.SYSTEM_TIMEZONE || process.env.DEFAULT_TIMEZONE || 'UTC',
    localeDefault: 'ar',
    hasTransactions: false,
  };

  await prisma.systemSetting.upsert({
    where: { key: 'system_settings' },
    update: {
      value: JSON.stringify(systemSettingsConfig),
    },
    create: {
      key: 'system_settings',
      value: JSON.stringify(systemSettingsConfig),
      version: 1,
    },
  });
  console.log('   ✅ System settings created.');

  // ─── 2. Base Currency ────────────────────────────────────────────
  console.log('💵 [2/4] Creating base currency (USD)...');
  await prisma.currency.upsert({
    where: { code: 'USD' },
    update: {
      name: 'US Dollar',
      isBase: true,
    },
    create: {
      code: 'USD',
      name: 'US Dollar',
      isBase: true,
    },
  });
  console.log('   ✅ Base currency USD created.');

  // ─── 3. HQ Branch & Warehouse ────────────────────────────────────
  console.log('🏢 [3/4] Creating HQ Branch and Warehouse...');
  const hqBranch = await prisma.branch.upsert({
    where: { code: 'HQ' },
    update: {
      name: 'Main Branch - HQ',
      isActive: true,
    },
    create: {
      name: 'Main Branch - HQ',
      code: 'HQ',
      isActive: true,
      warehouses: {
        create: {
          code: 'WH-HQ-01',
          name: 'HQ Main Warehouse',
          isActive: true,
        },
      },
    },
  });

  // Ensure warehouse exists even when the branch was already seeded
  await prisma.warehouse.upsert({
    where: { code: 'WH-HQ-01' },
    update: {
      name: 'HQ Main Warehouse',
      isActive: true,
    },
    create: {
      code: 'WH-HQ-01',
      name: 'HQ Main Warehouse',
      branchId: hqBranch.id,
      isActive: true,
    },
  });
  console.log('   ✅ HQ Branch (id: ' + hqBranch.id + ') and Warehouse created.');

  // ─── 4. Admin User ───────────────────────────────────────────────
  console.log('👤 [4/4] Creating super admin user...');
  const adminEmail = 'admin@otantikrestaurant.com';
  const passwordHash = await bcrypt.hash('Password123!', 10);

  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      passwordHash,
      name: 'System Administrator',
      role: Role.ADMIN,
      isActive: true,
    },
    create: {
      email: adminEmail,
      passwordHash,
      name: 'System Administrator',
      role: Role.ADMIN,
      isActive: true,
      branchScopes: {
        create: {
          branchId: hqBranch.id,
        },
      },
    },
  });

  // Guarantee the branch scope exists even on update path
  await prisma.userBranchScope.upsert({
    where: {
      userId_branchId: {
        userId: adminUser.id,
        branchId: hqBranch.id,
      },
    },
    update: {},
    create: {
      userId: adminUser.id,
      branchId: hqBranch.id,
    },
  });
  console.log('   ✅ Admin user created (email: ' + adminEmail + ').');

  console.log('\n🎉 Genesis Seed complete. Database is ready for E2E testing.');
}

main()
  .catch((e: unknown) => {
    console.error('❌ Genesis Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
