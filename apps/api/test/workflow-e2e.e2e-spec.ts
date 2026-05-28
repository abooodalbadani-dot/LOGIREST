/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { BcryptService } from '../src/auth/bcrypt.service';
import { ReconciliationJob } from '../src/modules/ledger/reconciliation.job';
import { randomUUID } from 'crypto';
import { JwtService } from '@nestjs/jwt';

describe('End-to-End Workflow Integration', () => {
  jest.setTimeout(180000);
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let bcrypt: BcryptService;
  let reconciliationJob: ReconciliationJob;

  let adminToken: string;
  let adminId: string;
  let procOfficerToken: string;
  let procOfficerId: string;

  let branchId: string;
  let warehouseId: string;
  let departmentId: string;
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
    reconciliationJob = app.get(ReconciliationJob);

    const suffix = `wf-e2e-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

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
    const passwordHash = await bcrypt.hash('Password123!');
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

    const jwtService = app.get(JwtService);
    adminToken = jwtService.sign({
      sub: adminId,
      email: adminEmail,
      role: 'ADMIN',
    });

    // Create Procurement Officer User
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

    await prisma.userWarehouseScope.create({
      data: { userId: procOfficerId, warehouseId },
    });

    procOfficerToken = jwtService.sign({
      sub: procOfficerId,
      email: procEmail,
      role: 'PROC_OFFICER',
    });
  }, 180000);

  afterAll(async () => {
    if (prisma) {
      await Promise.all([
        prisma.userWarehouseScope.deleteMany({
          where: { userId: { in: [adminId, procOfficerId] } },
        }),
        prisma.approvalEvent.deleteMany({
          where: { userId: { in: [adminId, procOfficerId] } },
        }),
        prisma.refreshToken.deleteMany({
          where: { userId: { in: [adminId, procOfficerId] } },
        }),
        prisma.auditLog.deleteMany({
          where: { userId: { in: [adminId, procOfficerId] } },
        }),
        prisma.lotAllocation.deleteMany({ where: { lot: { itemId } } }),
        prisma.stockLedger.deleteMany({ where: { itemId } }),
        prisma.costLedger.deleteMany({ where: { itemId } }),
        prisma.warehouseItemLot.deleteMany({ where: { itemId } }),
        prisma.warehouseItem.deleteMany({ where: { itemId } }),
        prisma.inventoryIssueLine.deleteMany({ where: { itemId } }),
        prisma.gRNLine.deleteMany({ where: { itemId } }),
        prisma.pOLine.deleteMany({ where: { itemId } }),
        prisma.pRLine.deleteMany({ where: { itemId } }),
      ]);

      await prisma.inventoryIssue.deleteMany({ where: { warehouseId } });
      await prisma.goodsReceivedNote.deleteMany({ where: { warehouseId } });
      await prisma.purchaseOrder.deleteMany({ where: { supplierId } });
      await prisma.purchaseRequest.deleteMany({ where: { warehouseId } });

      await prisma.item.deleteMany({ where: { categoryId } });
      await prisma.unitOfMeasure.delete({ where: { id: uomId } });
      await prisma.category.delete({ where: { id: categoryId } });
      await prisma.supplier.delete({ where: { id: supplierId } });
      await prisma.currency.delete({ where: { id: currencyId } });
      await prisma.department.delete({ where: { id: departmentId } });
      await prisma.warehouse.delete({ where: { id: warehouseId } });
      await prisma.documentSequence.deleteMany({ where: { branchId } });
      await prisma.branch.delete({ where: { id: branchId } });
      await prisma.user.deleteMany({
        where: { id: { in: [adminId, procOfficerId] } },
      });

      await prisma.$disconnect();
    }
    await app.close();
  });

  it('should run the complete PR -> PO -> GRN -> Stock Ledger -> WAC -> Issue -> Reconciliation workflow successfully', async () => {
    // 1. Create a Purchase Request (PR)
    const createPrRes = await request(app.getHttpServer())
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

    const prId = createPrRes.body.id;
    expect(createPrRes.body.status).toBe('DRAFT');

    // 2. Submit the PR
    await request(app.getHttpServer())
      .post(`/api/v1/purchase-requests/${prId}/submit`)
      .set('Authorization', `Bearer ${procOfficerToken}`)
      .set('x-warehouse-id', warehouseId)
      .set('x-branch-id', branchId)
      .send({ comments: 'Submit PR', version: 1 })
      .expect(200);

    // 3. Approve the PR
    await request(app.getHttpServer())
      .post(`/api/v1/purchase-requests/${prId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-warehouse-id', warehouseId)
      .set('x-branch-id', branchId)
      .send({ comments: 'Approve PR', version: 2 })
      .expect(200);

    // 4. Convert PR to PO (returns draft PO)
    const convertRes = await request(app.getHttpServer())
      .post(`/api/v1/purchase-requests/${prId}/convert-to-po`)
      .set('Authorization', `Bearer ${procOfficerToken}`)
      .set('x-warehouse-id', warehouseId)
      .set('x-branch-id', branchId)
      .send({
        supplierId,
        currencyId,
        version: 3,
        lines: [{ itemId, unitPrice: 10.0 }],
      })
      .expect(201);

    const poId = convertRes.body.id;
    expect(convertRes.body.status).toBe('DRAFT');

    // 5. Submit the PO
    await request(app.getHttpServer())
      .post(`/api/v1/purchase-orders/${poId}/submit`)
      .set('Authorization', `Bearer ${procOfficerToken}`)
      .set('x-warehouse-id', warehouseId)
      .set('x-branch-id', branchId)
      .send({ comments: 'Submit PO', version: 1 })
      .expect(200);

    // 6. Approve the PO
    await request(app.getHttpServer())
      .post(`/api/v1/purchase-orders/${poId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-warehouse-id', warehouseId)
      .set('x-branch-id', branchId)
      .send({ comments: 'Approve PO', version: 2 })
      .expect(200);

    // 7. Create GRN in RECEIVED status (referencing the PO)
    const grn = await prisma.goodsReceivedNote.create({
      data: {
        grnNumber: `GRN-E2E-${Date.now()}`,
        poId,
        warehouseId,
        status: 'RECEIVED',
        lines: {
          create: [{ itemId, quantityReceived: 10, unitPrice: 10.0 }],
        },
      },
    });

    // 8. Post GRN
    await request(app.getHttpServer())
      .post(`/api/v1/procurement/goods-received/${grn.id}/post`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-warehouse-id', warehouseId)
      .set('x-branch-id', branchId)
      .send({ version: 1 })
      .expect(200);

    // 9. Verify StockLedger entry created
    const stockLedgerAfterGrn = await prisma.stockLedger.findFirst({
      where: { documentId: grn.id, itemId },
    });
    expect(stockLedgerAfterGrn).toBeDefined();
    expect(Number(stockLedgerAfterGrn?.quantity)).toBe(10);

    // 10. Verify WarehouseItem.qtyOnHand increased & WAC updated
    const warehouseItemAfterGrn = await prisma.warehouseItem.findUnique({
      where: {
        warehouseId_itemId: { warehouseId, itemId },
      },
    });
    expect(Number(warehouseItemAfterGrn?.qtyOnHand)).toBe(10);
    expect(Number(warehouseItemAfterGrn?.wac)).toBe(10.0);

    // 11. Create Inventory Issue (Draft)
    const createIssueRes = await request(app.getHttpServer())
      .post('/api/v1/operations/issues')
      .set('Authorization', `Bearer ${procOfficerToken}`)
      .set('x-warehouse-id', warehouseId)
      .set('x-branch-id', branchId)
      .set('x-idempotency-key', randomUUID())
      .send({
        departmentId,
        lines: [{ itemId, quantity: 4 }],
      })
      .expect(201);

    const issueId = createIssueRes.body.id;
    expect(createIssueRes.body.status).toBe('DRAFT');

    // 12. Submit the Issue
    await request(app.getHttpServer())
      .post(`/api/v1/operations/issues/${issueId}/submit`)
      .set('Authorization', `Bearer ${procOfficerToken}`)
      .set('x-warehouse-id', warehouseId)
      .set('x-branch-id', branchId)
      .send({ comments: 'Submit Issue', version: 1 })
      .expect(200);

    // 13. Post the Issue
    await request(app.getHttpServer())
      .post(`/api/v1/operations/issues/${issueId}/post`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-warehouse-id', warehouseId)
      .set('x-branch-id', branchId)
      .send({ version: 2 })
      .expect(200);

    // 14. Verify StockLedger entry is negative
    const stockLedgerAfterIssue = await prisma.stockLedger.findFirst({
      where: { documentId: issueId, itemId },
    });
    expect(stockLedgerAfterIssue).toBeDefined();
    expect(Number(stockLedgerAfterIssue?.quantity)).toBe(-4);

    // 15. Verify WarehouseItem.qtyOnHand decreased
    const warehouseItemAfterIssue = await prisma.warehouseItem.findUnique({
      where: {
        warehouseId_itemId: { warehouseId, itemId },
      },
    });
    expect(Number(warehouseItemAfterIssue?.qtyOnHand)).toBe(6); // 10 - 4 = 6

    // 16. Run Reconciliation and verify no discrepancies found
    const lastRunBefore = await prisma.reconciliationRun.findFirst({
      orderBy: { ranAt: 'desc' },
    });

    await reconciliationJob.runReconciliation();

    const lastRunAfter = await prisma.reconciliationRun.findFirst({
      orderBy: { ranAt: 'desc' },
    });

    expect(lastRunAfter).toBeDefined();
    expect(lastRunAfter?.discrepanciesFound).toBe(0);
  });
});
