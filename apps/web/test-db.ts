import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const currencies = await prisma.currency.findMany();
  const settings = await prisma.systemSetting.findMany();
  console.log('Currencies:', currencies);
  console.log('Settings:', settings);
}

main().finally(() => prisma.$disconnect());
