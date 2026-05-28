/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { BcryptService } from '../src/auth/bcrypt.service';
import { randomUUID } from 'crypto';

describe('Idempotency Subsystem E2E', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let bcrypt: BcryptService;

  let procOfficerToken: string;
  let procOfficerId: string;
  let branchId: string;
  let warehouseId: string;
  let itemId: string;
  let categoryId: string;
  let uomId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );

    await app.init();

    prisma = app.get(PrismaService);
    bcrypt = app.get(BcryptService);

    const suffix = `idem-e2e-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const branch = await prisma.branch.create({
      data: { name: `Branch ${suffix}`, code: `BR-${suffix}` },
    });
    branchId = branch.id;

    const warehouse = await prisma.warehouse.create({
      data: { name: `Warehouse ${suffix}`, code: `WH-${suffix}`, branchId },
    });
    warehouseId = warehouse.id;

    const category = await prisma.category.create({
      data: { name: `Category ${suffix}` },
    });
    categoryId = category.id;

    const uom = await prisma.unitOfMeasure.create({
      data: { name: `UOM ${suffix}`, code: `UOM-${suffix}` },
    });
    uomId = uom.id;

    const item = await prisma.item.create({
      data: { name: `Item ${suffix}`, sku: `SKU-${suffix}`, categoryId, uomId },
    });
    itemId = item.id;

    const email = `${suffix}@logirest.com`;
    const passwordHash = await bcrypt.hash('password123');
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name: `Proc Officer ${suffix}`,
        role: 'PROC_OFFICER',
        isActive: true,
      },
    });
    procOfficerId = user.id;

    await prisma.userWarehouseScope.create({
      data: { userId: procOfficerId, warehouseId },
    });

    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: 'password123' });
    procOfficerToken = loginRes.body.token || loginRes.body.accessToken;
  });

  afterAll(async () => {
    if (prisma) {
      if (warehouseId) {
        await prisma.warehouseItemLot.deleteMany({
          where: { warehouseId },
        });
        await prisma.warehouseItem.deleteMany({
          where: { warehouseId },
        });
      }
      if (procOfficerId) {
        await prisma.userWarehouseScope.deleteMany({
          where: { userId: procOfficerId },
        });
      }
      if (branchId) {
        await prisma.pRLine.deleteMany({
          where: { purchaseRequest: { branchId } },
        });
      }
      if (procOfficerId) {
        await prisma.auditLog.deleteMany({
          where: { userId: procOfficerId },
        });
      }
      if (branchId) {
        await prisma.purchaseRequest.deleteMany({
          where: { branchId },
        });
      }
      if (categoryId) {
        await prisma.item.deleteMany({
          where: { categoryId },
        });
      }
      if (uomId) {
        await prisma.unitOfMeasure.delete({
          where: { id: uomId },
        });
      }
      if (categoryId) {
        await prisma.category.delete({
          where: { id: categoryId },
        });
      }
      if (warehouseId) {
        await prisma.warehouse.delete({
          where: { id: warehouseId },
        });
      }
      if (branchId) {
        await prisma.documentSequence.deleteMany({
          where: { branchId },
        });
        await prisma.branch.delete({
          where: { id: branchId },
        });
      }
      if (procOfficerId) {
        await prisma.user.delete({
          where: { id: procOfficerId },
        });
      }

      await prisma.$disconnect();
    }
    await app.close();
  });

  it('should return a 400 Bad Request when x-idempotency-key is missing', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/purchase-requests')
      .set('Authorization', `Bearer ${procOfficerToken}`)
      .set('x-warehouse-id', warehouseId)
      .set('x-branch-id', branchId)
      .send({
        branchId,
        warehouseId,
        lines: [{ itemId, quantity: 10 }],
      })
      .expect(400);

    expect(res.body.message).toBe('Missing x-idempotency-key header');
  });

  it('should return a 400 Bad Request when x-idempotency-key format is invalid', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/purchase-requests')
      .set('Authorization', `Bearer ${procOfficerToken}`)
      .set('x-warehouse-id', warehouseId)
      .set('x-branch-id', branchId)
      .set('x-idempotency-key', 'not-a-valid-uuid-v4')
      .send({
        branchId,
        warehouseId,
        lines: [{ itemId, quantity: 10 }],
      })
      .expect(400);

    expect(res.body.message).toBe('Invalid x-idempotency-key format');
  });

  it('should process concurrent requests with same key and return 201 for first and 409 for second', async () => {
    const key = randomUUID();
    const payload = {
      branchId,
      warehouseId,
      lines: [{ itemId, quantity: 10 }],
    };

    const [res1, res2] = await Promise.all([
      request(app.getHttpServer())
        .post('/api/v1/purchase-requests')
        .set('Authorization', `Bearer ${procOfficerToken}`)
        .set('x-warehouse-id', warehouseId)
        .set('x-branch-id', branchId)
        .set('x-idempotency-key', key)
        .send(payload),
      request(app.getHttpServer())
        .post('/api/v1/purchase-requests')
        .set('Authorization', `Bearer ${procOfficerToken}`)
        .set('x-warehouse-id', warehouseId)
        .set('x-branch-id', branchId)
        .set('x-idempotency-key', key)
        .send(payload),
    ]);

    const status1 = res1.status;
    const status2 = res2.status;

    // One must be 201, and the other must be 409
    if (status1 === 201) {
      expect(status2).toBe(409);
      expect(res2.body.message).toBe('Request is already being processed');
    } else {
      expect(status1).toBe(409);
      expect(res1.body.message).toBe('Request is already being processed');
      expect(status2).toBe(201);
    }
  });

  it('should return cached response sequentially for duplicate requests with the same key', async () => {
    const key = randomUUID();
    const payload = {
      branchId,
      warehouseId,
      lines: [{ itemId, quantity: 10 }],
    };

    // First request
    const res1 = await request(app.getHttpServer())
      .post('/api/v1/purchase-requests')
      .set('Authorization', `Bearer ${procOfficerToken}`)
      .set('x-warehouse-id', warehouseId)
      .set('x-branch-id', branchId)
      .set('x-idempotency-key', key)
      .send(payload)
      .expect(201);

    const initialResult = res1.body;

    // Second request (sequentially)
    const res2 = await request(app.getHttpServer())
      .post('/api/v1/purchase-requests')
      .set('Authorization', `Bearer ${procOfficerToken}`)
      .set('x-warehouse-id', warehouseId)
      .set('x-branch-id', branchId)
      .set('x-idempotency-key', key)
      .send(payload)
      .expect(201);

    expect(res2.body).toEqual(initialResult);
  });
});
