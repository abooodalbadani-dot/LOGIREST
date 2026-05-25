/* eslint-disable */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { BcryptService } from '../src/auth/bcrypt.service';
import { EmailService } from '../src/modules/outbox/email.service';
import { OutboxCleanupJob } from '../src/modules/outbox/outbox-cleanup.job';
import { getQueueToken } from '@nestjs/bullmq';
import { randomUUID } from 'crypto';

// Stub out ioredis connection so BullMQ/Redis connections connect instantly and exit instantly
jest.mock('ioredis', () => {
  const EventEmitter = require('events');
  class MockRedis extends EventEmitter {
    constructor() {
      super();
      process.nextTick(() => {
        this.emit('connect');
        this.emit('ready');
      });
      return new Proxy(this, {
        get: (target, prop) => {
          if (prop in target) {
            const val = (target as any)[prop];
            return typeof val === 'function' ? val.bind(target) : val;
          }
          if (typeof prop === 'string') {
            return (...args: any[]) => Promise.resolve([]);
          }
          return undefined;
        },
      });
    }
    options = {};
    status = 'ready';
    multi() { return this; }
    exec() { return Promise.resolve([]); }
    ping() { return Promise.resolve('PONG'); }
    quit() {
      this.status = 'end';
      process.nextTick(() => {
        this.emit('end');
        this.emit('close');
      });
      return Promise.resolve('OK');
    }
    disconnect() {
      this.status = 'end';
      process.nextTick(() => {
        this.emit('end');
        this.emit('close');
      });
    }
    duplicate() {
      return new MockRedis();
    }
    defineCommand(name: string, definition: any) {
      // No-op. The Proxy handles invocations of dynamically defined commands.
    }
    info() {
      return Promise.resolve('# Server\r\nredis_version:7.2.4\r\n');
    }
  }
  // Assign ES default and named exports to the constructor itself so both CJS and ESM imports work
  (MockRedis as any).default = MockRedis;
  (MockRedis as any).Redis = MockRedis;
  return MockRedis;
});

