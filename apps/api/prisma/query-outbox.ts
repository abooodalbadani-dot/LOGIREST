import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const prs = await prisma.purchaseRequest.groupBy({
    by: ['status'],
    _count: true,
  });
  console.log('PRs:', prs);

  const settings = await prisma.systemSetting.findMany();
  console.log('Settings:', settings);
}

main().catch(console.error).finally(() => prisma.$disconnect());
