import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    await prisma.$connect();
    const applied = await prisma.$queryRaw`
      SELECT migration_name, applied_steps_count, finished_at 
      FROM _prisma_migrations 
      WHERE applied_steps_count > 0
    `;
    console.log('Applied migrations in DB:');
    console.log(applied);
  } catch (error) {
    console.error('Failed to query migrations:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