describe('Outbox Notification Queue (e2e)', () => {
  jest.setTimeout(300000);
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let bcrypt: BcryptService;
  let cleanupJob: OutboxCleanupJob;

  let procOfficerToken: string;
  let procOfficerId: string;
  let adminToken: string;
  let adminId: string;
  let branchId: string;
  let warehouseId: string;
  let departmentId: string;
  let itemId: string;
  let categoryId: string;
  let uomId: string;

  const mockEmailService = {
    sendEmail: jest.fn().mockResolvedValue({ messageId: 'mock-id' }),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(EmailService)
      .useValue(mockEmailService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );

    await app.init();

    // Mock Queue.add using Jest spy on the real instance to bypass Redis writes
    const queue = app.get(getQueueToken('outbox'));
    jest.spyOn(queue, 'add').mockResolvedValue({ id: 'mock-job-id' } as any);

    prisma = app.get(PrismaService);
    bcrypt = app.get(BcryptService);
    cleanupJob = app.get(OutboxCleanupJob);

    // Database connection warmup/retry loop to handle hosted database cold starts
    let connected = false;
    for (let i = 0; i < 5; i++) {
      try {
        await prisma.$queryRaw`SELECT 1`;
        connected = true;
        break;
      } catch (err) {
        console.log(`Database warmup attempt ${i + 1} failed. Retrying...`);
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }
    if (!connected) {
      throw new Error("Could not connect to database after 5 warmup attempts");
    }

    // Create unique test metadata to avoid E2E conflicts
    const suffix = `outbox-e2e-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

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

    const department = await prisma.department.create({
      data: { name: `Department ${suffix}`, branchId },
    });
    departmentId = department.id;

    const email = `${suffix}@logirest.com`;
    const passwordHash = await bcrypt.hash('Password123!');
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
      .send({ email, password: 'Password123!' });
    procOfficerToken = loginRes.body.accessToken;

    const adminEmail = `admin-${suffix}@logirest.com`;
    const adminUser = await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        name: `Admin ${suffix}`,
        role: 'ADMIN',
        isActive: true,
      },
    });
    adminId = adminUser.id;

    await prisma.userWarehouseScope.create({
      data: { userId: adminId, warehouseId },
    });

    const adminLoginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: adminEmail, password: 'Password123!' });
    adminToken = adminLoginRes.body.accessToken;
  });

  afterAll(async () => {
    if (prisma) {
      // Stage 1: Clear all dependent child tables sequentially to avoid connection pool starvation deadlocks
      await prisma.outboxEvent.deleteMany({ where: { eventType: { in: ['PR_SUBMITTED', 'ISSUE_POSTED', 'TEST_CLEANUP'] } } });
      await prisma.userWarehouseScope.deleteMany({ where: { userId: { in: [procOfficerId, adminId] } } });
      await prisma.pRLine.deleteMany({ where: { prId: { not: '' } } });
      await prisma.inventoryIssueLine.deleteMany({ where: { itemId } });
      await prisma.notificationLog.deleteMany({ where: { warehouseId } });
      await prisma.approvalEvent.deleteMany({ where: { userId: { in: [procOfficerId, adminId] } } });
      await prisma.refreshToken.deleteMany({ where: { userId: { in: [procOfficerId, adminId] } } });
      await prisma.auditLog.deleteMany({ where: { userId: { in: [procOfficerId, adminId] } } });
      await prisma.warehouseLock.deleteMany({ where: { lockedById: { in: [procOfficerId, adminId] } } });
      await prisma.stocktakeCount.deleteMany({ where: { OR: [{ countedById: { in: [procOfficerId, adminId] } }, { itemId }] } });
      await prisma.stocktakeSnapshot.deleteMany({ where: { itemId } });
      await prisma.stockLedger.deleteMany({ where: { itemId } });
      await prisma.costLedger.deleteMany({ where: { itemId } });
      await prisma.lotAllocation.deleteMany({ where: { lot: { itemId } } });
      await prisma.warehouseItemLot.deleteMany({ where: { itemId } });
      await prisma.warehouseItem.deleteMany({ where: { itemId } });
      await prisma.lot.deleteMany({ where: { itemId } });

      // Stage 2: Clear transactional documents sequentially
      await prisma.purchaseRequest.deleteMany({ where: { branchId } });
      await prisma.inventoryIssue.deleteMany({ where: { warehouseId } });
      await prisma.item.deleteMany({ where: { categoryId } });
      await prisma.documentSequence.deleteMany({ where: { branchId } });

      // Stage 3: Clear master data sequentially
      await prisma.unitOfMeasure.deleteMany({ where: { id: uomId } });
      await prisma.category.deleteMany({ where: { id: categoryId } });
      await prisma.department.deleteMany({ where: { branchId } });
      await prisma.warehouse.deleteMany({ where: { id: warehouseId } });

      // Stage 4: Clear root records sequentially
      await prisma.branch.deleteMany({ where: { id: branchId } });
      await prisma.user.deleteMany({ where: { id: { in: [procOfficerId, adminId] } } });

      await prisma.$disconnect();
    }
    app.close().catch(err => console.error('Error closing app:', err));
  });

  it('should write an OutboxEvent on PR submission transition', async () => {
    // 1. Create Purchase Request (DRAFT)
    const createRes = await request(app.getHttpServer())
      .post('/api/v1/purchase-requests')
      .set('Authorization', `Bearer ${procOfficerToken}`)
      .set('x-warehouse-id', warehouseId)
      .set('x-branch-id', branchId)
      .set('x-idempotency-key', randomUUID())
      .send({
        branchId,
        warehouseId,
        lines: [{ itemId, quantity: 20 }],
      })
      .expect(201);

    const prId = createRes.body.id;

    // 2. Submit the PR (DRAFT -> SUBMITTED)
    // This executes transactionally and writes a PR_SUBMITTED event via WorkflowService + OutboxService
    await request(app.getHttpServer())
      .post(`/api/v1/purchase-requests/${prId}/submit`)
      .set('Authorization', `Bearer ${procOfficerToken}`)
      .set('x-warehouse-id', warehouseId)
      .set('x-branch-id', branchId)
      .send({ comments: 'Outbox verification', version: 1 })
      .expect(200);

    // 3. Verify OutboxEvent record was inserted
    const outboxEvents = await prisma.outboxEvent.findMany({
      where: {
        eventType: 'PR_SUBMITTED',
      },
    });

    expect(outboxEvents.length).toBeGreaterThanOrEqual(1);

    const matchEvent = outboxEvents.find((e) => {
      const payloadObj = e.payload as any;
      return payloadObj.id === prId;
    });

    expect(matchEvent).toBeDefined();
    expect(matchEvent?.status).toBe('PENDING');
    expect(matchEvent?.eventType).toBe('PR_SUBMITTED');
  });

  it('should successfully run OutboxCleanupJob to purge succeeded logs older than 7 days', async () => {
    const expiredDate = new Date();
    expiredDate.setDate(expiredDate.getDate() - 10); // 10 days ago

    // Insert an expired outbox event record that is already SUCCEEDED
    const expiredEvent = await prisma.outboxEvent.create({
      data: {
        eventType: 'TEST_CLEANUP',
        payload: { warehouseId },
        status: 'SUCCEEDED',
        processedAt: expiredDate,
        expiresAt: new Date(),
      },
    });

    // Insert a new outbox event record that is SUCCEEDED but not older than 7 days
    const recentEvent = await prisma.outboxEvent.create({
      data: {
        eventType: 'TEST_CLEANUP',
        payload: { warehouseId },
        status: 'SUCCEEDED',
        processedAt: new Date(),
        expiresAt: new Date(),
      },
    });

    // Execute outbox logs cleanup job
    await cleanupJob.purgeExpiredOutboxLogs();

    // Verify expired event is deleted
    const dbExpired = await prisma.outboxEvent.findUnique({
      where: { id: expiredEvent.id },
    });
    expect(dbExpired).toBeNull();

    // Verify recent event is still preserved
    const dbRecent = await prisma.outboxEvent.findUnique({
      where: { id: recentEvent.id },
    });
    expect(dbRecent).not.toBeNull();

    // Cleanup recent test log
    await prisma.outboxEvent.delete({
      where: { id: recentEvent.id },
    });
  });

  it('should write an OutboxEvent and NotificationLogs on Inventory Issue post transition', async () => {
    // 1. Seed stock in the warehouse for the item
    await prisma.warehouseItem.upsert({
      where: {
        warehouseId_itemId: { warehouseId, itemId },
      },
      create: {
        warehouseId,
        itemId,
        qtyOnHand: 10.0,
        qtyAllocated: 0,
        wac: 5.0,
      },
      update: {
        qtyOnHand: 10.0,
      },
    });

    // 2. Create Inventory Issue (DRAFT)
    const createRes = await request(app.getHttpServer())
      .post('/api/v1/operations/issues')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-warehouse-id', warehouseId)
      .set('x-branch-id', branchId)
      .set('x-idempotency-key', randomUUID())
      .send({
        departmentId,
        lines: [{ itemId, quantity: 4 }],
      })
      .expect(201);

    const issueId = createRes.body.id;
    expect(createRes.body.status).toBe('DRAFT');

    // 3. Submit the Inventory Issue (DRAFT -> SUBMITTED)
    await request(app.getHttpServer())
      .post(`/api/v1/operations/issues/${issueId}/submit`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-warehouse-id', warehouseId)
      .set('x-branch-id', branchId)
      .send({ comments: 'Submit Issue E2E', version: 1 })
      .expect(200);

    // 4. Post the Inventory Issue (SUBMITTED -> POSTED)
    await request(app.getHttpServer())
      .post(`/api/v1/operations/issues/${issueId}/post`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-warehouse-id', warehouseId)
      .set('x-branch-id', branchId)
      .send({ version: 2 })
      .expect(200);

    // 5. Verify OutboxEvent of type ISSUE_POSTED exists
    const outboxEvents = await prisma.outboxEvent.findMany({
      where: { eventType: 'ISSUE_POSTED' },
    });
    expect(outboxEvents.length).toBeGreaterThanOrEqual(1);

    const matchEvent = outboxEvents.find((e) => {
      const payloadObj = e.payload as any;
      return payloadObj.issueId === issueId;
    });
    expect(matchEvent).toBeDefined();
    expect(matchEvent?.status).toBe('PENDING');

    // 6. Verify distinct NotificationLog records are written for ADMIN and INV_MGR roles
    const notificationLogs = await prisma.notificationLog.findMany({
      where: {
        documentId: issueId,
        documentType: 'INVENTORY_ISSUE',
      },
    });
    expect(notificationLogs.length).toBe(2);

    const adminNotif = notificationLogs.find((n) => n.targetRole === 'ADMIN');
    const mgrNotif = notificationLogs.find((n) => n.targetRole === 'INV_MGR');
    expect(adminNotif).toBeDefined();
    expect(mgrNotif).toBeDefined();
    expect(adminNotif?.warehouseId).toBe(warehouseId);
    expect(adminNotif?.message).toContain('Stock Issue Posted');
    expect(adminNotif?.message).toContain('تم ترحيل صرف مخزون');
    expect(mgrNotif?.warehouseId).toBe(warehouseId);
    expect(mgrNotif?.message).toContain('Stock Issue Posted');
    expect(mgrNotif?.message).toContain('تم ترحيل صرف مخزون');
  });
});
