import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { BcryptService } from '../src/auth/bcrypt.service';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';

describe('Missing Flows E2E', () => {
  jest.setTimeout(120000);
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let bcrypt: BcryptService;

  let adminToken: string;
  let adminId: string;

  let branchId: string;
  let warehouseId: string;
  let departmentId: string;
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

    const suffix = `miss-flow-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Create branch, warehouse, department
    const branch = await prisma.branch.create({
      data: { name: `Branch ${suffix}`, code: `BR-${suffix}` },
    });
    branchId = branch.id;

    const warehouse = await prisma.warehouse.create({
      data: { name: `Warehouse ${suffix}`, code: `WH-${suffix}`, branchId },
    });
    warehouseId = warehouse.id;

    const department = await prisma.department.create({
      data: { name: `Department ${suffix}`, branchId },
    });
    departmentId = department.id;

    const category = await prisma.category.create({
      data: { name: `Category ${suffix}`, code: `CAT-${suffix}` },
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

    const jwtService = app.get(JwtService);
    adminToken = jwtService.sign({
      sub: adminId,
      email: adminEmail,
      role: 'ADMIN',
    });
  });

  afterAll(async () => {
    if (prisma) {
      const safeDelete = async (fn: () => Promise<unknown>) => {
        try {
          await fn();
        } catch (e) {
          // ignore
        }
      };

      await safeDelete(() =>
        prisma.userWarehouseScope.deleteMany({ where: { userId: adminId } }),
      );
      await safeDelete(() =>
        prisma.approvalEvent.deleteMany({ where: { userId: adminId } }),
      );
      await safeDelete(() =>
        prisma.refreshToken.deleteMany({ where: { userId: adminId } }),
      );
      await safeDelete(() =>
        prisma.auditLog.deleteMany({ where: { userId: adminId } }),
      );
      await safeDelete(() =>
        prisma.warehouseLock.deleteMany({ where: { warehouseId } }),
      );
      await safeDelete(() =>
        prisma.stocktakeCount.deleteMany({ where: { itemId } }),
      );
      await safeDelete(() =>
        prisma.stocktakeSnapshot.deleteMany({ where: { itemId } }),
      );

      // Disable triggers to clean up ledger tables
      try {
        await prisma.$executeRawUnsafe(
          `ALTER TABLE stock_ledger DISABLE TRIGGER stock_ledger_immutable;`,
        );
        await prisma.stockLedger.deleteMany({ where: { itemId } });
      } catch (e) {
        console.warn('Failed to delete stockLedger:', e);
      } finally {
        try {
          await prisma.$executeRawUnsafe(
            `ALTER TABLE stock_ledger ENABLE TRIGGER stock_ledger_immutable;`,
          );
        } catch (e) {
          // ignore
        }
      }

      try {
        await prisma.$executeRawUnsafe(
          `ALTER TABLE cost_ledger DISABLE TRIGGER cost_ledger_immutable;`,
        );
        await prisma.costLedger.deleteMany({ where: { itemId } });
      } catch (e) {
        console.warn('Failed to delete costLedger:', e);
      } finally {
        try {
          await prisma.$executeRawUnsafe(
            `ALTER TABLE cost_ledger ENABLE TRIGGER cost_ledger_immutable;`,
          );
        } catch (e) {
          // ignore
        }
      }

      await safeDelete(() =>
        prisma.lotAllocation.deleteMany({ where: { lot: { itemId } } }),
      );
      await safeDelete(() =>
        prisma.inventoryIssueLine.deleteMany({ where: { itemId } }),
      );
      await safeDelete(() =>
        prisma.kitchenRequestItem.deleteMany({ where: { itemId } }),
      );

      await safeDelete(() =>
        prisma.kitchenRequest.deleteMany({ where: { warehouseId } }),
      );
      await safeDelete(() =>
        prisma.inventoryIssue.deleteMany({ where: { warehouseId } }),
      );
      await safeDelete(() =>
        prisma.stocktakeSession.deleteMany({ where: { warehouseId } }),
      );

      await safeDelete(() =>
        prisma.warehouseItemLot.deleteMany({ where: { itemId } }),
      );
      await safeDelete(() =>
        prisma.warehouseItem.deleteMany({ where: { itemId } }),
      );
      await safeDelete(() => prisma.item.deleteMany({ where: { categoryId } }));
      await safeDelete(() =>
        prisma.unitOfMeasure.delete({ where: { id: uomId } }),
      );
      await safeDelete(() =>
        prisma.category.delete({ where: { id: categoryId } }),
      );
      await safeDelete(() =>
        prisma.department.delete({ where: { id: departmentId } }),
      );
      await safeDelete(() =>
        prisma.warehouse.delete({ where: { id: warehouseId } }),
      );
      await safeDelete(() =>
        prisma.documentSequence.deleteMany({ where: { branchId } }),
      );
      await safeDelete(() => prisma.branch.delete({ where: { id: branchId } }));
      await safeDelete(() => prisma.user.delete({ where: { id: adminId } }));

      await prisma.$disconnect();
    }
    await app.close();
  });

  describe('Stocktake Post Flow', () => {
    it('should complete the entire stocktake lifecycle and update ledger', async () => {
      // 1. Setup initial warehouse item balance (qtyOnHand = 10)
      await prisma.warehouseItem.upsert({
        where: { warehouseId_itemId: { warehouseId, itemId } },
        create: { warehouseId, itemId, qtyOnHand: 10, qtyAllocated: 0 },
        update: { qtyOnHand: 10 },
      });

      // 2. Create Stocktake Session
      const createRes = await request(app.getHttpServer())
        .post('/api/v1/stocktake/sessions')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-warehouse-id', warehouseId)
        .set('x-branch-id', branchId)
        .set('x-idempotency-key', randomUUID())
        .send({ warehouseId });

      if (createRes.status !== 201) {
        console.log('createRes error:', createRes.status, createRes.body);
      }

      expect(createRes.status).toBe(201);

      const sessionId = createRes.body.id;
      expect(createRes.body.status).toBe('DRAFT');

      // 3. Start Stocktake Session (Locks warehouse)
      const startRes = await request(app.getHttpServer())
        .post(`/api/v1/stocktake/sessions/${sessionId}/start`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-warehouse-id', warehouseId)
        .set('x-branch-id', branchId)
        .send({ version: 1 })
        .expect(200);

      expect(startRes.body.status).toBe('STARTED');

      // Verify warehouse is locked
      const whLocked = await prisma.warehouse.findUnique({
        where: { id: warehouseId },
      });
      expect(whLocked?.isLocked).toBe(true);

      // 4. Count Stocktake Session (set count to 15, meaning variance of +5)
      const countRes = await request(app.getHttpServer())
        .post(`/api/v1/stocktake/sessions/${sessionId}/count`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-warehouse-id', warehouseId)
        .set('x-branch-id', branchId)
        .send({
          counts: [{ itemId, qtyCounted: 15 }],
        })
        .expect(200);

      expect(countRes.body.status).toBe('COUNTING');

      // 5. Submit Session
      const submitRes = await request(app.getHttpServer())
        .post(`/api/v1/stocktake/sessions/${sessionId}/submit`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-warehouse-id', warehouseId)
        .set('x-branch-id', branchId)
        .send({ version: countRes.body.version })
        .expect(200);

      expect(submitRes.body.status).toBe('REVIEW');

      // 6. Approve Session
      const approveRes = await request(app.getHttpServer())
        .post(`/api/v1/stocktake/sessions/${sessionId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-warehouse-id', warehouseId)
        .set('x-branch-id', branchId)
        .send({ version: submitRes.body.version, comments: 'Approve variance' })
        .expect(200);

      expect(approveRes.body.status).toBe('APPROVED');

      // 7. Post Session
      const postRes = await request(app.getHttpServer())
        .post(`/api/v1/stocktake/sessions/${sessionId}/post`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-warehouse-id', warehouseId)
        .set('x-branch-id', branchId)
        .send({ version: approveRes.body.version })
        .expect(200);

      expect(postRes.body.status).toBe('POSTED');

      // Verify ledger side effect
      const ledgerEntry = await prisma.stockLedger.findFirst({
        where: { documentId: sessionId, itemId },
      });
      expect(ledgerEntry).toBeDefined();
      expect(Number(ledgerEntry?.quantity)).toBe(5); // variance = 15 - 10 = 5

      // Verify WarehouseItem balance is updated to the counted qty
      const whItem = await prisma.warehouseItem.findUnique({
        where: { warehouseId_itemId: { warehouseId, itemId } },
      });
      expect(Number(whItem?.qtyOnHand)).toBe(15);

      // Verify warehouse is unlocked
      const whUnlocked = await prisma.warehouse.findUnique({
        where: { id: warehouseId },
      });
      expect(whUnlocked?.isLocked).toBe(false);
    });
  });

  describe('Kitchen Request -> Issue Flow', () => {
    it('should complete kitchen request fulfillment and issue stock atomically', async () => {
      // 1. Setup initial warehouse item balance (qtyOnHand = 50)
      await prisma.warehouseItem.upsert({
        where: { warehouseId_itemId: { warehouseId, itemId } },
        create: { warehouseId, itemId, qtyOnHand: 50, qtyAllocated: 0 },
        update: { qtyOnHand: 50 },
      });

      // 2. Create Kitchen Request
      const createRes = await request(app.getHttpServer())
        .post('/api/v1/operations/kitchen-requests')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-warehouse-id', warehouseId)
        .set('x-branch-id', branchId)
        .set('x-idempotency-key', randomUUID())
        .send({
          departmentId,
          warehouseId,
          items: [{ itemId, quantityRequested: 10 }],
        });

      if (createRes.status !== 201) {
        console.log('createRes KR error:', createRes.status, createRes.body);
      }

      expect(createRes.status).toBe(201);

      const krId = createRes.body.data.id;
      expect(createRes.body.data.status).toBe('DRAFT');

      // 3. Submit Kitchen Request
      const submitRes = await request(app.getHttpServer())
        .post(`/api/v1/operations/kitchen-requests/${krId}/submit`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-warehouse-id', warehouseId)
        .set('x-branch-id', branchId)
        .send({ version: 1 })
        .expect(200);

      expect(submitRes.body.data.status).toBe('SUBMITTED');

      // 4. Fulfill Kitchen Request (this automatically creates and posts the issue, and decrements stock)
      const fulfillRes = await request(app.getHttpServer())
        .post(`/api/v1/operations/kitchen-requests/${krId}/fulfill`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-warehouse-id', warehouseId)
        .set('x-branch-id', branchId)
        .send({
          version: 2,
          fulfillments: [{ itemId, fulfilledQty: 10 }],
        })
        .expect(200);

      expect(fulfillRes.body.data.status).toBe('FULFILLED');

      // Verify that the Kitchen Request is linked to a posted Inventory Issue
      const dbKr = await prisma.kitchenRequest.findUnique({
        where: { id: krId },
        include: { inventoryIssue: true },
      });
      expect(dbKr?.issueId).toBeDefined();
      expect(dbKr?.inventoryIssue?.status).toBe('POSTED');

      // Verify stock ledger reduction side effect
      const ledgerEntry = await prisma.stockLedger.findFirst({
        where: { documentId: dbKr?.issueId as string, itemId },
      });
      expect(ledgerEntry).toBeDefined();
      expect(Number(ledgerEntry?.quantity)).toBe(-10);

      // Verify WarehouseItem balance is reduced: 50 - 10 = 40
      const whItem = await prisma.warehouseItem.findUnique({
        where: { warehouseId_itemId: { warehouseId, itemId } },
      });
      expect(Number(whItem?.qtyOnHand)).toBe(40);
    });
  });

  describe('Adjustment Workflow & Void Flow', () => {
    it('should complete draft -> submit -> approve -> post -> void adjustment cycle', async () => {
      // 1. Setup initial warehouse item balance (qtyOnHand = 10)
      await prisma.warehouseItem.upsert({
        where: { warehouseId_itemId: { warehouseId, itemId } },
        create: { warehouseId, itemId, qtyOnHand: 10, qtyAllocated: 0 },
        update: { qtyOnHand: 10 },
      });

      // 2. Create Adjustment (INCREASE of +5)
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
              quantity: 5,
              direction: 'IN',
              reason: 'CORRECTION',
              unitCost: 10.0,
            },
          ],
        })
        .expect(201);

      const adjId = createRes.body.id;
      expect(createRes.body.status).toBe('DRAFT');

      // 3. Submit Adjustment
      const submitRes = await request(app.getHttpServer())
        .post(`/api/v1/operations/adjustments/${adjId}/submit`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-warehouse-id', warehouseId)
        .set('x-branch-id', branchId)
        .send({ comments: 'Submit adjustment', version: 1 })
        .expect(200);

      expect(submitRes.body.status).toBe('SUBMITTED');

      // 4. Approve Adjustment
      const approveRes = await request(app.getHttpServer())
        .post(`/api/v1/operations/adjustments/${adjId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-warehouse-id', warehouseId)
        .set('x-branch-id', branchId)
        .send({ comments: 'Approve adjustment', version: 2 })
        .expect(200);

      expect(approveRes.body.status).toBe('APPROVED');

      // 5. Post Adjustment (executes stock ledger changes)
      const postRes = await request(app.getHttpServer())
        .post(`/api/v1/operations/adjustments/${adjId}/post`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-warehouse-id', warehouseId)
        .set('x-branch-id', branchId)
        .send({ version: 3 })
        .expect(200);

      expect(postRes.body.status).toBe('POSTED');

      // Verify stock ledger change
      const ledgerEntry = await prisma.stockLedger.findFirst({
        where: { documentId: adjId, itemId },
      });
      expect(ledgerEntry).toBeDefined();
      expect(Number(ledgerEntry?.quantity)).toBe(5);

      // Verify WarehouseItem balance is updated: 10 + 5 = 15
      let whItem = await prisma.warehouseItem.findUnique({
        where: { warehouseId_itemId: { warehouseId, itemId } },
      });
      expect(Number(whItem?.qtyOnHand)).toBe(15);

      // 6. Void Adjustment (requires ADMIN or INV_MGR)
      await request(app.getHttpServer())
        .post(`/api/v1/operations/adjustment/${adjId}/void`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-warehouse-id', warehouseId)
        .set('x-branch-id', branchId)
        .send({ version: 4 })
        .expect(200);

      // Verify adjustment status is updated to VOIDED
      const dbAdj = await prisma.adjustment.findUnique({
        where: { id: adjId },
      });
      expect(dbAdj?.status).toBe('VOIDED');

      // Verify stock ledger restoration (new entry with opposite quantity: -5)
      const voidLedgerEntry = await prisma.stockLedger.findFirst({
        where: { documentType: 'ADJUSTMENT', documentId: adjId, quantity: -5 },
      });
      expect(voidLedgerEntry).toBeDefined();

      // Verify WarehouseItem balance is restored back to 10
      whItem = await prisma.warehouseItem.findUnique({
        where: { warehouseId_itemId: { warehouseId, itemId } },
      });
      expect(Number(whItem?.qtyOnHand)).toBe(10);
    });
  });

  describe('GRN Void Flow', () => {
    it('should complete grn creation -> posting -> void cycle and restore WAC', async () => {
      // Clear any ledger entries for this itemId from previous tests to prevent interference
      try {
        await prisma.$executeRawUnsafe(
          `ALTER TABLE stock_ledger DISABLE TRIGGER stock_ledger_immutable;`,
        );
        await prisma.stockLedger.deleteMany({ where: { itemId } });
      } catch (e) {
        // ignore
      } finally {
        try {
          await prisma.$executeRawUnsafe(
            `ALTER TABLE stock_ledger ENABLE TRIGGER stock_ledger_immutable;`,
          );
        } catch (e) {
          // ignore
        }
      }

      try {
        await prisma.$executeRawUnsafe(
          `ALTER TABLE cost_ledger DISABLE TRIGGER cost_ledger_immutable;`,
        );
        await prisma.costLedger.deleteMany({ where: { itemId } });
      } catch (e) {
        // ignore
      } finally {
        try {
          await prisma.$executeRawUnsafe(
            `ALTER TABLE cost_ledger ENABLE TRIGGER cost_ledger_immutable;`,
          );
        } catch (e) {
          // ignore
        }
      }

      // Setup initial WAC and Stock (qty=10, wac=10.0)
      await prisma.warehouseItem.upsert({
        where: { warehouseId_itemId: { warehouseId, itemId } },
        create: {
          warehouseId,
          itemId,
          qtyOnHand: 10,
          qtyAllocated: 0,
          wac: 10.0,
        },
        update: { qtyOnHand: 10, wac: 10.0 },
      });

      // Seed a previous CostLedger entry so the restore WAC logic has a history record to fetch
      await prisma.costLedger.create({
        data: {
          warehouseId,
          itemId,
          quantity: 10,
          unitPrice: 10.0,
          newWac: 10.0,
          documentId: 'initial-setup-uuid',
          documentType: 'GOODS_RECEIVED_NOTE',
          postedAt: new Date(Date.now() - 3600000), // 1 hour ago
          idempotencyKey: `cost-seed-${randomUUID()}`,
        },
      });

      // Create a Purchase Order (needed for GRN)
      const supplier = await prisma.supplier.create({
        data: {
          name: `Supplier VOID-${Date.now()}`,
          code: `SUP-VOID-${Date.now()}`,
        },
      });
      const currency = await prisma.currency.create({
        data: {
          name: `Currency VOID-${Date.now()}`,
          code: `CUR-VOID-${Date.now()}`,
          isBase: true,
        },
      });

      const po = await prisma.purchaseOrder.create({
        data: {
          poNumber: `PO-VOID-${Date.now()}`,
          supplierId: supplier.id,
          currencyId: currency.id,
          status: 'APPROVED',
          lines: {
            create: [{ itemId, quantity: 100, unitPrice: 20.0 }],
          },
        },
      });

      // Create a GRN
      const createRes = await request(app.getHttpServer())
        .post('/api/v1/procurement/grns')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-warehouse-id', warehouseId)
        .set('x-branch-id', branchId)
        .set('x-idempotency-key', randomUUID())
        .send({
          poId: po.id,
          warehouseId,
          lines: [{ itemId, receivedQty: 10, unitCostForeign: 20.0 }],
        })
        .expect(201);

      const grnId = createRes.body.data.id;
      expect(createRes.body.data.status).toBe('DRAFT');

      // Update status to RECEIVED so it can be posted
      await prisma.goodsReceivedNote.update({
        where: { id: grnId },
        data: { status: 'RECEIVED' },
      });

      // Post the GRN (to execute WAC and stock ledger changes)
      const postRes = await request(app.getHttpServer())
        .post(`/api/v1/procurement/grns/${grnId}/post`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-warehouse-id', warehouseId)
        .set('x-branch-id', branchId)
        .send({ version: 1 })
        .expect(200);

      expect(postRes.body.data.status).toBe('POSTED');

      // Verify WAC is updated: (10*10 + 10*20)/(10+10) = 15.0
      let whItem = await prisma.warehouseItem.findUnique({
        where: { warehouseId_itemId: { warehouseId, itemId } },
      });
      expect(Number(whItem?.wac)).toBe(15.0);
      expect(Number(whItem?.qtyOnHand)).toBe(20);

      // Now, void the GRN document (which should restore WAC back to 10.0 and stock back to 10)
      const voidRes = await request(app.getHttpServer())
        .post(`/api/v1/operations/grn/${grnId}/void`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-warehouse-id', warehouseId)
        .set('x-branch-id', branchId)
        .send({ version: 2 });

      expect(voidRes.status).toBe(200);

      // Verify GRN status is VOIDED
      const dbGrn = await prisma.goodsReceivedNote.findUnique({
        where: { id: grnId },
      });
      expect(dbGrn?.status).toBe('VOIDED');

      // Verify WarehouseItem balance and WAC are restored back to 10 and 10.0 respectively
      whItem = await prisma.warehouseItem.findUnique({
        where: { warehouseId_itemId: { warehouseId, itemId } },
      });
      expect(Number(whItem?.qtyOnHand)).toBe(10);
      expect(Number(whItem?.wac)).toBe(10.0);

      // Cleanup
      await prisma.gRNLine.deleteMany({ where: { grnId } });
      await prisma.goodsReceivedNote.delete({ where: { id: grnId } });
      await prisma.pOLine.deleteMany({ where: { poId: po.id } });
      await prisma.purchaseOrder.delete({ where: { id: po.id } });
      await prisma.supplier.delete({ where: { id: supplier.id } });
      await prisma.currency.delete({ where: { id: currency.id } });
    });
  });
});
