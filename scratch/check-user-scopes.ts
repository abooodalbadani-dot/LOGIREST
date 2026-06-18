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
  console.log('--- WAREHOUSES ---');
  const warehouses = await prisma.warehouse.findMany({ select: { id: true, name: true, code: true, branchId: true } });
  console.log(JSON.stringify(warehouses, null, 2));

  console.log('--- USER WAREHOUSE SCOPES ---');
  const whScopes = await prisma.userWarehouseScope.findMany({
    include: {
      user: { select: { email: true, role: true } },
      warehouse: { select: { name: true, code: true } }
    }
  });
  console.log(JSON.stringify(whScopes, null, 2));

  console.log('--- USER BRANCH SCOPES ---');
  const branchScopes = await prisma.userBranchScope.findMany({
    include: {
      user: { select: { email: true, role: true } },
      branch: { select: { name: true, code: true } }
    }
  });
  console.log(JSON.stringify(branchScopes, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
