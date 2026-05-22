import { PrismaClient } from '@prisma/client';

async function verifyConnection() {
  const prisma = new PrismaClient();
  try {
    await prisma.$connect();
    const result = await prisma.$queryRaw<Array<{ now: Date }>>`SELECT NOW()`;
    console.log('✅ Database connection verified at:', result[0].now);
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

void verifyConnection();
