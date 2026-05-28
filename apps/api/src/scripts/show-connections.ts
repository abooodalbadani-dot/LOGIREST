import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  try {
    console.log('Deleting existing E2E admin user to trigger fresh seeding...');
    await prisma.userWarehouseScope.deleteMany({
      where: { user: { email: 'admin@logirest.com' } },
    });
    await prisma.user.deleteMany({
      where: { email: 'admin@logirest.com' },
    });
    console.log('User admin@logirest.com successfully deleted.');

    console.log('Querying all active connections in PostgreSQL...');
    const activeConns = await prisma.$queryRaw<any[]>`
      SELECT pid, datname, state, query, age(clock_timestamp(), query_start)::text as age
      FROM pg_stat_activity;
    `;
    console.log('Active connections:', JSON.stringify(activeConns, null, 2));

    console.log('Querying all current locks...');
    const locks = await prisma.$queryRaw<any[]>`
      SELECT 
        pl.pid,
        pl.locktype,
        pl.mode,
        pl.granted,
        psa.query,
        psa.state
      FROM pg_locks pl
      LEFT JOIN pg_stat_activity psa ON pl.pid = psa.pid;
    `;
    console.log('Current locks:', JSON.stringify(locks, null, 2));
  } catch (error) {
    console.error('Execution failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
