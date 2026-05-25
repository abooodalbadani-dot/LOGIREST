/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { BcryptService } from '../src/auth/bcrypt.service';
import { randomUUID } from 'crypto';

describe('PR to PO Conversion (e2e)', () => {
  jest.setTimeout(120000);
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let bcrypt: BcryptService;

  let procOfficerToken: string;
  let procOfficerId: string;
  let adminToken: string;
  let adminId: string;

  let branchId: string;
  let warehouseId: string;
  let supplierId: string;
  let currencyId: string;
  let categoryId: string;
  let uomId: string;
  let item1Id: string;
  let item2Id: string;

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

    const suffix = `${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Create branch & warehouse
    const branch = await prisma.branch.create({
      data: { name: `Branch ${suffix}`, code: `BR-${suffix}` },
    });
    branchId = branch.id;

    const warehouse = await prisma.warehouse.create({
      data: { name: `Warehouse ${suffix}`, code: `WH-${suffix}`, branchId },
    });
    warehouseId = warehouse.id;

    // Create supplier, currency, category, uom, items
    const supplier = await prisma.supplier.create({
      data: { name: `Supplier ${suffix}`, code: `SUP-${suffix}` },
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

    const category = await prisma.category.create({
      data: { name: `Category ${suffix}` },
    });
    categoryId = category.id;

    const uom = await prisma.unitOfMeasure.create({
      data: { name: `UOM ${suffix}`, code: `UOM-${suffix}` },
    });
    uomId = uom.id;

    const item1 = await prisma.item.create({
      data: {
        name: `Item 1 ${suffix}`,
        sku: `SKU1-${suffix}`,
        categoryId,
        uomId,
      },
    });
    item1Id = item1.id;

    const item2 = await prisma.item.create({
      data: {
        name: `Item 2 ${suffix}`,
        sku: `SKU2-${suffix}`,
        categoryId,
        uomId,
      },
    });
    item2Id = item2.id;

    const passwordHash = await bcrypt.hash('password123');

    // Create Procurement Officer
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

    const procLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: procEmail, password: 'password123' });
    procOfficerToken = procLogin.body.accessToken;

    // Create Admin
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

    const adminLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: adminEmail, password: 'password123' });
    adminToken = adminLogin.body.accessToken;
  });

  afterAll(async () => {
    // Teardown everything
    await prisma.warehouseItemLot.deleteMany({
      where: { warehouseId },
    });
    await prisma.warehouseItem.deleteMany({
      where: { warehouseId },
    });
    await prisma.userWarehouseScope.deleteMany({
      where: { userId: { in: [procOfficerId, adminId] } },
    });
    await prisma.pOLine.deleteMany({
      where: { item: { categoryId } },
    });
    await prisma.purchaseOrder.deleteMany({
      where: { supplierId },
    });
    await prisma.pRLine.deleteMany({
      where: { item: { categoryId } },
    });
    await prisma.approvalEvent.deleteMany({
      where: { userId: { in: [procOfficerId, adminId] } },
    });
    await prisma.auditLog.deleteMany({
      where: { userId: { in: [procOfficerId, adminId] } },
    });
    await prisma.purchaseRequest.deleteMany({
      where: { branchId },
    });
    await prisma.item.deleteMany({
      where: { categoryId },
    });
    await prisma.unitOfMeasure.delete({
      where: { id: uomId },
    });
    await prisma.category.delete({
      where: { id: categoryId },
    });
    await prisma.supplier.delete({
      where: { id: supplierId },
    });
    await prisma.currency.delete({
      where: { id: currencyId },
    });
    await prisma.warehouse.delete({
      where: { id: warehouseId },
    });
    await prisma.documentSequence.deleteMany({
      where: { branchId },
    });
    await prisma.branch.delete({
      where: { id: branchId },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [procOfficerId, adminId] } },
    });

    await prisma.$disconnect();
    await app.close();
  });

  describe('PR to PO Conversion Workflow Flow', () => {
    let prId: string;
    let prVersion: number = 1;

    it('should create and progress a PR to APPROVED status', async () => {
      // 1. Create DRAFT PR
      const createRes = await request(app.getHttpServer())
        .post('/api/v1/purchase-requests')
        .set('Authorization', `Bearer ${procOfficerToken}`)
        .set('x-warehouse-id', warehouseId)
        .set('x-branch-id', branchId)
        .set('x-idempotency-key', randomUUID())
        .send({
          branchId,
          warehouseId,
          lines: [
            { itemId: item1Id, quantity: 10 },
            { itemId: item2Id, quantity: 20 },
          ],
        })
        .expect(201);

      prId = createRes.body.id;
      expect(createRes.body.status).toBe('DRAFT');

      // 2. Submit PR
      const submitRes = await request(app.getHttpServer())
        .post(`/api/v1/purchase-requests/${prId}/submit`)
        .set('Authorization', `Bearer ${procOfficerToken}`)
        .set('x-warehouse-id', warehouseId)
        .set('x-branch-id', branchId)
        .send({ comments: 'Submit PR', version: prVersion })
        .expect(200);

      expect(submitRes.body.status).toBe('SUBMITTED');
      prVersion = submitRes.body.version; // should be 2

      // 3. Approve PR
      const approveRes = await request(app.getHttpServer())
        .post(`/api/v1/purchase-requests/${prId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-warehouse-id', warehouseId)
        .set('x-branch-id', branchId)
        .send({ comments: 'Approve PR', version: prVersion })
        .expect(200);

      expect(approveRes.body.status).toBe('APPROVED');
      prVersion = approveRes.body.version; // should be 3
    });

    it('should block conversion if lines are missing unit prices', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/purchase-requests/${prId}/convert-to-po`)
        .set('Authorization', `Bearer ${procOfficerToken}`)
        .set('x-warehouse-id', warehouseId)
        .set('x-branch-id', branchId)
        .send({
          supplierId,
          currencyId,
          version: prVersion,
          lines: [
            { itemId: item1Id, unitPrice: 12.5 },
            // item2Id is missing
          ],
        })
        .expect(400);

      expect(res.body.message).toContain('Unit price is missing for item ID');
    });

    it('should successfully convert APPROVED PR to a draft PO', async () => {
      const convertRes = await request(app.getHttpServer())
        .post(`/api/v1/purchase-requests/${prId}/convert-to-po`)
        .set('Authorization', `Bearer ${procOfficerToken}`)
        .set('x-warehouse-id', warehouseId)
        .set('x-branch-id', branchId)
        .send({
          supplierId,
          currencyId,
          version: prVersion,
          comments: 'Converting to PO',
          lines: [
            { itemId: item1Id, unitPrice: 12.5 },
            { itemId: item2Id, unitPrice: 8.0 },
          ],
        })
        .expect(201);

      // Verify the returned PO properties
      expect(convertRes.body.id).toBeDefined();
      expect(convertRes.body.status).toBe('DRAFT');
      expect(convertRes.body.prId).toBe(prId);
      expect(convertRes.body.supplierId).toBe(supplierId);
      expect(convertRes.body.currencyId).toBe(currencyId);

      const lines = convertRes.body.lines;
      expect(lines).toHaveLength(2);

      const line1 = lines.find((l: any) => l.itemId === item1Id);
      expect(line1).toBeDefined();
      expect(Number(line1.quantity)).toBe(10);
      expect(Number(line1.unitPrice)).toBe(12.5);

      const line2 = lines.find((l: any) => l.itemId === item2Id);
      expect(line2).toBeDefined();
      expect(Number(line2.quantity)).toBe(20);
      expect(Number(line2.unitPrice)).toBe(8);

      // Verify that the PR version was updated
      const updatedPr = await prisma.purchaseRequest.findUnique({
        where: { id: prId },
      });
      expect(updatedPr?.version).toBe(prVersion + 1);
      prVersion = updatedPr!.version;

      // Verify ApprovalEvent exists for CONVERT_TO_PO
      const approvalEvent = await prisma.approvalEvent.findFirst({
        where: { documentId: prId, actionPerformed: 'CONVERT_TO_PO' },
      });
      expect(approvalEvent).toBeDefined();
      expect(approvalEvent?.fromStatus).toBe('APPROVED');
      expect(approvalEvent?.toStatus).toBe('APPROVED');
      expect(approvalEvent?.comments).toBe('Converting to PO');
    });

    it('should reject duplicate PR-to-PO conversion (409 Conflict)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/purchase-requests/${prId}/convert-to-po`)
        .set('Authorization', `Bearer ${procOfficerToken}`)
        .set('x-warehouse-id', warehouseId)
        .set('x-branch-id', branchId)
        .send({
          supplierId,
          currencyId,
          version: prVersion,
          lines: [
            { itemId: item1Id, unitPrice: 12.5 },
            { itemId: item2Id, unitPrice: 8.0 },
          ],
        })
        .expect(409);

      expect(res.body.message).toContain('already been converted');
    });
  });
});
