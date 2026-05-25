import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Connecting to database...');
  try {
    await prisma.$connect();
    console.log('Successfully connected!');
    const result = await prisma.$queryRaw`SELECT 1`;
    console.log('Query result:', result);
  } catch (error) {
    console.error('Failed to connect:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
