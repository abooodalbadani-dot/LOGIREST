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
    include: {
      purchaseRequest: {
        select: {
          warehouseId: true,
          warehouse: { select: { name: true, code: true } }
        }
      }
    }
  });

  console.log('--- PO WAREHOUSE MAP ---');
  for (const po of pos) {
    console.log({
      id: po.id,
      poNumber: po.poNumber,
      status: po.status,
      prId: po.prId,
      warehouseId: po.purchaseRequest?.warehouseId || null,
      warehouseCode: po.purchaseRequest?.warehouse?.code || null,
      warehouseName: po.purchaseRequest?.warehouse?.name || null
    });
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
