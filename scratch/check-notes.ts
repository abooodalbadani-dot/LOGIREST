import * as http from 'http';
import * as crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

function makeRequest(url: string, method: string = 'GET', postData?: string, token?: string, headers?: Record<string, string>): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      url,
      {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(postData ? { 'Content-Length': Buffer.byteLength(postData) } : {}),
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          'x-idempotency-key': crypto.randomUUID(),
          ...headers,
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          resolve(data);
        });
      }
    );

    req.on('error', (err) => {
      reject(err);
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function main() {
  const prisma = new PrismaClient();
  try {
    console.log('1. Logging in as admin...');
    const loginResText = await makeRequest(
      'http://localhost:4000/api/v1/auth/login',
      'POST',
      JSON.stringify({ email: 'admin@otantikrestaurant.com', password: 'Password123!' })
    );

    const loginRes = JSON.parse(loginResText);
    const token = loginRes.accessToken;
    if (!token) {
      console.error('Login failed! Response:', loginResText);
      return;
    }
    console.log('Login successful.');

    // Get valid IDs
    const department = await prisma.department.findFirst();
    const warehouse = await prisma.warehouse.findFirst();
    const item = await prisma.item.findFirst();

    if (!department || !warehouse || !item) {
      console.error('Cannot test: Missing department, warehouse or item in database.');
      return;
    }

    console.log(`Using Department ID: ${department.id}`);
    console.log(`Using Warehouse ID: ${warehouse.id}`);
    console.log(`Using Warehouse Branch ID: ${warehouse.branchId}`);

    const payload = {
      departmentId: department.id,
      warehouseId: warehouse.id,
      notes: 'Test header notes from API request',
      items: [
        {
          itemId: item.id,
          quantityRequested: 10,
          notes: 'Test line item notes from API request',
        }
      ]
    };

    const apiHeaders = {
      'x-warehouse-id': warehouse.id,
      'x-branch-id': warehouse.branchId,
    };

    console.log('2. Sending POST /operations/kitchen-requests...');
    const createResText = await makeRequest(
      'http://localhost:4000/api/v1/operations/kitchen-requests',
      'POST',
      JSON.stringify(payload),
      token,
      apiHeaders
    );

    console.log('Response from API:');
    console.log(createResText);

    const createRes = JSON.parse(createResText);
    const krId = createRes.data?.id;
    if (!krId) {
      console.error('Failed to create kitchen request via API!');
      return;
    }

    // Query DB directly to check if they were saved
    const dbReq = await prisma.kitchenRequest.findUnique({
      where: { id: krId },
      include: { items: true }
    });

    console.log('\n3. Direct DB Check:');
    console.log(`Saved Header Notes: "${dbReq?.notes}"`);
    console.log(`Saved Line Notes: "${dbReq?.items[0]?.notes}"`);

    // Clean up
    await prisma.kitchenRequestItem.deleteMany({ where: { requestId: krId } });
    await prisma.kitchenRequest.delete({ where: { id: krId } });
    console.log('Cleanup done.');

  } catch (error) {
    console.error('Error running integration test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
