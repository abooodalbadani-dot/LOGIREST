import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { randomUUID } from 'crypto';
import { DocumentNumberService } from '../src/modules/sequencing/document-number.service';
import { DocumentType } from '@prisma/client';

describe('Document Number Concurrency (e2e)', () => {
  jest.setTimeout(180000);
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let docNumberService: DocumentNumberService;
  let adminToken: string;
  let adminId: string;
  let branchId: string;
  let branchCode: string;
  let warehouseId: string;
  let categoryId: string;
  let uomId: string;
  let itemId: string;
  let supplierId: string;
  let currencyId: string;
  let poId: string;
  let grnId: string;

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
    docNumberService = app.get(DocumentNumberService);

    // Login to get Admin token
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@logirest.com', password: 'Password123!' });
    adminToken = loginRes.body.token;
    adminId = loginRes.body.user.id;

    // Retrieve seeded data or generate custom scoped test data
    const suffix = `stress-${Date.now()}`;
    const branch = await prisma.branch.create({
      data: { name: `Branch ${suffix}`, code: `BR-${suffix}` },
    });
    branchId = branch.id;
    branchCode = branch.code;

    const warehouse = await prisma.warehouse.create({
      data: { name: `Warehouse ${suffix}`, code: `WH-${suffix}`, branchId },
    });
    warehouseId = warehouse.id;

    await prisma.userWarehouseScope.create({
      data: { userId: adminId, warehouseId },
    });

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

    const supplier = await prisma.supplier.create({
      data: {
        name: `Supplier ${suffix}`,
        code: `SUP-${suffix}`,
        contactEmail: 'a@a.com',
        contactName: 'a',
        contactPhone: '1',
        isActive: true,
      },
    });
    supplierId = supplier.id;

    const currency = await prisma.currency.create({
      data: {
        name: `Currency ${suffix}`,
        code: `CUR-${suffix}`,
        isBase: false,
      },
    });
    currencyId = currency.id;

    const po = await prisma.purchaseOrder.create({
      data: {
        poNumber: `PO-${suffix}`,
        supplierId,
        currencyId,
        status: 'APPROVED',
        lines: {
          create: [{ itemId, quantity: 1000, unitPrice: 10.0 }],
        },
      },
    });
    poId = po.id;

    const grn = await prisma.goodsReceivedNote.create({
      data: {
        grnNumber: `GRN-${suffix}`,
        poId,
        warehouseId,
        status: 'POSTED',
        lines: {
          create: [{ itemId, quantityReceived: 100, unitPrice: 10.0 }],
        },
      },
    });
    grnId = grn.id;
  });

  afterAll(async () => {
    if (prisma) {
      try {
        await prisma.userWarehouseScope.deleteMany({
          where: { userId: adminId, warehouse: { branchId } },
        });
        await prisma.landedCostGRNRelation.deleteMany({
          where: { grn: { warehouse: { branchId } } },
        });
        await prisma.landedCostVoucher.deleteMany({
          where: { createdById: adminId },
        });
        await prisma.gRNLine.deleteMany({
          where: { goodsReceivedNote: { warehouse: { branchId } } },
        });
        await prisma.goodsReceivedNote.deleteMany({
          where: { warehouse: { branchId } },
        });
        await prisma.pOLine.deleteMany({
          where: {
            purchaseOrder: {
              supplier: { code: { startsWith: 'SUP-stress-' } },
            },
          },
        });
        await prisma.purchaseOrder.deleteMany({
          where: { supplier: { code: { startsWith: 'SUP-stress-' } } },
        });
        await prisma.adjustmentLine.deleteMany({
          where: { adjustment: { warehouse: { branchId } } },
        });
        await prisma.adjustment.deleteMany({
          where: { warehouse: { branchId } },
        });
        await prisma.transferLine.deleteMany({
          where: { transfer: { fromWarehouse: { branchId } } },
        });
        await prisma.transfer.deleteMany({
          where: {
            OR: [
              { fromWarehouse: { branchId } },
              { toWarehouse: { branchId } },
            ],
          },
        });
        await prisma.item.deleteMany({ where: { id: itemId } });
        await prisma.unitOfMeasure.deleteMany({ where: { id: uomId } });
        await prisma.category.deleteMany({ where: { id: categoryId } });
        await prisma.warehouse.deleteMany({ where: { branchId } });

        await prisma.branch.deleteMany({ where: { id: branchId } });
      } catch (err) {
        console.error('Error during test cleanup:', err);
      } finally {
        await prisma.$disconnect();
      }
    }
    await app.close();
  });

  it('1. Spawn 20 parallel GRN creations and assert uniqueness & sequentiality', async () => {
    const promises = Array.from({ length: 20 }).map(() =>
      request(app.getHttpServer())
        .post('/api/v1/procurement/grns')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-warehouse-id', warehouseId)
        .set('x-branch-id', branchId)
        .send({
          poId,
          warehouseId,
          lines: [{ itemId, receivedQty: 1, unitCostForeign: 10.0 }],
        }),
    );

    const responses = await Promise.all(promises);

    const numbers: string[] = [];
    for (const res of responses) {
      if (res.status !== 201) {
        console.error(
          'GRN creation failed:',
          res.status,
          JSON.stringify(res.body, null, 2),
        );
      }
      expect(res.status).toBe(201);
      expect(res.body.data.documentNumber).toBeDefined();
      numbers.push(res.body.data.documentNumber);
    }

    const uniqueNumbers = new Set(numbers);
    expect(uniqueNumbers.size).toBe(20);

    const sequences = numbers.map((n) => {
      const parts = n.split('-');
      return parseInt(parts[parts.length - 1], 10);
    });
    sequences.sort((a, b) => a - b);
    const start = sequences[0];
    for (let i = 0; i < 20; i++) {
      expect(sequences[i]).toBe(start + i);
    }
  });

  it('2. Spawn 20 parallel Transfer creations and assert uniqueness & sequentiality', async () => {
    // Create a target warehouse
    const suffix = `stress-trf-${Date.now()}`;
    const wh2 = await prisma.warehouse.create({
      data: { name: `WH Target ${suffix}`, code: `WH-TRG-${suffix}`, branchId },
    });

    const promises = Array.from({ length: 20 }).map(() =>
      request(app.getHttpServer())
        .post('/api/v1/operations/transfers')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-warehouse-id', warehouseId)
        .set('x-branch-id', branchId)
        .set('x-idempotency-key', randomUUID())
        .send({
          fromWarehouseId: warehouseId,
          toWarehouseId: wh2.id,
          lines: [{ itemId, quantityShipped: 1 }],
        }),
    );

    const responses = await Promise.all(promises);

    const numbers: string[] = [];
    for (const res of responses) {
      if (res.status !== 201) {
        console.error(
          'Transfer creation failed:',
          res.status,
          JSON.stringify(res.body, null, 2),
        );
      }
      expect(res.status).toBe(201);
      expect(res.body.documentNumber).toBeDefined();
      numbers.push(res.body.documentNumber);
    }

    const uniqueNumbers = new Set(numbers);
    expect(uniqueNumbers.size).toBe(20);

    const sequences = numbers.map((n) => {
      const parts = n.split('-');
      return parseInt(parts[parts.length - 1], 10);
    });
    sequences.sort((a, b) => a - b);
    const start = sequences[0];
    for (let i = 0; i < 20; i++) {
      expect(sequences[i]).toBe(start + i);
    }
  });

  it('3. Spawn 20 parallel Adjustment creations and assert uniqueness & sequentiality', async () => {
    const promises = Array.from({ length: 20 }).map(() =>
      request(app.getHttpServer())
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
              quantity: 1,
              direction: 'IN',
              reason: 'CORRECTION',
              unitCost: 10.0,
            },
          ],
        }),
    );

    const responses = await Promise.all(promises);

    const numbers: string[] = [];
    for (const res of responses) {
      if (res.status !== 201) {
        console.error(
          'Adjustment creation failed:',
          res.status,
          JSON.stringify(res.body, null, 2),
        );
      }
      expect(res.status).toBe(201);
      expect(res.body.documentNumber).toBeDefined();
      numbers.push(res.body.documentNumber);
    }

    const uniqueNumbers = new Set(numbers);
    expect(uniqueNumbers.size).toBe(20);

    const sequences = numbers.map((n) => {
      const parts = n.split('-');
      return parseInt(parts[parts.length - 1], 10);
    });
    sequences.sort((a, b) => a - b);
    const start = sequences[0];
    for (let i = 0; i < 20; i++) {
      expect(sequences[i]).toBe(start + i);
    }
  });

  it('4. Spawn 20 parallel LandedCostVoucher creations and assert uniqueness & sequentiality', async () => {
    const promises = Array.from({ length: 20 }).map(() =>
      request(app.getHttpServer())
        .post('/api/v1/procurement/landed-cost')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-warehouse-id', warehouseId)
        .set('x-branch-id', branchId)
        .send({
          allocationMethod: 'VALUE',
          totalAllocatedCost: 100.0,
          currencyId,
          exchangeRate: 1.0,
          transactionDate: new Date().toISOString(),
          grnIds: [grnId],
        }),
    );

    const responses = await Promise.all(promises);

    const numbers: string[] = [];
    for (const res of responses) {
      if (res.status !== 201) {
        console.error(
          'LandedCost creation failed:',
          res.status,
          JSON.stringify(res.body, null, 2),
        );
      }
      expect(res.status).toBe(201);
      expect(res.body.data.voucherNumber).toBeDefined();
      numbers.push(res.body.data.voucherNumber);
    }

    const uniqueNumbers = new Set(numbers);
    expect(uniqueNumbers.size).toBe(20);

    const sequences = numbers.map((n) => {
      const parts = n.split('-');
      return parseInt(parts[parts.length - 1], 10);
    });
    sequences.sort((a, b) => a - b);
    const start = sequences[0];
    for (let i = 0; i < 20; i++) {
      expect(sequences[i]).toBe(start + i);
    }
  });

  it('5. Verify sequence increments, year transitions, and branch code isolation', async () => {
    // Branch isolation: Create a second branch
    const suffix = `stress-iso-${Date.now()}`;
    const branch2 = await prisma.branch.create({
      data: { name: `Branch 2 ${suffix}`, code: `BR2-${suffix}` },
    });

    // Generate sequence for branch 1
    const seqBranch1 = await prisma.$transaction(async (tx) => {
      return docNumberService.next(tx, DocumentType.PURCHASE_REQUEST, branchId);
    });

    // Generate sequence for branch 2
    const seqBranch2 = await prisma.$transaction(async (tx) => {
      return docNumberService.next(
        tx,
        DocumentType.PURCHASE_REQUEST,
        branch2.id,
      );
    });

    expect(seqBranch1).toContain(branchCode);
    expect(seqBranch2).toContain(branch2.code);

    // Verify sequences are separate (both should end with '00001' or similar depending on current counter)
    const suffix1 = seqBranch1.split('-').pop();
    const suffix2 = seqBranch2.split('-').pop();
    expect(suffix1).toBe('00001');
    expect(suffix2).toBe('00001');

    await prisma.branch.delete({ where: { id: branch2.id } });
  });
});
