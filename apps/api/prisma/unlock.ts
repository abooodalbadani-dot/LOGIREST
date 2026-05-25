import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  console.log('Terminating other active database sessions to release locks...');
  try {
    const result = await prisma.$executeRawUnsafe(`
      SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity
      WHERE datname = current_database()
        AND pid <> pg_backend_pid();
    `);
    console.log('Unlock result:', result);
  } catch (err) {
    console.error('Unlock failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}
main();
