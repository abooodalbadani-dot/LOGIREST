import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding production database reference data...');

  // ─── System Settings (M5) ────────────────────────────────────
  const baseCurrencyCode = process.env.SEED_BASE_CURRENCY || process.env.BASE_CURRENCY_CODE || 'SAR';
  const systemSettingsConfig = {
    system_name: 'LogiRest System',
    base_currency: baseCurrencyCode,
    branch_id: 'HQ',
    timezone: 'Asia/Riyadh',
    locale_default: 'en',
    sender_name: 'LogiRest Alerts',
    reply_to_email: 'alerts@logirest.app',
    mail_provider: 'smtp',
    smtp_host: process.env.SMTP_HOST || '',
    smtp_port: Number(process.env.SMTP_PORT) || 587,
    smtp_user: process.env.SMTP_USER || '',
    smtp_password: '',
    smtp_encryption: 'tls',
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

  // 1. Currencies
  const BASE_CURRENCY_CODE = process.env.SEED_BASE_CURRENCY || process.env.BASE_CURRENCY_CODE || 'SAR';
  const BASE_CURRENCY_NAME = process.env.SEED_BASE_CURRENCY_NAME || process.env.BASE_CURRENCY_NAME || 'Saudi Riyal';

  const baseCurrency = await prisma.currency.upsert({
    where: { code: BASE_CURRENCY_CODE },
    update: {},
    create: { code: BASE_CURRENCY_CODE, name: BASE_CURRENCY_NAME, isBase: true },
  });

  const usd = await prisma.currency.upsert({
    where: { code: 'USD' },
    update: {},
    create: { code: 'USD', name: 'US Dollar', isBase: false },
  });

  const eur = await prisma.currency.upsert({
    where: { code: 'EUR' },
    update: {},
    create: { code: 'EUR', name: 'Euro', isBase: false },
  });

  // 2. FX Rates (Entered via admin UI post-deployment, skipped in production seed)

  // 3. Units of Measure
  const uoms = [
    { name: 'Kilogram', code: 'KG' },
    { name: 'Liter', code: 'LTR' },
    { name: 'Piece', code: 'PCS' },
    { name: 'Gram', code: 'G' },
    { name: 'Milliliter', code: 'ML' },
    { name: 'Pack', code: 'PK' },
    { name: 'Box', code: 'BOX' },
    { name: 'Carton', code: 'CTN' },
    { name: 'Dozen', code: 'DZ' },
    { name: 'Pound', code: 'LB' },
  ];
  for (const uom of uoms) {
    await prisma.unitOfMeasure.upsert({
      where: { code: uom.code },
      update: {},
      create: uom,
    });
  }

  // 4. Categories
  const categories = [
    'Default Category',
    'Meat & Poultry',
    'Dry Goods',
    'Fresh Produce',
    'Seafood',
    'Dairy',
    'Frozen',
    'Beverages',
    'Cleaning Supplies',
    'Disposable',
    'Spices & Seasoning',
  ];
  for (const name of categories) {
    await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  // ─── Main Branch & Warehouse ──────────────────────────────────
  const mainBranch = await prisma.branch.upsert({
    where: { code: 'HQ' },
    update: {},
    create: { name: 'Main Branch - HQ', code: 'HQ' },
  });

  const mainWh = await prisma.warehouse.upsert({
    where: { code: 'WH-HQ-01' },
    update: {},
    create: {
      name: 'HQ Main Warehouse',
      code: 'WH-HQ-01',
      branchId: mainBranch.id,
    },
  });

  // ─── Departments ─────────────────────────────────────────────
  const existingDept = await prisma.department.findFirst({
    where: { name: 'Main Kitchen', branchId: mainBranch.id },
  });
  if (!existingDept) {
    await prisma.department.create({
      data: {
        name: 'Main Kitchen',
        branchId: mainBranch.id,
      },
    });
    console.log('Seeded default "Main Kitchen" department linked to HQ Branch.');
  }

  // 5. Secure First Admin User Setup
  const adminEmail = process.env.INITIAL_ADMIN_EMAIL || 'admin@logirest.com';
  const adminPassword = process.env.INITIAL_ADMIN_PASSWORD || 'AdminPassword123!';
  const adminName = process.env.INITIAL_ADMIN_NAME || 'System Administrator';

  console.log(`Seeding initial admin user: ${adminEmail}`);
  const passwordHash = await bcrypt.hash(adminPassword, 12);
  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      warehouseScopes: {
        deleteMany: {},
        create: {
          warehouseId: mainWh.id,
        },
      },
    },
    create: {
      email: adminEmail,
      passwordHash,
      name: adminName,
      role: Role.ADMIN,
      isActive: true,
      warehouseScopes: {
        create: {
          warehouseId: mainWh.id,
        },
      },
    },
  });
  console.log('Initial admin user successfully seeded!');

  // Link admin user to the main warehouse scope
  await prisma.userWarehouseScope.upsert({
    where: {
      userId_warehouseId: {
        userId: adminUser.id,
        warehouseId: mainWh.id,
      },
    },
    update: {},
    create: {
      userId: adminUser.id,
      warehouseId: mainWh.id,
    },
  });
  console.log('Admin user linked to Main Warehouse scope!');

  console.log('Production reference data seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Production seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
