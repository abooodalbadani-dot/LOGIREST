import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { BcryptService } from '../src/auth/bcrypt.service';
import { LockCleanupJob } from '../src/jobs/lock-cleanup.job';
import { randomUUID } from 'crypto';

describe('Stocktake Lock Lifecycle E2E', () => {
  jest.setTimeout(120000);
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let bcrypt: BcryptService;
  let lockCleanupJob: LockCleanupJob;

  let adminToken: string;
  let adminId: string;

  let branchId: string;
  let warehouseId: string;
  let supplierId: string;
  let currencyId: string;
  let categoryId: string;
  let uomId: string;
  let itemId: string;

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
    lockCleanupJob = app.get(LockCleanupJob);

    const suffix = `st-lock-e2e-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Create branch & warehouse
    const branch = await prisma.branch.create({
      data: { name: `Branch ${suffix}`, code: `BR-${suffix}` },
    });
    branchId = branch.id;

    const warehouse = await prisma.warehouse.create({
      data: { name: `Warehouse ${suffix}`, code: `WH-${suffix}`, branchId },
    });
    warehouseId = warehouse.id;

    // Create supplier, currency, category, uom, item
    const supplier = await prisma.supplier.create({
      data: { name: `Supplier ${suffix}`, code: `SUP-${suffix}` },
    });
    supplierId = supplier.id;

    const currency = await prisma.currency.create({
      data: { name: `Currency ${suffix}`, code: `CUR-${suffix}`, isBase: true },
    });
    currencyId = currency.id;

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

    // Create Admin User
    const adminEmail = `admin-${suffix}@logirest.com`;
    const passwordHash = await bcrypt.hash('Password123!');
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

    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: adminEmail, password: 'Password123!' });
    adminToken = loginRes.body.token || loginRes.body.accessToken;
  });

  afterAll(async () => {
    if (prisma) {
      await Promise.all([
        prisma.userWarehouseScope.deleteMany({ where: { userId: adminId } }),
        prisma.approvalEvent.deleteMany({ where: { userId: adminId } }),
        prisma.refreshToken.deleteMany({ where: { userId: adminId } }),
        prisma.auditLog.deleteMany({ where: { userId: adminId } }),
        prisma.warehouseLock.deleteMany({ where: { warehouseId } }),
        prisma.stocktakeCount.deleteMany({ where: { itemId } }),
        prisma.stocktakeSnapshot.deleteMany({ where: { itemId } }),
        prisma.stockLedger.deleteMany({ where: { itemId } }),
        prisma.costLedger.deleteMany({ where: { itemId } }),
        prisma.lotAllocation.deleteMany({ where: { lot: { itemId } } }),
        prisma.gRNLine.deleteMany({ where: { itemId } }),
        prisma.pOLine.deleteMany({ where: { itemId } }),
      ]);

      await prisma.goodsReceivedNote.deleteMany({ where: { warehouseId } });
      await prisma.purchaseOrder.deleteMany({ where: { supplierId } });
      await prisma.stocktakeSession.deleteMany({ where: { warehouseId } });

      await prisma.item.deleteMany({ where: { categoryId } });
      await prisma.unitOfMeasure.delete({ where: { id: uomId } });
      await prisma.category.delete({ where: { id: categoryId } });
      await prisma.supplier.delete({ where: { id: supplierId } });
      await prisma.currency.delete({ where: { id: currencyId } });
      await prisma.warehouse.delete({ where: { id: warehouseId } });
      await prisma.documentSequence.deleteMany({ where: { branchId } });
      await prisma.branch.delete({ where: { id: branchId } });
      await prisma.user.delete({ where: { id: adminId } });

      await prisma.$disconnect();
    }
    await app.close();
  });

  it('should verify the complete lock -> expire -> unlock cycle', async () => {
    // 1. Setup a PO and a draft GRN
    const po = await prisma.purchaseOrder.create({
      data: {
        poNumber: `PO-LOCK-${Date.now()}`,
        status: 'APPROVED',
        supplierId,
        currencyId,
        lines: {
          create: [{ itemId, quantity: 10, unitPrice: 5.5 }],
        },
      },
    });

    const grn = await prisma.goodsReceivedNote.create({
      data: {
        grnNumber: `GRN-LOCK-${Date.now()}`,
        poId: po.id,
        warehouseId,
        status: 'RECEIVED',
        lines: {
          create: [{ itemId, quantityReceived: 10, unitPrice: 5.5 }],
        },
      },
    });

    // 2. Create Stocktake Session
    const createSessionRes = await request(app.getHttpServer())
      .post('/api/v1/stocktake/sessions')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-warehouse-id', warehouseId)
      .set('x-branch-id', branchId)
      .set('x-idempotency-key', randomUUID())
      .send({ warehouseId })
      .expect(201);

    const sessionId = createSessionRes.body.id;
    expect(createSessionRes.body.status).toBe('DRAFT');

    // 3. Start Stocktake Session (Locks the warehouse)
    await request(app.getHttpServer())
      .post(`/api/v1/stocktake/sessions/${sessionId}/start`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-warehouse-id', warehouseId)
      .set('x-branch-id', branchId)
      .send({ version: 1 })
      .expect(200);

    // 4. Verify warehouse is locked in DB
    const warehouseLocked = await prisma.warehouse.findUnique({
      where: { id: warehouseId },
    });
    expect(warehouseLocked?.isLocked).toBe(true);

    // 5. Try to Post GRN (Should block with 423 Locked)
    const grnPostBlockedRes = await request(app.getHttpServer())
      .post(`/api/v1/procurement/goods-received/${grn.id}/post`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-warehouse-id', warehouseId)
      .set('x-branch-id', branchId)
      .send({ version: 1 })
      .expect(423);

    expect(grnPostBlockedRes.body.message).toContain(
      'Warehouse is locked. Physical inventory mutations are blocked',
    );

    // 6. Manipulate Lock Expiry
    await prisma.warehouseLock.updateMany({
      where: { warehouseId },
      data: { expiresAt: new Date(Date.now() - 10000) }, // 10 seconds in the past
    });

    // 7. Run cleanup job to release lock
    await lockCleanupJob.cleanupExpiredLocks();

    // 8. Verify warehouse is unlocked
    const warehouseUnlocked = await prisma.warehouse.findUnique({
      where: { id: warehouseId },
    });
    expect(warehouseUnlocked?.isLocked).toBe(false);

    // 9. Post GRN should now succeed (returns 200 OK)
    const grnPostSucceedRes = await request(app.getHttpServer())
      .post(`/api/v1/procurement/goods-received/${grn.id}/post`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-warehouse-id', warehouseId)
      .set('x-branch-id', branchId)
      .send({ version: 1 })
      .expect(200);

    expect(grnPostSucceedRes.body.status).toBe('POSTED');
  });
});
