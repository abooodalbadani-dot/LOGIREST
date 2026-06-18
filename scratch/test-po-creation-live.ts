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
  const item = await prisma.item.findFirst();
  const branch = await prisma.branch.findFirst();
  const warehouse = await prisma.warehouse.findFirst();
  const user = await prisma.user.findFirst();
  const supplier = await prisma.supplier.findFirst();
  const currency = await prisma.currency.findFirst();

  if (!item || !branch || !warehouse || !user || !supplier || !currency) {
    console.error('Missing required database seed data for testing.');
    return;
  }

  console.log('--- Step 1: Creating a DRAFT Purchase Request ---');
  const pr = await prisma.purchaseRequest.create({
    data: {
      requestNumber: `TEST-PR-${Date.now()}`,
      branchId: branch.id,
      warehouseId: warehouse.id,
      createdById: user.id,
      status: 'DRAFT',
      lines: {
        create: [
          { itemId: item.id, quantity: 10 }
        ]
      }
    }
  });
  console.log(`Created PR: ${pr.requestNumber}, ID: ${pr.id}, Status: ${pr.status}`);

  console.log('--- Step 2: Transitioning PR to APPROVED ---');
  // Directly simulate approval state for test simplicity
  const approvedPr = await prisma.purchaseRequest.update({
    where: { id: pr.id },
    data: { status: 'APPROVED' }
  });
  console.log(`PR Status updated directly to: ${approvedPr.status}`);

  console.log('--- Step 3: Call PO Controller/Service equivalent creation ---');
  const BASE_URL = 'http://localhost:4000/api/v1';

  // Login to get token
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@otantikrestaurant.com', password: 'Password123!' }),
  });
  const loginData = await loginRes.json();
  const token = loginData.accessToken;

  // Post PO creation payload
  const poPayload = {
    supplierId: supplier.id,
    currencyId: currency.id,
    prId: pr.id,
    lines: [
      { itemId: item.id, quantity: 10, unitPrice: 12.5 }
    ]
  };

  console.log(`Sending POST /procurement/purchase-orders with prId: ${pr.id}...`);
  const poRes = await fetch(`${BASE_URL}/procurement/purchase-orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'x-branch-id': branch.id,
      'x-warehouse-id': warehouse.id,
      'x-idempotency-key': require('crypto').randomUUID()
    },
    body: JSON.stringify(poPayload),
  });

  console.log('Response status:', poRes.status);
  const poData = await poRes.json();
  console.log('Response body:', JSON.stringify(poData, null, 2));

  console.log('--- Step 4: Re-querying the PR Status in DB ---');
  const finalPr = await prisma.purchaseRequest.findUnique({
    where: { id: pr.id }
  });
  console.log(`Final PR Status in Database: ${finalPr?.status}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
