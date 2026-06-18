import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../apps/api/.env') });

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

async function main() {
  const prs = await prisma.purchaseRequest.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' },
    select: { id: true, requestNumber: true, status: true, version: true, createdAt: true }
  });
  console.log('Last 10 Purchase Requests:');
  console.log(JSON.stringify(prs, null, 2));

  const pos = await prisma.purchaseOrder.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' },
    select: { id: true, poNumber: true, prId: true, status: true, version: true, createdAt: true }
  });
  console.log('Last 10 Purchase Orders:');
  console.log(JSON.stringify(pos, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
