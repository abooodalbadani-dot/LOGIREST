import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const issues = await prisma.inventoryIssue.findMany({
    select: { id: true, issueNumber: true, status: true, warehouseId: true, departmentId: true }
  });
  console.log('Inventory Issues in DB:', issues);
}

main().finally(() => prisma.$disconnect());
