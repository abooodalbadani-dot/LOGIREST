import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding production database reference data...');

  // 1. Currencies
  const BASE_CURRENCY_CODE = process.env.BASE_CURRENCY_CODE || 'SAR';
  const BASE_CURRENCY_NAME = process.env.BASE_CURRENCY_NAME || 'Saudi Riyal';

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

  // 5. Optional Secure First Admin User Setup via Environment Variables
  const adminEmail = process.env.INITIAL_ADMIN_EMAIL;
  const adminPassword = process.env.INITIAL_ADMIN_PASSWORD;
  const adminName = process.env.INITIAL_ADMIN_NAME || 'System Administrator';

  if (adminEmail && adminPassword) {
    console.log(`Found environment variables. Seeding initial admin user: ${adminEmail}`);
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    await prisma.user.upsert({
      where: { email: adminEmail },
      update: {},
      create: {
        email: adminEmail,
        passwordHash,
        name: adminName,
        role: Role.ADMIN,
        isActive: true,
      },
    });
    console.log('Initial admin user successfully seeded!');
  } else {
    console.log('No INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD environment variables found. Skipping initial admin seeding.');
    console.log('Tip: Set INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD to seed the first admin user securely.');
  }

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
