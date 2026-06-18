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
  const prId = '517e6388-f662-4e48-822c-d0d1de192f3f';
  const poId = 'ddd00cce-1992-4050-b608-916d6d660c84';

  console.log('--- Purchase Request ---');
  const pr = await prisma.purchaseRequest.findUnique({
    where: { id: prId },
    include: { purchaseOrders: true }
  });
  console.log(JSON.stringify(pr, null, 2));

  console.log('--- Approval Events for PR ---');
  const events = await prisma.approvalEvent.findMany({
    where: { documentId: prId },
    orderBy: { createdAt: 'asc' }
  });
  console.log(events);

  console.log('--- Audit Logs for PR ---');
  const logs = await prisma.auditLog.findMany({
    where: { targetId: prId },
    orderBy: { createdAt: 'asc' }
  });
  console.log(logs);

  console.log('--- Audit Logs for PO ---');
  const poLogs = await prisma.auditLog.findMany({
    where: { targetId: poId },
    orderBy: { createdAt: 'asc' }
  });
  console.log(poLogs);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
