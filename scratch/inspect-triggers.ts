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
  const triggers = await prisma.$queryRaw`
    SELECT 
      event_object_table AS table_name, 
      trigger_name, 
      action_statement, 
      action_timing, 
      event_manipulation
    FROM 
      information_schema.triggers
    ORDER BY 
      table_name, trigger_name;
  `;
  console.log('Database Triggers:', JSON.stringify(triggers, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
