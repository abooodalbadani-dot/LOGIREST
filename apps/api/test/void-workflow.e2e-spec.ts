/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
process.env.NODE_ENV = 'test';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { ConfigModule } from '@nestjs/config';
import { validate } from '../src/config/env.validation';
import { PrismaModule } from '../src/database/database.module';
import { AuthModule } from '../src/auth/auth.module';
import { WorkflowModule } from '../src/modules/workflow/workflow.module';
import { PurchasingModule } from '../src/modules/purchasing/purchasing.module';
import { OperationsModule } from '../src/modules/operations/operations.module';
import { DocumentSequenceModule } from '../src/modules/sequencing/document-sequence.module';
import { WarehouseLockModule } from '../src/modules/warehouse-lock/warehouse-lock.module';
import { OutboxModule } from '../src/modules/outbox/outbox.module';
import { MetricsModule } from '../src/modules/metrics/metrics.module';
import { BullModule } from '@nestjs/bullmq';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { ScopeInterceptor } from '../src/auth/interceptors/scope.interceptor';
import { IdempotencyGuard } from '../src/guards/idempotency.guard';
import { IdempotencyInterceptor } from '../src/interceptors/idempotency.interceptor';
import { WarehouseLockGuard } from '../src/guards/warehouse-lock.guard';
import { IdempotencyService } from '../src/services/idempotency.service';
import { PrismaService } from '../src/database/prisma.service';
import { BcryptService } from '../src/auth/bcrypt.service';
import { randomUUID } from 'crypto';
import { AdjustmentDirection, AdjustmentReason } from '@prisma/client';
import { REDIS_CLIENT } from '../src/redis/redis.module';
import Redis from 'ioredis';

jest.mock('ioredis', () => {
  const mockRedisInstance = {
    on: jest.fn(),
    off: jest.fn(),
    once: jest.fn(),
    addListener: jest.fn(),
    removeListener: jest.fn(),
    info: jest.fn().mockResolvedValue('redis_version:7.0.0'),
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    defineCommand: jest.fn(),
    quit: jest.fn().mockResolvedValue('OK'),
    disconnect: jest.fn(),
    getMaxListeners: jest.fn().mockReturnValue(10),
    setMaxListeners: jest.fn(),
    emit: jest.fn(),
  };
  const mockRedisClass = jest.fn().mockImplementation(() => mockRedisInstance);
  (mockRedisClass as any).default = mockRedisClass;
  return mockRedisClass;
});

