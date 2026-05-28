// ==========================================
// DEV ONLY — DO NOT RUN IN PRODUCTION
// Contains hardcoded default credentials and mock data.
// ==========================================
import { PrismaClient, Role, LotStatus, DocumentType } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === 'production') {
    console.log('Production environment detected. Redirecting to production seeder...');
    await import('./seed.prod.js');
    return;
  }

  console.log('Seeding database...');

  // ─── System Settings (M5) ────────────────────────────────────
  const baseCurrencyCode = process.env.BASE_CURRENCY_CODE || 'SAR';
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

  const uoms: Record<string, any> = {};
  for (const uom of uomData) {
    uoms[uom.code] = await prisma.unitOfMeasure.upsert({
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
  // Use createMany or individual upserts to prevent duplicate errors
  const departmentNames = ['Hot Kitchen', 'Cold Kitchen', 'Bakery', 'Pastry', 'Stewarding'];
  for (const name of departmentNames) {
    const existing = await prisma.department.findFirst({
      where: { name, branchId: mainBranch.id },
    });
    if (!existing) {
      await prisma.department.create({
        data: { name, branchId: mainBranch.id },
      });
    }
  }

  // ─── Categories ──────────────────────────────────────────────
  const categoryNames = [
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

  const categories: Record<string, any> = {};
  for (const name of categoryNames) {
    categories[name] = await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  // ─── Users ───────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash('Password123!', 12);
  const adminPasswordHash = await bcrypt.hash('Password123!', 12);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@logirest.local' },
    update: {},
    create: {
      email: 'admin@logirest.local',
      passwordHash,
      name: 'System Administrator',
      role: Role.ADMIN,
      isActive: true,
    },
  });

  const adminComUser = await prisma.user.upsert({
    where: { email: 'admin@logirest.com' },
    update: {},
    create: {
      email: 'admin@logirest.com',
      passwordHash: adminPasswordHash,
      name: 'System Admin Com',
      role: Role.ADMIN,
      isActive: true,
    },
  });

  const managerUser = await prisma.user.upsert({
    where: { email: 'manager@logirest.local' },
    update: {},
    create: {
      email: 'manager@logirest.local',
      passwordHash,
      name: 'Inventory Manager',
      role: Role.INV_MGR,
      isActive: true,
    },
  });

  // ─── User Warehouse Scope ────────────────────────────────────
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

  await prisma.userWarehouseScope.upsert({
    where: {
      userId_warehouseId: {
        userId: adminComUser.id,
        warehouseId: mainWh.id,
      },
    },
    update: {},
    create: {
      userId: adminComUser.id,
      warehouseId: mainWh.id,
    },
  });

  await prisma.userWarehouseScope.upsert({
    where: {
      userId_warehouseId: {
        userId: managerUser.id,
        warehouseId: mainWh.id,
      },
    },
    update: {},
    create: {
      userId: managerUser.id,
      warehouseId: mainWh.id,
    },
  });

  // ─── Suppliers ───────────────────────────────────────────────
  const supplierGlobal = await prisma.supplier.upsert({
    where: { code: 'SUP-001' },
    update: {
      contactEmail: 'supplier1@example.com',
      contactName: 'John Doe',
      contactPhone: '+1234567890',
      isActive: true,
    },
    create: {
      code: 'SUP-001',
      name: 'Global Food Supplies',
      contactEmail: 'supplier1@example.com',
      contactName: 'John Doe',
      contactPhone: '+1234567890',
      isActive: true,
    },
  });

  const supplierDairy = await prisma.supplier.upsert({
    where: { code: 'SUP-002' },
    update: {
      contactEmail: 'supplier2@example.com',
      contactName: 'Jane Smith',
      contactPhone: '+0987654321',
      isActive: true,
    },
    create: {
      code: 'SUP-002',
      name: 'Fresh Dairy Co',
      contactEmail: 'supplier2@example.com',
      contactName: 'Jane Smith',
      contactPhone: '+0987654321',
      isActive: true,
    },
  });

  // ─── Items ───────────────────────────────────────────────────
  // Item 1: Unbatched item
  const itemRice = await prisma.item.upsert({
    where: { sku: 'RICE-001' },
    update: {},
    create: {
      sku: 'RICE-001',
      name: 'Premium Basmati Rice',
      categoryId: categories['Dry Goods'].id,
      uomId: uoms['KG'].id,
      isBatched: false,
      hasExpiry: false,
      isActive: true,
    },
  });

  // Item 2: Batched item (no expiry)
  const itemOil = await prisma.item.upsert({
    where: { sku: 'OIL-002' },
    update: {},
    create: {
      sku: 'OIL-002',
      name: 'Vegetable Cooking Oil',
      categoryId: categories['Dry Goods'].id,
      uomId: uoms['LTR'].id,
      isBatched: true,
      hasExpiry: false,
      isActive: true,
    },
  });

  // Item 3: Batched item with expiry
  const itemMilk = await prisma.item.upsert({
    where: { sku: 'MILK-003' },
    update: {},
    create: {
      sku: 'MILK-003',
      name: 'Fresh Whole Milk',
      categoryId: categories['Dairy'].id,
      uomId: uoms['LTR'].id,
      isBatched: true,
      hasExpiry: true,
      isActive: true,
    },
  });

  // ─── Barcode Mappings ────────────────────────────────────────
  await prisma.barcodeMapping.upsert({
    where: { barcode: '8801234567890' },
    update: {},
    create: {
      itemId: itemRice.id,
      barcode: '8801234567890',
    },
  });

  await prisma.barcodeMapping.upsert({
    where: { barcode: '8801234567891' },
    update: {},
    create: {
      itemId: itemOil.id,
      barcode: '8801234567891',
    },
  });

  await prisma.barcodeMapping.upsert({
    where: { barcode: '8801234567892' },
    update: {},
    create: {
      itemId: itemMilk.id,
      barcode: '8801234567892',
    },
  });

  // ─── Lots ────────────────────────────────────────────────────
  const lotOil = await prisma.lot.upsert({
    where: { lotNumber: 'LOT-OIL-001' },
    update: {},
    create: {
      itemId: itemOil.id,
      lotNumber: 'LOT-OIL-001',
      status: LotStatus.ACTIVE,
      receivedDate: new Date(),
    },
  });

  const milkExpiry = new Date();
  milkExpiry.setDate(milkExpiry.getDate() + 30); // expires in 30 days

  const lotMilk = await prisma.lot.upsert({
    where: { lotNumber: 'LOT-MILK-001' },
    update: {},
    create: {
      itemId: itemMilk.id,
      lotNumber: 'LOT-MILK-001',
      status: LotStatus.ACTIVE,
      receivedDate: new Date(),
      expiryDate: milkExpiry,
    },
  });

  // ─── Initial Stock balances ──────────────────────────────────
  // Rice stock (1000 kg)
  await prisma.warehouseItem.upsert({
    where: {
      warehouseId_itemId: {
        warehouseId: mainWh.id,
        itemId: itemRice.id,
      },
    },
    update: {
      qtyOnHand: 1000,
      wac: 6.5,
    },
    create: {
      warehouseId: mainWh.id,
      itemId: itemRice.id,
      qtyOnHand: 1000,
      qtyAllocated: 0,
      wac: 6.5,
    },
  });

  await prisma.stockLedger.upsert({
    where: { idempotencyKey: 'init-stock-rice' },
    update: {},
    create: {
      idempotencyKey: 'init-stock-rice',
      warehouseId: mainWh.id,
      itemId: itemRice.id,
      lotId: null,
      quantity: 1000,
      documentId: 'INITIAL_BALANCE',
      documentType: DocumentType.ADJUSTMENT,
      postedAt: new Date(),
    },
  });

  // Oil stock (500 liters in lot LOT-OIL-001)
  await prisma.warehouseItem.upsert({
    where: {
      warehouseId_itemId: {
        warehouseId: mainWh.id,
        itemId: itemOil.id,
      },
    },
    update: {
      qtyOnHand: 500,
      wac: 12.0,
    },
    create: {
      warehouseId: mainWh.id,
      itemId: itemOil.id,
      qtyOnHand: 500,
      qtyAllocated: 0,
      wac: 12.0,
    },
  });

  await prisma.warehouseItemLot.upsert({
    where: {
      warehouseId_itemId_lotId: {
        warehouseId: mainWh.id,
        itemId: itemOil.id,
        lotId: lotOil.id,
      },
    },
    update: {
      qtyOnHand: 500,
    },
    create: {
      warehouseId: mainWh.id,
      itemId: itemOil.id,
      lotId: lotOil.id,
      qtyOnHand: 500,
      qtyAllocated: 0,
    },
  });

  await prisma.stockLedger.upsert({
    where: { idempotencyKey: 'init-stock-oil' },
    update: {},
    create: {
      idempotencyKey: 'init-stock-oil',
      warehouseId: mainWh.id,
      itemId: itemOil.id,
      lotId: lotOil.id,
      quantity: 500,
      documentId: 'INITIAL_BALANCE',
      documentType: DocumentType.ADJUSTMENT,
      postedAt: new Date(),
    },
  });

  // Milk stock (200 liters in lot LOT-MILK-001)
  await prisma.warehouseItem.upsert({
    where: {
      warehouseId_itemId: {
        warehouseId: mainWh.id,
        itemId: itemMilk.id,
      },
    },
    update: {
      qtyOnHand: 200,
      wac: 4.5,
    },
    create: {
      warehouseId: mainWh.id,
      itemId: itemMilk.id,
      qtyOnHand: 200,
      qtyAllocated: 0,
      wac: 4.5,
    },
  });

  await prisma.warehouseItemLot.upsert({
    where: {
      warehouseId_itemId_lotId: {
        warehouseId: mainWh.id,
        itemId: itemMilk.id,
        lotId: lotMilk.id,
      },
    },
    update: {
      qtyOnHand: 200,
    },
    create: {
      warehouseId: mainWh.id,
      itemId: itemMilk.id,
      lotId: lotMilk.id,
      qtyOnHand: 200,
      qtyAllocated: 0,
    },
  });

  await prisma.stockLedger.upsert({
    where: { idempotencyKey: 'init-stock-milk' },
    update: {},
    create: {
      idempotencyKey: 'init-stock-milk',
      warehouseId: mainWh.id,
      itemId: itemMilk.id,
      lotId: lotMilk.id,
      quantity: 200,
      documentId: 'INITIAL_BALANCE',
      documentType: DocumentType.ADJUSTMENT,
      postedAt: new Date(),
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
