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
  log: ['query', 'info', 'warn', 'error'],
});

async function main() {
  const prId = '0e5e3470-e9f6-4c67-8d40-55769650da2a'; // The ID of the PR from the last E2E test
  
  console.log('--- Checking current PR state ---');
  const prBefore = await prisma.purchaseRequest.findUnique({
    where: { id: prId },
  });
  console.log('Before:', prBefore);

  console.log('--- Executing Transaction ---');
  await prisma.$transaction(async (tx) => {
    const pr = await tx.purchaseRequest.findUnique({
      where: { id: prId },
      select: { branchId: true, status: true },
    });
    console.log('Fetched PR inside transaction:', pr);

    console.log('Updating PR status to FULFILLED...');
    const updatedPr = await tx.purchaseRequest.update({
      where: { id: prId },
      data: { status: 'FULFILLED' },
    });
    console.log('Updated PR inside transaction result:', updatedPr);
  });

  console.log('--- Checking PR state after Transaction ---');
  const prAfter = await prisma.purchaseRequest.findUnique({
    where: { id: prId },
  });
  console.log('After:', prAfter);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
