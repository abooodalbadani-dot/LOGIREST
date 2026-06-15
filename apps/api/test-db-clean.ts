import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const currencies = await prisma.currency.findMany({
    select: { id: true, code: true, name: true, isBase: true }
  });
  const settings = await prisma.systemSetting.findMany({
    where: { key: 'system_settings' }
  });
  console.log('Currencies in DB:', JSON.stringify(currencies, null, 2));
  console.log('Settings in DB:', JSON.stringify(settings, null, 2));
}

main().finally(() => prisma.$disconnect());
