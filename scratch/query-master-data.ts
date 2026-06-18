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
  console.log('Querying Database...');
  const suppliers = await prisma.supplier.findMany();
  const currencies = await prisma.currency.findMany();
  const warehouses = await prisma.warehouse.findMany();
  
  console.log('Suppliers:', suppliers.length, suppliers.map(s => ({ id: s.id, code: s.code, name: s.name })));
  console.log('Currencies:', currencies.length, currencies.map(c => ({ id: c.id, code: c.code, isBase: c.isBase })));
  console.log('Warehouses:', warehouses.length, warehouses.map(w => ({ id: w.id, code: w.code, name: w.name })));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
