import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { BcryptService } from '../src/auth/bcrypt.service';
import { randomUUID } from 'crypto';
import { JwtService } from '@nestjs/jwt';

describe('Weighted Average Cost (WAC) Accuracy (e2e)', () => {
  jest.setTimeout(180000);
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let bcrypt: BcryptService;

  let adminToken: string;
  let adminId: string;
  let procOfficerToken: string;
  let procOfficerId: string;

  let branchId: string;
  let warehouseAId: string;
  let warehouseBId: string;
  let departmentId: string;
  let categoryId: string;
  let uomId: string;
  let itemId: string;
  let supplierId: string;
  let currencyId: string;
  let poId: string;

  beforeAll(async () => {
    console.log('[E2E Setup] beforeAll: Initializing Test Bed...');
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
    console.log('[E2E Setup] beforeAll: NestJS App context initialized.');

    prisma = app.get(PrismaService);
    bcrypt = app.get(BcryptService);

    const suffix = `wac-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    console.log(`[E2E Setup] Seeding master data suffix: ${suffix}`);

    console.log('[E2E Setup] Creating Branch...');
    const branch = await prisma.branch.create({
      data: { name: `Branch ${suffix}`, code: `BR-${suffix}` },
    });
    branchId = branch.id;
    console.log(`[E2E Setup] Branch created: ${branchId}`);

    console.log('[E2E Setup] Creating Warehouse A...');
    const warehouseA = await prisma.warehouse.create({
      data: { name: `Warehouse A ${suffix}`, code: `WHA-${suffix}`, branchId },
    });
    warehouseAId = warehouseA.id;
    console.log(`[E2E Setup] Warehouse A created: ${warehouseAId}`);

    console.log('[E2E Setup] Creating Warehouse B...');
    const warehouseB = await prisma.warehouse.create({
      data: { name: `Warehouse B ${suffix}`, code: `WHB-${suffix}`, branchId },
    });
    warehouseBId = warehouseB.id;
    console.log(`[E2E Setup] Warehouse B created: ${warehouseBId}`);

    console.log('[E2E Setup] Creating Department...');
    const department = await prisma.department.create({
      data: { name: `Department ${suffix}`, branchId },
    });
    departmentId = department.id;
    console.log(`[E2E Setup] Department created: ${departmentId}`);

    console.log('[E2E Setup] Creating Category...');
    const category = await prisma.category.create({
      data: { name: `Category ${suffix}` },
    });
    categoryId = category.id;
    console.log(`[E2E Setup] Category created: ${categoryId}`);

    console.log('[E2E Setup] Creating UOM...');
    const uom = await prisma.unitOfMeasure.create({
      data: { name: `UOM ${suffix}`, code: `UOM-${suffix}` },
    });
    uomId = uom.id;
    console.log(`[E2E Setup] UOM created: ${uomId}`);

    console.log('[E2E Setup] Creating Item...');
    const item = await prisma.item.create({
      data: { name: `Item ${suffix}`, sku: `SKU-${suffix}`, categoryId, uomId },
    });
    itemId = item.id;
    console.log(`[E2E Setup] Item created: ${itemId}`);

    console.log('[E2E Setup] Creating Supplier...');
    const supplier = await prisma.supplier.create({
      data: { name: `Supplier ${suffix}`, code: `SUP-${suffix}` },
    });
    supplierId = supplier.id;
    console.log(`[E2E Setup] Supplier created: ${supplierId}`);

    console.log('[E2E Setup] Creating Currency...');
    const currency = await prisma.currency.create({
      data: { name: `Currency ${suffix}`, code: `CUR-${suffix}`, isBase: true },
    });
    currencyId = currency.id;
    console.log(`[E2E Setup] Currency created: ${currencyId}`);

    console.log('[E2E Setup] Creating PurchaseOrder...');
    const po = await prisma.purchaseOrder.create({
      data: {
        poNumber: `PO-${suffix}`,
        status: 'APPROVED',
        supplierId,
        currencyId,
        lines: {
          create: [{ itemId, quantity: 100, unitPrice: 10.0 }],
        },
      },
    });
    poId = po.id;
    console.log(`[E2E Setup] PurchaseOrder created: ${poId}`);

    console.log('[E2E Setup] Hashing password with bcrypt...');
    const passwordHash = await bcrypt.hash('Password123!');
    console.log('[E2E Setup] Password hashed.');

    console.log('[E2E Setup] Creating admin User...');
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
    console.log(`[E2E Setup] Admin User created: ${adminId}`);

    console.log('[E2E Setup] Creating standard User...');
    const procEmail = `proc-${suffix}@logirest.com`;
    const procUser = await prisma.user.create({
      data: {
        email: procEmail,
        passwordHash,
        name: `Proc Officer ${suffix}`,
        role: 'PROC_OFFICER',
        isActive: true,
      },
    });
    procOfficerId = procUser.id;
    console.log(`[E2E Setup] Standard User created: ${procOfficerId}`);

    console.log('[E2E Setup] Creating WarehouseScopes...');
    await prisma.userWarehouseScope.createMany({
      data: [
        { userId: adminId, warehouseId: warehouseAId },
        { userId: adminId, warehouseId: warehouseBId },
        { userId: procOfficerId, warehouseId: warehouseAId },
        { userId: procOfficerId, warehouseId: warehouseBId },
      ],
    });
    console.log('[E2E Setup] WarehouseScopes created.');

    const jwtService = app.get(JwtService);
    adminToken = jwtService.sign({
      sub: adminId,
      email: adminEmail,
      role: 'ADMIN',
    });

    procOfficerToken = jwtService.sign({
      sub: procOfficerId,
      email: procEmail,
      role: 'PROC_OFFICER',
    });
    console.log(
      '[E2E Setup] beforeAll: Master data seeding complete. Tokens generated.',
    );
  }, 180000);

  afterAll(async () => {
    console.log('[E2E Cleanup] afterAll: Cleaning up database records...');
    if (prisma) {
      await prisma.userWarehouseScope.deleteMany({
        where: { userId: { in: [adminId, procOfficerId] } },
      });
      await prisma.costLedger.deleteMany({ where: { itemId } });
      await prisma.stockLedger.deleteMany({ where: { itemId } });
      await prisma.lotAllocation.deleteMany({
        where: { transferLine: { itemId } },
      });
      await prisma.transferLine.deleteMany({ where: { itemId } });
      await prisma.transfer.deleteMany({
        where: { fromWarehouseId: warehouseAId },
      });
      await prisma.inventoryIssueLine.deleteMany({ where: { itemId } });
      await prisma.inventoryIssue.deleteMany({
        where: { warehouseId: warehouseAId },
      });
      await prisma.gRNLine.deleteMany({ where: { itemId } });
      await prisma.pOLine.deleteMany({ where: { itemId } });
      await prisma.goodsReceivedNote.deleteMany({
        where: { warehouseId: { in: [warehouseAId, warehouseBId] } },
      });
      await prisma.purchaseOrder.deleteMany({ where: { supplierId } });
      await prisma.warehouseItem.deleteMany({ where: { itemId } });
      await prisma.item.deleteMany({ where: { categoryId } });
      await prisma.unitOfMeasure.delete({ where: { id: uomId } });
      await prisma.category.delete({ where: { id: categoryId } });
      await prisma.supplier.delete({ where: { id: supplierId } });
      await prisma.currency.delete({ where: { id: currencyId } });
      await prisma.warehouse.deleteMany({
        where: { id: { in: [warehouseAId, warehouseBId] } },
      });
      await prisma.branch.delete({ where: { id: branchId } });
      await prisma.user.deleteMany({
        where: { id: { in: [adminId, procOfficerId] } },
      });
      await prisma.$disconnect();
    }
    console.log(
      '[E2E Cleanup] afterAll: Database disconnect done. Closing App...',
    );
    await app.close();
    console.log('[E2E Cleanup] afterAll: App closed successfully.');
  }, 180000);

  it('should maintain WAC accuracy through GRN posting, Issue posting, and Transfer receipt flows', async () => {
    // 1. Post GRN to Warehouse A: Qty = 10, Price = 100.00
    console.log('[WAC Flow] 1. Creating GRN A for Warehouse A...');
    const grnA = await prisma.goodsReceivedNote.create({
      data: {
        grnNumber: `GRN-A-${Date.now()}`,
        poId,
        warehouseId: warehouseAId,
        status: 'RECEIVED',
        lines: {
          create: [{ itemId, quantityReceived: 10, unitPrice: 100.0 }],
        },
      },
    });

    console.log(
      '[WAC Flow] 1. Posting GRN A (Triggering WacService recalculation on Warehouse A)...',
    );
    await request(app.getHttpServer())
      .post(`/api/v1/procurement/goods-received/${grnA.id}/post`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-warehouse-id', warehouseAId)
      .set('x-branch-id', branchId)
      .send({ version: 1 })
      .timeout(10000)
      .expect(200);
    console.log('[WAC Flow] 1. GRN A Posted.');

    // Verify WAC at Warehouse A = 100.00
    let whItemA = await prisma.warehouseItem.findUnique({
      where: { warehouseId_itemId: { warehouseId: warehouseAId, itemId } },
    });
    expect(Number(whItemA?.qtyOnHand)).toBe(10);
    expect(Number(whItemA?.wac)).toBe(100.0);
    console.log('[WAC Flow] 1. WAC verified at Warehouse A = 100.00');

    // 2. Post GRN to Warehouse B: Qty = 5, Price = 40.00
    console.log('[WAC Flow] 2. Creating GRN B for Warehouse B...');
    const grnB = await prisma.goodsReceivedNote.create({
      data: {
        grnNumber: `GRN-B-${Date.now()}`,
        poId,
        warehouseId: warehouseBId,
        status: 'RECEIVED',
        lines: {
          create: [{ itemId, quantityReceived: 5, unitPrice: 40.0 }],
        },
      },
    });

    console.log(
      '[WAC Flow] 2. Posting GRN B (Triggering WacService recalculation on Warehouse B)...',
    );
    await request(app.getHttpServer())
      .post(`/api/v1/procurement/goods-received/${grnB.id}/post`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-warehouse-id', warehouseBId)
      .set('x-branch-id', branchId)
      .send({ version: 1 })
      .timeout(10000)
      .expect(200);
    console.log('[WAC Flow] 2. GRN B Posted.');

    // Verify WAC at Warehouse B = 40.00
    let whItemB = await prisma.warehouseItem.findUnique({
      where: { warehouseId_itemId: { warehouseId: warehouseBId, itemId } },
    });
    expect(Number(whItemB?.qtyOnHand)).toBe(5);
    expect(Number(whItemB?.wac)).toBe(40.0);
    console.log('[WAC Flow] 2. WAC verified at Warehouse B = 40.00');

    // 3. Post Inventory Issue to Warehouse A: Qty = 3. Verify WAC remains 100.00
    console.log('[WAC Flow] 3. Creating Inventory Issue at Warehouse A...');
    const createIssueRes = await request(app.getHttpServer())
      .post('/api/v1/operations/issues')
      .set('Authorization', `Bearer ${procOfficerToken}`)
      .set('x-warehouse-id', warehouseAId)
      .set('x-branch-id', branchId)
      .set('x-idempotency-key', randomUUID())
      .send({
        departmentId,
        lines: [{ itemId, quantity: 3 }],
      })
      .timeout(10000)
      .expect(201);

    const issueId = createIssueRes.body.id;
    console.log(
      `[WAC Flow] 3. Inventory Issue created with ID: ${issueId}. Submitting...`,
    );

    await request(app.getHttpServer())
      .post(`/api/v1/operations/issues/${issueId}/submit`)
      .set('Authorization', `Bearer ${procOfficerToken}`)
      .set('x-warehouse-id', warehouseAId)
      .set('x-branch-id', branchId)
      .send({ comments: 'Submit Issue', version: 1 })
      .timeout(10000)
      .expect(200);
    console.log('[WAC Flow] 3. Inventory Issue submitted. Posting...');

    await request(app.getHttpServer())
      .post(`/api/v1/operations/issues/${issueId}/post`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-warehouse-id', warehouseAId)
      .set('x-branch-id', branchId)
      .send({ version: 2 })
      .timeout(10000)
      .expect(200);
    console.log('[WAC Flow] 3. Inventory Issue posted.');

    whItemA = await prisma.warehouseItem.findUnique({
      where: { warehouseId_itemId: { warehouseId: warehouseAId, itemId } },
    });
    expect(Number(whItemA?.qtyOnHand)).toBe(7); // 10 - 3
    expect(Number(whItemA?.wac)).toBe(100.0); // WAC unchanged on issues
    console.log(
      '[WAC Flow] 3. Verified Warehouse A WAC remains 100.00 after issue.',
    );

    // 4. Create and Receive Transfer from Warehouse A to Warehouse B of Qty = 4
    console.log('[WAC Flow] 4. Creating Transfer from Warehouse A to B...');
    const createTransferRes = await request(app.getHttpServer())
      .post('/api/v1/operations/transfers')
      .set('Authorization', `Bearer ${procOfficerToken}`)
      .set('x-warehouse-id', warehouseAId)
      .set('x-branch-id', branchId)
      .set('x-idempotency-key', randomUUID())
      .send({
        fromWarehouseId: warehouseAId,
        toWarehouseId: warehouseBId,
        lines: [{ itemId, quantity: 4 }],
      })
      .timeout(10000)
      .expect(201);

    const transferId = createTransferRes.body.id;
    console.log(
      `[WAC Flow] 4. Transfer created with ID: ${transferId}. Shipping...`,
    );

    // Ship the transfer
    await request(app.getHttpServer())
      .post(`/api/v1/operations/transfers/${transferId}/ship`)
      .set('Authorization', `Bearer ${procOfficerToken}`)
      .set('x-warehouse-id', warehouseAId)
      .set('x-branch-id', branchId)
      .send({ version: 1 })
      .timeout(10000)
      .expect(200);
    console.log('[WAC Flow] 4. Transfer shipped. Receiving...');

    // Receive the transfer at Warehouse B
    await request(app.getHttpServer())
      .post(`/api/v1/operations/transfers/${transferId}/receive`)
      .set('Authorization', `Bearer ${procOfficerToken}`)
      .set('x-warehouse-id', warehouseBId)
      .set('x-branch-id', branchId)
      .send({ version: 2 })
      .timeout(10000)
      .expect(200);
    console.log('[WAC Flow] 4. Transfer received at Warehouse B.');

    // Verify WAC at Warehouse B
    // Initial: Qty 5, WAC 40. Received: Qty 4, Cost 100
    // Expected WAC = (5*40 + 4*100) / 9 = 66.6667
    whItemB = await prisma.warehouseItem.findUnique({
      where: { warehouseId_itemId: { warehouseId: warehouseBId, itemId } },
    });
    expect(Number(whItemB?.qtyOnHand)).toBe(9); // 5 + 4
    expect(Number(whItemB?.wac)).toBeCloseTo(66.6667, 4);
    console.log(
      '[WAC Flow] 4. Verified Warehouse B WAC updated correctly to 66.6667',
    );
  });
});
