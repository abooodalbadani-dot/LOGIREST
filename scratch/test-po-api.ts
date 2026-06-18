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
  if (!item) {
    console.error('No items found in DB to test!');
    return;
  }
  console.log('Using test item:', { id: item.id, sku: item.sku, name: item.name });

  const BASE_URL = 'http://localhost:4000/api/v1';

  // 1. Authenticate as procurement officer
  console.log('Logging in as admin@otantikrestaurant.com...');
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@otantikrestaurant.com', password: 'Password123!' }),
  });
  
  if (!loginRes.ok) {
    console.error('Login failed:', loginRes.status, await loginRes.text());
    return;
  }
  
  const loginData = await loginRes.json();
  const token = loginData.accessToken;
  console.log('Login successful.');

  // 2. Attempt to create PO (Direct - without prId)
  const poPayloadDirect = {
    supplierId: 'e28bd028-0147-4874-a655-3fcc684b4bf2',
    currencyId: 'c6f332a7-aac4-4dc8-98ed-682bc6c8d436',
    prId: '',
    lines: [
      {
        itemId: item.id,
        quantity: 5,
        unitPrice: 10.5,
      }
    ],
  };

  console.log('\nSending POST /procurement/purchase-orders (Direct PO)...');
  const poResDirect = await fetch(`${BASE_URL}/procurement/purchase-orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'x-branch-id': 'b1',
      'x-warehouse-id': '3ecd0f12-0375-4a9a-9c46-900d056e3bca',
      'x-idempotency-key': require('crypto').randomUUID()
    },
    body: JSON.stringify(poPayloadDirect),
  });

  console.log('Response status (Direct PO):', poResDirect.status);
  const poDataDirect = await poResDirect.json().catch(() => ({}));
  console.log('Response body:', JSON.stringify(poDataDirect, null, 2));

  // 3. Attempt to create PO with non-existent prId
  const poPayloadNonExistentPr = {
    ...poPayloadDirect,
    prId: '00000000-0000-0000-0000-000000000000',
  };
  console.log('\nSending POST /procurement/purchase-orders (Non-existent PR ID)...');
  const poResNonExistent = await fetch(`${BASE_URL}/procurement/purchase-orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'x-branch-id': 'b1',
      'x-warehouse-id': '3ecd0f12-0375-4a9a-9c46-900d056e3bca',
      'x-idempotency-key': require('crypto').randomUUID()
    },
    body: JSON.stringify(poPayloadNonExistentPr),
  });
  console.log('Response status (Non-existent PR):', poResNonExistent.status);
  const poDataNonExistent = await poResNonExistent.json().catch(() => ({}));
  console.log('Response body:', JSON.stringify(poDataNonExistent, null, 2));

  // 4. Attempt to create PO with already-converted prId
  const poPayloadAlreadyConverted = {
    ...poPayloadDirect,
    prId: '1f60be26-331a-4911-b38e-a1fa219e7c2a',
  };
  console.log('\nSending POST /procurement/purchase-orders (Already-converted PR ID)...');
  const poResAlreadyConverted = await fetch(`${BASE_URL}/procurement/purchase-orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'x-branch-id': 'b1',
      'x-warehouse-id': '3ecd0f12-0375-4a9a-9c46-900d056e3bca',
      'x-idempotency-key': require('crypto').randomUUID()
    },
    body: JSON.stringify(poPayloadAlreadyConverted),
  });
  console.log('Response status (Already-converted PR):', poResAlreadyConverted.status);
  const poDataAlreadyConverted = await poResAlreadyConverted.json().catch(() => ({}));
  console.log('Response body:', JSON.stringify(poDataAlreadyConverted, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
