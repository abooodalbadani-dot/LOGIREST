import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding production database reference data...');

  // ─── System Settings (M5) ────────────────────────────────────
  const systemSettingsConfig = {
    system_name: 'Otantik Restuarant System',
    base_currency: 'USD',
    branch_id: 'HQ',
    timezone: 'Asia/Riyadh',
    locale_default: 'en',
    sender_name: 'Otantik Restuarant Alerts',
    reply_to_email: 'alerts@otantikrestuarant.com',
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

  // ─── Currencies ──────────────────────────────────────────────
  const usd = await prisma.currency.upsert({
    where: { code: 'USD' },
    update: {
      name: 'US Dollar',
      isBase: true,
    },
    create: { code: 'USD', name: 'US Dollar', isBase: true },
  });

  await prisma.currency.upsert({
    where: { code: 'CNY' },
    update: {
      name: 'Chinese Yuan',
      isBase: false,
    },
    create: { code: 'CNY', name: 'Chinese Yuan', isBase: false },
  });

  // ─── Units of Measure ────────────────────────────────────────
  const uomsData = [
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

  const seededUoms: Record<string, { id: string }> = {};
  for (const uom of uomsData) {
    const record = await prisma.unitOfMeasure.upsert({
      where: { code: uom.code },
      update: {},
      create: uom,
    });
    seededUoms[uom.code] = { id: record.id };
  }

  // ─── Categories ──────────────────────────────────────────────
  const categoriesData = [
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

  const seededCategories: Record<string, { id: string }> = {};
  for (const name of categoriesData) {
    const record = await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    seededCategories[name] = { id: record.id };
  }

  // ─── Main Branch & Warehouse ──────────────────────────────────
  const mainBranch = await prisma.branch.upsert({
    where: { code: 'HQ' },
    update: {
      name: 'Main Branch - HQ',
      isActive: true,
    },
    create: { name: 'Main Branch - HQ', code: 'HQ', isActive: true },
  });

  const mainWh = await prisma.warehouse.upsert({
    where: { code: 'WH-HQ-01' },
    update: {
      name: 'HQ Main Warehouse',
      branchId: mainBranch.id,
      isActive: true,
    },
    create: {
      name: 'HQ Main Warehouse',
      code: 'WH-HQ-01',
      branchId: mainBranch.id,
      isActive: true,
    },
  });

  // ─── Departments ─────────────────────────────────────────────
  const departmentNames = ['Hot Kitchen', 'Cold Kitchen'];
  const depts: Record<string, string> = {};
  for (const name of departmentNames) {
    let existing = await prisma.department.findFirst({
      where: { name, branchId: mainBranch.id },
    });
    if (!existing) {
      existing = await prisma.department.create({
        data: { name, branchId: mainBranch.id, isActive: true },
      });
    }
    depts[name] = existing.id;
  }

  // ─── Admin User Setup (CRITICAL) ──────────────────────────────
  const adminEmail = 'admin@otantikrestuarant.local';
  const adminPassword = 'Password123!';
  const adminName = 'System Administrator';

  console.log(`Seeding initial admin user: ${adminEmail}`);
  const passwordHash = await bcrypt.hash(adminPassword, 10);
  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      passwordHash,
      name: adminName,
      role: Role.ADMIN,
      isActive: true,
      warehouseScopes: {
        deleteMany: {},
        create: {
          warehouseId: mainWh.id,
        },
      },
      branchScopes: {
        deleteMany: {},
        create: {
          branchId: mainBranch.id,
        },
      },
      departmentScopes: {
        deleteMany: {},
        create: [
          { departmentId: depts['Hot Kitchen'] },
          { departmentId: depts['Cold Kitchen'] },
        ],
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
      branchScopes: {
        create: {
          branchId: mainBranch.id,
        },
      },
      departmentScopes: {
        create: [
          { departmentId: depts['Hot Kitchen'] },
          { departmentId: depts['Cold Kitchen'] },
        ],
      },
    },
  });

  // Explicit upserts to guarantee mappings in scope tables
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

  await prisma.userBranchScope.upsert({
    where: {
      userId_branchId: {
        userId: adminUser.id,
        branchId: mainBranch.id,
      },
    },
    update: {},
    create: {
      userId: adminUser.id,
      branchId: mainBranch.id,
    },
  });

  await prisma.userDepartmentScope.upsert({
    where: {
      userId_departmentId: {
        userId: adminUser.id,
        departmentId: depts['Hot Kitchen'],
      },
    },
    update: {},
    create: {
      userId: adminUser.id,
      departmentId: depts['Hot Kitchen'],
    },
  });

  await prisma.userDepartmentScope.upsert({
    where: {
      userId_departmentId: {
        userId: adminUser.id,
        departmentId: depts['Cold Kitchen'],
      },
    },
    update: {},
    create: {
      userId: adminUser.id,
      departmentId: depts['Cold Kitchen'],
    },
  });

  console.log('Initial admin user and scopes successfully seeded!');

  // ─── Suppliers ───────────────────────────────────────────────
  await prisma.supplier.upsert({
    where: { code: 'SUP-001' },
    update: {
      name: 'General Supplier Co.',
      isActive: true,
    },
    create: {
      code: 'SUP-001',
      name: 'General Supplier Co.',
      isActive: true,
    },
  });

  // ─── Items ───────────────────────────────────────────────────
  await prisma.item.upsert({
    where: { sku: 'MILK-001' },
    update: {
      name: 'Fresh Whole Milk',
      categoryId: seededCategories['Dairy'].id,
      uomId: seededUoms['LTR'].id,
      isBatched: false,
      hasExpiry: false,
      isActive: true,
    },
    create: {
      sku: 'MILK-001',
      name: 'Fresh Whole Milk',
      categoryId: seededCategories['Dairy'].id,
      uomId: seededUoms['LTR'].id,
      isBatched: false,
      hasExpiry: false,
      isActive: true,
    },
  });

  await prisma.item.upsert({
    where: { sku: 'RICE-001' },
    update: {
      name: 'Basmati Rice',
      categoryId: seededCategories['Dry Goods'].id,
      uomId: seededUoms['KG'].id,
      isBatched: false,
      hasExpiry: false,
      isActive: true,
    },
    create: {
      sku: 'RICE-001',
      name: 'Basmati Rice',
      categoryId: seededCategories['Dry Goods'].id,
      uomId: seededUoms['KG'].id,
      isBatched: false,
      hasExpiry: false,
      isActive: true,
    },
  });

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
