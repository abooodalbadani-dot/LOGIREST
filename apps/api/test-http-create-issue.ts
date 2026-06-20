import { PrismaClient } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import * as dotenv from 'dotenv';
import { join } from 'path';

dotenv.config({ path: join(__dirname, '../../.env') });

const prisma = new PrismaClient();
const jwtService = new JwtService({ secret: process.env.JWT_ACCESS_SECRET });

async function run() {
  try {
    const warehouse = await prisma.warehouse.findFirst();
    const department = await prisma.department.findFirst();
    const item = await prisma.item.findFirst();
    const lot = item ? await prisma.lot.findFirst({ where: { itemId: item.id } }) : null;
    const user = await prisma.user.findFirst({ where: { role: 'ADMIN' } });

    if (!warehouse || !department || !item || !user) {
      console.log('Required data for test is missing in DB.');
      return;
    }

    const token = jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role
    });

    const payload = {
      warehouseId: warehouse.id,
      destinationDeptId: department.id,
      notes: "Test create issue from HTTP script",
      lines: [
        {
          itemId: item.id,
          requestedQty: 1,
          notes: "",
          lotAllocations: lot ? [
            {
              lotNumber: lot.lotNumber,
              allocatedQty: 1
            }
          ] : []
        }
      ]
    };

    console.log('Sending HTTP POST to http://localhost:4000/api/v1/operations/issues');
    console.log('Payload:', JSON.stringify(payload, null, 2));

    const response = await fetch('http://localhost:4000/api/v1/operations/issues', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'x-warehouse-id': warehouse.id,
        'x-branch-id': warehouse.branchId,
        'x-department-id': department.id,
        'x-idempotency-key': randomUUID()
      },
      body: JSON.stringify(payload)
    });

    console.log('Response Status:', response.status);
    const bodyText = await response.text();
    console.log('Response Body:', bodyText);

  } catch (err) {
    console.error('Error during HTTP request:', err);
  } finally {
    await prisma.$disconnect();
  }
}

run();
