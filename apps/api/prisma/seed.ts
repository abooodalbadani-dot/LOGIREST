import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // ─── Currencies ──────────────────────────────────────────────
  const sar = await prisma.currency.upsert({
    where: { code: 'SAR' },
    update: {},
    create: { code: 'SAR', name: 'Saudi Riyal', isBase: true },
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

  // ─── FX Rates ────────────────────────────────────────────────
  await prisma.fXRate.upsert({
    where: { id: 'fx-sar-usd-1' },
    update: {},
    create: {
      id: 'fx-sar-usd-1',
      fromCurrencyId: sar.id,
      toCurrencyId: usd.id,
      rate: 0.266667,
      effectiveFrom: new Date(),
    },
  });

  await prisma.fXRate.upsert({
    where: { id: 'fx-usd-sar-1' },
    update: {},
    create: {
      id: 'fx-usd-sar-1',
      fromCurrencyId: usd.id,
      toCurrencyId: sar.id,
      rate: 3.75,
      effectiveFrom: new Date(),
    },
  });

  // ─── Units of Measure ────────────────────────────────────────
  const uomData = [
    { name: 'Kilogram', code: 'KG' },
    { name: 'Gram', code: 'G' },
    { name: 'Liter', code: 'LTR' },
    { name: 'Milliliter', code: 'ML' },
    { name: 'Piece', code: 'PCS' },
    { name: 'Pack', code: 'PK' },
    { name: 'Box', code: 'BOX' },
    { name: 'Carton', code: 'CTN' },
    { name: 'Dozen', code: 'DZ' },
    { name: 'Pound', code: 'LB' },
  ];

  for (const uom of uomData) {
    await prisma.unitOfMeasure.upsert({
      where: { code: uom.code },
      update: {},
      create: uom,
    });
  }

  // ─── Branches ────────────────────────────────────────────────
  const mainBranch = await prisma.branch.upsert({
    where: { code: 'HQ' },
    update: {},
    create: { name: 'Main Branch - HQ', code: 'HQ' },
  });

  const northBranch = await prisma.branch.upsert({
    where: { code: 'NORTH' },
    update: {},
    create: { name: 'North Branch', code: 'NORTH' },
  });

  // ─── Warehouses ──────────────────────────────────────────────
  const mainWh = await prisma.warehouse.upsert({
    where: { code: 'WH-HQ-01' },
    update: {},
    create: {
      name: 'HQ Main Warehouse',
      code: 'WH-HQ-01',
      branchId: mainBranch.id,
    },
  });

  const northWh = await prisma.warehouse.upsert({
    where: { code: 'WH-NR-01' },
    update: {},
    create: {
      name: 'North Branch Warehouse',
      code: 'WH-NR-01',
      branchId: northBranch.id,
    },
  });

  // ─── Departments ─────────────────────────────────────────────
  const departments = [
    { name: 'Hot Kitchen', branchId: mainBranch.id },
    { name: 'Cold Kitchen', branchId: mainBranch.id },
    { name: 'Bakery', branchId: mainBranch.id },
    { name: 'Pastry', branchId: mainBranch.id },
    { name: 'Stewarding', branchId: mainBranch.id },
  ];

  for (const dept of departments) {
    await prisma.department.create({ data: dept });
  }

  // ─── Categories ──────────────────────────────────────────────
  const categories = [
    'Meat & Poultry',
    'Seafood',
    'Dairy',
    'Dry Goods',
    'Fresh Produce',
    'Frozen',
    'Beverages',
    'Cleaning Supplies',
    'Disposable',
    'Spices & Seasoning',
  ];

  for (const catName of categories) {
    await prisma.category.upsert({
      where: { name: catName },
      update: {},
      create: { name: catName },
    });
  }

  // ─── Users ───────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash('password123', 12);
  const adminPasswordHash = await bcrypt.hash('adminpassword', 12);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@logirest.com' },
    update: {},
    create: {
      email: 'admin@logirest.com',
      passwordHash: adminPasswordHash,
      name: 'System Admin',
      role: Role.ADMIN,
      isActive: true,
    },
  });

  const whKeeper = await prisma.user.upsert({
    where: { email: 'user1@logirest.com' },
    update: {},
    create: {
      email: 'user1@logirest.com',
      passwordHash,
      name: 'Warehouse Keeper',
      role: Role.WH_KEEPER,
      isActive: true,
    },
  });

  // ─── User Warehouse Scope ────────────────────────────────────
  await prisma.userWarehouseScope.upsert({
    where: { id: 'scope-admin-hq' },
    update: {},
    create: {
      id: 'scope-admin-hq',
      userId: adminUser.id,
      warehouseId: mainWh.id,
    },
  });

  await prisma.userWarehouseScope.upsert({
    where: { id: 'scope-admin-north' },
    update: {},
    create: {
      id: 'scope-admin-north',
      userId: adminUser.id,
      warehouseId: northWh.id,
    },
  });

  await prisma.userWarehouseScope.upsert({
    where: { id: 'scope-whkeeper-hq' },
    update: {},
    create: {
      id: 'scope-whkeeper-hq',
      userId: whKeeper.id,
      warehouseId: mainWh.id,
    },
  });

  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
