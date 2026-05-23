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
  console.log('Connecting to database...');
  try {
    // 1. Query indexes on the warehouse_item_lots and stock_ledger/cost_ledger
    console.log('--- pg_indexes ---');
    const indexes: any = await prisma.$queryRawUnsafe(`
      SELECT tablename, indexname, indexdef 
      FROM pg_indexes 
      WHERE schemaname = 'public' 
      ORDER BY tablename, indexname;
    `);
    console.log(JSON.stringify(indexes, null, 2));

    // 2. Query columns of warehouse_locks
    console.log('--- warehouse_locks columns ---');
    const columns: any = await prisma.$queryRawUnsafe(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'warehouse_locks';
    `);
    console.log(JSON.stringify(columns, null, 2));

    // 3. Query all rows from warehouse_locks using direct SQL to avoid Prisma model validation mismatch
    console.log('--- warehouse_locks rows via raw SQL ---');
    try {
      const locksRaw = await prisma.$queryRawUnsafe(`
        SELECT * FROM warehouse_locks;
      `);
      console.log(JSON.stringify(locksRaw, null, 2));
    } catch (e) {
      console.log('Failed to fetch warehouse_locks via SQL:', e);
    }

    // 4. Query prisma migrations table
    console.log('--- prisma migrations ---');
    try {
      const migrations: any = await prisma.$queryRawUnsafe(`
        SELECT * FROM _prisma_migrations;
      `);
      console.log(JSON.stringify(migrations, null, 2));
    } catch (e) {
      console.log('Error querying migrations:', e);
    }

    // 5. Query active database sessions
    console.log('--- pg_stat_activity ---');
    try {
      const stat: any = await prisma.$queryRawUnsafe(`
        SELECT pid, usename, state, query, wait_event_type, wait_event 
        FROM pg_stat_activity 
        WHERE datname = 'insforge' AND pid <> pg_backend_pid();
      `);
      console.log(JSON.stringify(stat, null, 2));
    } catch (e) {
      console.log('Error querying pg_stat_activity:', e);
    }

  } catch (err) {
    console.error('Database connection or query failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
