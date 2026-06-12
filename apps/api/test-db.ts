import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function main() {
  console.log('Scratch script started. Connecting to DB...');
  const start = Date.now();
  
  // Attempt simple query
  try {
    const count = await prisma.branch.count();
    console.log(`Success! Branch count: ${count} in ${Date.now() - start}ms`);
  } catch (err) {
    console.error('Failed to query branches:', err);
  }

  // Attempt to check active locks in Postgres
  try {
    console.log('Checking active locks/queries in PostgreSQL...');
    const locks = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(`
      SELECT 
        t.schemaname,
        t.relname AS table_name,
        l.mode AS lock_mode,
        l.granted,
        a.pid,
        a.query AS active_query,
        age(clock_timestamp(), a.query_start) AS query_age
      FROM pg_locks l
      JOIN pg_stat_activity a ON l.pid = a.pid
      JOIN pg_stat_user_tables t ON l.relation = t.relid
      ORDER BY a.query_start;
    `);
    console.log('Active locks:', JSON.stringify(locks, null, 2));
  } catch (err) {
    console.error('Failed to get active locks:', err);
  }

  await prisma.$disconnect();
}

main();
