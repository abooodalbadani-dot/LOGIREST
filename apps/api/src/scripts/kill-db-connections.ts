import { PrismaClient } from '@prisma/client';

interface PgLockConflict {
  blocked_pid: number | string;
  blocking_pid: number | string;
  blocked_statement: string;
  blocking_statement: string;
}

interface PgStatActivity {
  pid: number | string;
  datname: string;
  state: string;
  query: string;
  age: string;
}

async function main() {
  const prisma = new PrismaClient();
  try {
    console.log('Querying active lock conflicts in PostgreSQL...');
    const locks = await prisma.$queryRaw<PgLockConflict[]>`
      SELECT
          blocked_locks.pid     AS blocked_pid,
          blocking_locks.pid    AS blocking_pid,
          blocked_activity.query    AS blocked_statement,
          blocking_activity.query   AS blocking_statement
      FROM  pg_catalog.pg_locks         blocked_locks
      JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
      JOIN pg_catalog.pg_locks         blocking_locks 
          ON blocking_locks.locktype = blocked_locks.locktype
          AND blocking_locks.database IS NOT DISTINCT FROM blocked_locks.database
          AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
          AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
          AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
          AND blocking_locks.virtualxid IS NOT DISTINCT FROM blocked_locks.virtualxid
          AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid
          AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid
          AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid
          AND blocking_locks.objsubid IS NOT DISTINCT FROM blocked_locks.objsubid
          AND blocking_locks.pid != blocked_locks.pid
      JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
      WHERE NOT blocked_locks.granted;
    `;

    console.log('Lock conflicts found:', locks);

    if (locks.length > 0) {
      console.log('Terminating blocking pids...');
      for (const lock of locks) {
        const pid = Number(lock.blocking_pid);
        console.log(`Terminating blocking process ${pid}...`);
        await prisma.$queryRawUnsafe(`SELECT pg_terminate_backend(${pid});`);
      }
      console.log('Terminated all blocking processes.');
    } else {
      console.log(
        'No blocking lock conflicts found. Querying all active connections...',
      );
      const activeConns = await prisma.$queryRaw<PgStatActivity[]>`
        SELECT pid, datname, state, query, age(clock_timestamp(), query_start)::text as age
        FROM pg_stat_activity
        WHERE pid <> pg_backend_pid();
      `;
      console.log('Active connections:', activeConns);

      if (activeConns.length > 0) {
        console.log('Terminating all other active connections...');
        for (const conn of activeConns) {
          const pid = Number(conn.pid);
          console.log(`Terminating process ${pid}...`);
          await prisma.$queryRawUnsafe(`SELECT pg_terminate_backend(${pid});`);
        }
      }
    }
  } catch (error) {
    console.error('Lock breaking execution failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('Fatal execution error:', err);
});
