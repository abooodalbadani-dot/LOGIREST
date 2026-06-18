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
  const pos = await prisma.purchaseOrder.findMany({
    select: {
      id: true,
      poNumber: true,
      prId: true,
    },
  });
  console.log('Purchase Orders in DB:', pos);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