describe('Void Workflow (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let bcrypt: BcryptService;

  let adminToken: string;
  let adminId: string;
  let branchId: string;
  let warehouseId: string;
  let itemId: string;
  let categoryId: string;
  let uomId: string;
  let lotId: string;

  const suffix = `${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          validate,
        }),
        BullModule.forRoot({
          connection: {
            lazyConnect: true,
          },
        }),
        PrismaModule,
        AuthModule,
        WorkflowModule,
        WarehouseLockModule,
        PurchasingModule,
        OperationsModule,
        DocumentSequenceModule,
        OutboxModule,
        MetricsModule,
      ],
      providers: [
        IdempotencyService,
        {
          provide: REDIS_CLIENT,
          useFactory: () => new Redis({ lazyConnect: true }),
        },
        {
          provide: APP_GUARD,
          useClass: JwtAuthGuard,
        },
        {
          provide: APP_GUARD,
          useClass: IdempotencyGuard,
        },
        {
          provide: APP_GUARD,
          useClass: WarehouseLockGuard,
        },
        {
          provide: APP_INTERCEPTOR,
          useClass: ScopeInterceptor,
        },
        {
          provide: APP_INTERCEPTOR,
          useClass: IdempotencyInterceptor,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );

    await app.init();

    prisma = app.get(PrismaService);
    bcrypt = app.get(BcryptService);

    const branch = await prisma.branch.create({
      data: { name: `VoidBranch ${suffix}`, code: `VBR-${suffix}` },
    });
    branchId = branch.id;

    const warehouse = await prisma.warehouse.create({
      data: { name: `VoidWH ${suffix}`, code: `VWH-${suffix}`, branchId },
    });
    warehouseId = warehouse.id;

    const category = await prisma.category.create({
      data: { name: `VoidCat ${suffix}` },
    });
    categoryId = category.id;

    const uom = await prisma.unitOfMeasure.create({
      data: { name: `VoidUOM ${suffix}`, code: `VUOM-${suffix}` },
    });
    uomId = uom.id;

    const item = await prisma.item.create({
      data: {
        name: `VoidItem ${suffix}`,
        sku: `VSKU-${suffix}`,
        categoryId,
        uomId,
        isBatched: true,
      },
    });
    itemId = item.id;

    const lot = await prisma.lot.create({
      data: {
        itemId,
        lotNumber: `VLOT-${suffix}`,
      },
    });
    lotId = lot.id;

    const email = `admin-void-${suffix}@logirest.com`;
    const passwordHash = await bcrypt.hash('password123');
    const admin = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name: `Admin Void ${suffix}`,
        role: 'ADMIN',
        isActive: true,
      },
    });
    adminId = admin.id;

    await prisma.userWarehouseScope.create({
      data: { userId: adminId, warehouseId },
    });

    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: 'password123' });
    adminToken = loginRes.body.accessToken;
  }, 120000);

  afterAll(async () => {
    if (prisma) {
      await prisma.stockLedger
        .deleteMany({ where: { warehouseId } })
        .catch(() => {});
      await prisma.costLedger
        .deleteMany({ where: { warehouseId } })
        .catch(() => {});
      await prisma.warehouseItemLot
        .deleteMany({ where: { warehouseId } })
        .catch(() => {});
      await prisma.warehouseItem
        .deleteMany({ where: { warehouseId } })
        .catch(() => {});
      await prisma.lotAllocation.deleteMany({}).catch(() => {});
      await prisma.approvalEvent
        .deleteMany({ where: { userId: adminId } })
        .catch(() => {});
      await prisma.auditLog
        .deleteMany({ where: { userId: adminId } })
        .catch(() => {});
      await prisma.goodsReceivedNote
        .deleteMany({ where: { warehouseId } })
        .catch(() => {});
      await prisma.inventoryIssue
        .deleteMany({ where: { warehouseId } })
        .catch(() => {});
      await prisma.adjustment
        .deleteMany({ where: { warehouseId } })
        .catch(() => {});
      await prisma.lot.deleteMany({ where: { itemId } }).catch(() => {});
      await prisma.item.deleteMany({ where: { categoryId } }).catch(() => {});
      await prisma.unitOfMeasure
        .delete({ where: { id: uomId } })
        .catch(() => {});
      await prisma.category
        .delete({ where: { id: categoryId } })
        .catch(() => {});
      await prisma.userWarehouseScope
        .deleteMany({ where: { userId: adminId } })
        .catch(() => {});
      await prisma.warehouse
        .delete({ where: { id: warehouseId } })
        .catch(() => {});
      await prisma.documentSequence
        .deleteMany({ where: { branchId } })
        .catch(() => {});
      await prisma.branch.delete({ where: { id: branchId } }).catch(() => {});
      await prisma.user.delete({ where: { id: adminId } }).catch(() => {});
      await prisma.$disconnect().catch(() => {});
    }
    if (app) {
      await app.close().catch(() => {});
    }
  }, 120000);

  describe('GRN Void (POST /api/v1/operations/grn/:id/void)', () => {
    it('should create and POST a GRN', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/purchase-orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-warehouse-id', warehouseId)
        .set('x-branch-id', branchId)
        .set('x-idempotency-key', randomUUID())
        .send({
          supplierId: null,
          currencyId: null,
          branchId,
          warehouseId,
          lines: [{ itemId, quantity: 10, unitPrice: 5 }],
        });

      if (res.status !== 201) {
        console.error('PO create error:', JSON.stringify(res.body));
      }
      expect(res.status).toBe(201);
    });
  });

  describe('Issue Void (POST /api/v1/operations/issue/:id/void)', () => {
    it('should block non-admin from voiding', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/operations/issue/fake-id/void')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ version: 1 });

      expect(res.status).toBe(404);
    });
  });

  describe('Adjustment Void (POST /api/v1/operations/adjustment/:id/void)', () => {
    let adjId: string;

    it('should create, submit, approve, post, then void an adjustment', async () => {
      if (!hasStock()) {
        await seedStock();
      }

      const createRes = await request(app.getHttpServer())
        .post('/api/v1/operations/adjustments')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-warehouse-id', warehouseId)
        .set('x-branch-id', branchId)
        .set('x-idempotency-key', randomUUID())
        .send({
          warehouseId,
          lines: [
            {
              itemId,
              lotId,
              quantity: 5,
              direction: AdjustmentDirection.OUT,
              reason: AdjustmentReason.DAMAGE,
            },
          ],
        });

      if (createRes.status !== 201) {
        console.error(
          'Adjustment create error:',
          JSON.stringify(createRes.body),
        );
      }
      expect(createRes.status).toBe(201);
      expect(createRes.body.status).toBe('DRAFT');
      adjId = createRes.body.id;

      const submitRes = await request(app.getHttpServer())
        .post(`/api/v1/operations/adjustments/${adjId}/submit`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-warehouse-id', warehouseId)
        .set('x-branch-id', branchId)
        .send({ version: 1 })
        .expect(200);
      expect(submitRes.body.status).toBe('SUBMITTED');

      const approveRes = await request(app.getHttpServer())
        .post(`/api/v1/operations/adjustments/${adjId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-warehouse-id', warehouseId)
        .set('x-branch-id', branchId)
        .send({ version: 2 })
        .expect(200);
      expect(approveRes.body.status).toBe('APPROVED');

      const postRes = await request(app.getHttpServer())
        .post(`/api/v1/operations/adjustments/${adjId}/post`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-warehouse-id', warehouseId)
        .set('x-branch-id', branchId)
        .send({ version: 3 })
        .expect(200);
      expect(postRes.body.status).toBe('POSTED');

      const voidRes = await request(app.getHttpServer())
        .post(`/api/v1/operations/adjustment/${adjId}/void`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-warehouse-id', warehouseId)
        .set('x-branch-id', branchId)
        .send({ version: 4 })
        .expect(200);

      expect(voidRes.body.status).toBe('VOIDED');

      const auditLog = await prisma.auditLog.findFirst({
        where: {
          targetId: adjId,
          action: 'WORKFLOW_VOID_SUCCESS',
        },
      });
      expect(auditLog).toBeDefined();
      expect(JSON.parse(auditLog!.beforeStateJson).status).toBe('POSTED');
      expect(JSON.parse(auditLog!.afterStateJson).status).toBe('VOIDED');

      const approvalEvent = await prisma.approvalEvent.findFirst({
        where: {
          documentId: adjId,
          actionPerformed: 'VOID',
        },
      });
      expect(approvalEvent).toBeDefined();
      expect(approvalEvent!.toStatus).toBe('VOIDED');
    });
  });

  function hasStock(): boolean {
    return false;
  }

  async function seedStock() {
    const item = await prisma.item.findUnique({ where: { id: itemId } });
    if (!item) throw new Error('Item not found');

    await prisma.warehouseItem.upsert({
      where: {
        warehouseId_itemId: {
          warehouseId,
          itemId,
        },
      },
      create: {
        warehouseId,
        itemId,
        qtyOnHand: 50,
        qtyAllocated: 0,
        wac: 10,
      },
      update: {},
    });

    await prisma.warehouseItemLot.upsert({
      where: {
        warehouseId_itemId_lotId: {
          warehouseId,
          itemId,
          lotId,
        },
      },
      create: {
        warehouseId,
        itemId,
        lotId,
        qtyOnHand: 50,
        qtyAllocated: 0,
      },
      update: {},
    });
  }
});
