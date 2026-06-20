import { Test } from '@nestjs/testing';
import { AppModule } from './src/app.module';
import { PrismaService } from './src/database/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import { TransformInterceptor } from './src/interceptors/transform.interceptor';
import request from 'supertest';

async function run() {
  const moduleFixture = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();
  app.setGlobalPrefix('api/v1');
  app.useGlobalInterceptors(new TransformInterceptor());
  await app.init();

  const prisma = app.get(PrismaService);
  const jwtService = app.get(JwtService);

  try {
    // 1. Get database entities
    const warehouse = await prisma.warehouse.findUnique({ where: { id: 'a14fca59-e0ae-4acf-9a75-930a57ac0f89' } }) || await prisma.warehouse.findFirst();
    const department = await prisma.department.findFirst();
    const item = await prisma.item.findFirst();
    const lot = item ? await prisma.lot.findFirst({ where: { itemId: item.id } }) : null;
    const kr = await prisma.kitchenRequest.findFirst();
    const user = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });

    if (!warehouse || !department || !item || !user) {
      console.log('Required data for test is missing in DB.');
      return;
    }

    // Ensure user scope is set up
    await prisma.userWarehouseScope.upsert({
      where: { userId_warehouseId: { userId: user.id, warehouseId: warehouse.id } },
      create: { userId: user.id, warehouseId: warehouse.id },
      update: {}
    });

    // Generate valid jwt token
    const token = jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role
    });

    console.log(`Sending POST /operations/issues payload for Warehouse ${warehouse.id}, Department ${department.id}, Item ${item.id}, Lot ${lot?.lotNumber}, KR ${kr?.id}`);

    const res = await request(app.getHttpServer())
      .post('/api/v1/operations/issues')
      .set('Authorization', `Bearer ${token}`)
      .set('x-warehouse-id', warehouse.id)
      .set('x-branch-id', warehouse.branchId)
      .set('x-idempotency-key', randomUUID())
      .send({
        warehouseId: warehouse.id,
        destinationDeptId: department.id,
        kitchenRequestId: kr ? kr.id : undefined,
        lines: [
          {
            itemId: item.id,
            requestedQty: 1,
            lotAllocations: lot ? [
              {
                lotNumber: lot.lotNumber,
                allocatedQty: 1
              }
            ] : []
          }
        ]
      });

    console.log('Response Status:', res.status);
    console.log('Response Body:', JSON.stringify(res.body, null, 2));

  } catch (err) {
    console.error('Error during NestJS request:', err);
  } finally {
    await app.close();
  }
}

run();
