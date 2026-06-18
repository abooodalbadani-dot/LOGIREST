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
  const indexes: any = await prisma.$queryRaw`
    SELECT
        tablename,
        indexname,
        indexdef
    FROM
        pg_indexes
    WHERE
        schemaname = 'public'
        AND tablename = 'purchase_orders';
  `;
  console.log('Indexes on purchase_orders:', JSON.stringify(indexes, null, 2));

  const columns: any = await prisma.$queryRaw`
    SELECT 
        column_name, 
        data_type, 
        is_nullable,
        column_default
    FROM 
        information_schema.columns
    WHERE 
        table_name = 'purchase_orders';
  `;
  console.log('Columns on purchase_orders:', JSON.stringify(columns, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
