/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { BcryptService } from '../src/auth/bcrypt.service';
import { randomUUID } from 'crypto';

describe('Concurrency Control E2E', () => {
  jest.setTimeout(180000);

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

    const suffix = `conc-e2e-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

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
    procOfficerToken = loginRes.body.accessToken;
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
        await prisma.approvalEvent.deleteMany({
          where: { userId: procOfficerId },
        });
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

  it('should return a structured 409 Conflict with last editor details on version mismatch', async () => {
    // 1. Create a purchase request (version 1, DRAFT)
    const createRes = await request(app.getHttpServer())
      .post('/api/v1/purchase-requests')
      .set('Authorization', `Bearer ${procOfficerToken}`)
      .set('x-warehouse-id', warehouseId)
      .set('x-branch-id', branchId)
      .set('x-idempotency-key', randomUUID())
      .send({
        branchId,
        warehouseId,
        lines: [{ itemId, quantity: 10 }],
      })
      .expect(201);

    const prId = createRes.body.id;
    expect(createRes.body.version).toBe(1);
    expect(createRes.body.status).toBe('DRAFT');

    // 2. Attempt to submit using a mismatched/stale version (e.g. 999)
    // This is a valid transition (DRAFT -> SUBMIT) but will fail optimistic locking check in transaction.
    const conflictRes = await request(app.getHttpServer())
      .post(`/api/v1/purchase-requests/${prId}/submit`)
      .set('Authorization', `Bearer ${procOfficerToken}`)
      .set('x-warehouse-id', warehouseId)
      .set('x-branch-id', branchId)
      .send({ comments: 'Stale Submit', version: 999 })
      .expect(409);

    const body = conflictRes.body;
    expect(body.statusCode).toBe(409);
    expect(body.error).toBe('Conflict');
    expect(body.message).toContain('Version conflict');
    expect(body.currentVersion).toBe(1);
    expect(body.lastModifiedBy).toBeDefined();
    expect(body.lastModifiedAt).toBeDefined();

    // 3. Submit with matching version (version 1 -> 2)
    const submitRes = await request(app.getHttpServer())
      .post(`/api/v1/purchase-requests/${prId}/submit`)
      .set('Authorization', `Bearer ${procOfficerToken}`)
      .set('x-warehouse-id', warehouseId)
      .set('x-branch-id', branchId)
      .send({ comments: 'Valid Submit', version: 1 })
      .expect(200);

    expect(submitRes.body.status).toBe('SUBMITTED');
    expect(submitRes.body.version).toBe(2);
  });
});
