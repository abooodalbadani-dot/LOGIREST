/* eslint-disable */
import * as dotenv from 'dotenv';
import * as path from 'path';

const testEnvPath = path.resolve(__dirname, '../.env.test');
const defaultEnvPath = path.resolve(__dirname, '../.env');

dotenv.config({ path: testEnvPath });
dotenv.config({ path: defaultEnvPath });



import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

async function bootstrapTestDb() {
  const prisma = new PrismaClient();
  try {
    console.log('[E2E Setup] bootstrapTestDb: checking database status...');
    console.log('[E2E Setup] testEnvPath:', testEnvPath);
    console.log('[E2E Setup] defaultEnvPath:', defaultEnvPath);
    console.log('[E2E Setup] DATABASE_URL:', process.env.DATABASE_URL);
    const adminExists = await prisma.user.findFirst({
      where: { email: 'admin@logirest.com' },
    });

    if (adminExists) {
      return;
    }

    console.log('[E2E Setup] Seeding core baseline dependencies for E2E tests...');

    const systemSettingsConfig = {
      system_name: 'LogiRest System',
      base_currency: 'SAR',
      branch_id: 'HQ',
      timezone: 'Asia/Riyadh',
      locale_default: 'en',
      sender_name: 'LogiRest Alerts',
      reply_to_email: 'alerts@logirest.app',
      mail_provider: 'smtp',
      smtp_host: '',
      smtp_port: 587,
      smtp_user: '',
      smtp_password: '',
      smtp_encryption: 'tls',
    };

    await prisma.systemSetting.upsert({
      where: { key: 'system_settings' },
      update: {},
      create: {
        key: 'system_settings',
        value: JSON.stringify(systemSettingsConfig),
        version: 1,
      },
    });

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

    const uoms = ['KG', 'LTR', 'PCS'];
    for (const code of uoms) {
      await prisma.unitOfMeasure.upsert({
        where: { code },
        update: {},
        create: { name: code, code },
      });
    }

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

    const categories = ['Dry Goods', 'Dairy'];
    for (const name of categories) {
      await prisma.category.upsert({
        where: { name },
        update: {},
        create: { name },
      });
    }

    const passwordHash = await bcrypt.hash('Password123!', 10);
    const adminComUser = await prisma.user.upsert({
      where: { email: 'admin@logirest.com' },
      update: {},
      create: {
        email: 'admin@logirest.com',
        passwordHash,
        name: 'System Admin Com',
        role: Role.ADMIN,
        isActive: true,
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

    console.log('[E2E Setup] Test database core dependencies successfully bootstrapped.');
  } catch (error) {
    console.error('[E2E Setup] Core database bootstrapping failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

beforeAll(async () => {
  await bootstrapTestDb();
});

