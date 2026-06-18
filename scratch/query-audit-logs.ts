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
  console.log('--- RECENT AUDIT LOGS ---');
  const logs = await prisma.auditLog.findMany({
    take: 15,
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { email: true, role: true } }
    }
  });
  console.log(JSON.stringify(logs, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
