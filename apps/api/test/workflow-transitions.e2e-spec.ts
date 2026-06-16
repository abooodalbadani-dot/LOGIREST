import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { BcryptService } from '../src/auth/bcrypt.service';
import { randomUUID } from 'crypto';

describe('Workflow Transitions (e2e)', () => {
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

    // Create unique data to avoid conflicts with other E2E tests
    const suffix = `${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const branch = await prisma.branch.create({
      data: { name: `Branch ${suffix}`, code: `BR-${suffix}` },
    });
    branchId = branch.id;

    const warehouse = await prisma.warehouse.create({
      data: { name: `Warehouse ${suffix}`, code: `WH-${suffix}`, branchId },
    });
    warehouseId = warehouse.id;

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

    // Create a procurement officer user
    const email = `proc-${suffix}@logirest.com`;
    const passwordHash = await bcrypt.hash('Password123!');
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name: `Procurement Officer ${suffix}`,
        role: 'PROC_OFFICER',
        isActive: true,
      },
    });
    procOfficerId = user.id;

    // Add warehouse scope for the user
    await prisma.userWarehouseScope.create({
      data: { userId: procOfficerId, warehouseId },
    });

    // Log in to get accessToken
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: 'Password123!' });
    procOfficerToken = loginRes.body.token || loginRes.body.accessToken;
  });

  afterAll(async () => {
    // Delete created records in reverse order
    await prisma.warehouseItemLot.deleteMany({
      where: { warehouseId },
    });
    await prisma.warehouseItem.deleteMany({
      where: { warehouseId },
    });
    await prisma.userWarehouseScope.deleteMany({
      where: { userId: procOfficerId },
    });
    await prisma.pRLine.deleteMany({
      where: { item: { categoryId } },
    });
    await prisma.approvalEvent.deleteMany({
      where: { userId: procOfficerId },
    });
    await prisma.auditLog.deleteMany({
      where: { userId: procOfficerId },
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
    await prisma.warehouse.delete({
      where: { id: warehouseId },
    });
    await prisma.documentSequence.deleteMany({
      where: { branchId },
    });
    await prisma.branch.delete({
      where: { id: branchId },
    });
    await prisma.user.delete({
      where: { id: procOfficerId },
    });

    await prisma.$disconnect();
    await app.close();
  });

  describe('Purchase Request Workflow Status Transitions', () => {
    let prId: string;

    it('should create a PR in DRAFT status', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/procurement/purchase-requests')
        .set('Authorization', `Bearer ${procOfficerToken}`)
        .set('x-warehouse-id', warehouseId)
        .set('x-branch-id', branchId)
        .set('x-idempotency-key', randomUUID())
        .send({
          branchId,
          warehouseId,
          lines: [{ itemId, quantity: 15 }],
        });

      if (res.status !== 201) {
        console.error('ERROR BODY IN TEST:', JSON.stringify(res.body, null, 2));
      }

      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe('DRAFT');
      expect(res.body.data.version).toBe(1);
      prId = res.body.data.id;
    });

    it('should transition DRAFT PR to SUBMITTED status', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/procurement/purchase-requests/${prId}/submit`)
        .set('Authorization', `Bearer ${procOfficerToken}`)
        .set('x-warehouse-id', warehouseId)
        .set('x-branch-id', branchId)
        .send({ comments: 'Please review and approve', version: 1 })
        .expect(200);

      expect(res.body.data.status).toBe('SUBMITTED');
      expect(res.body.data.version).toBe(2);

      // Verify ApprovalEvent exists in DB
      const approvalEvent = await prisma.approvalEvent.findFirst({
        where: { documentId: prId, actionPerformed: 'SUBMIT' },
      });
      expect(approvalEvent).toBeDefined();
      expect(approvalEvent?.fromStatus).toBe('DRAFT');
      expect(approvalEvent?.toStatus).toBe('SUBMITTED');
      expect(approvalEvent?.stepNumber).toBe(1);
      expect(approvalEvent?.comments).toBe('Please review and approve');

      // Verify successful AuditLog exists in DB
      const auditLog = await prisma.auditLog.findFirst({
        where: {
          targetId: prId,
          action: 'WORKFLOW_SUBMIT_SUCCESS',
        },
      });
      expect(auditLog).toBeDefined();
    });

    it('should block duplicate submissions (already SUBMITTED)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/procurement/purchase-requests/${prId}/submit`)
        .set('Authorization', `Bearer ${procOfficerToken}`)
        .set('x-warehouse-id', warehouseId)
        .set('x-branch-id', branchId)
        .send({ comments: 'Submit again', version: 2 })
        .expect(400);

      expect(res.body.message).toContain(
        'Action SUBMIT is not allowed on pr in status SUBMITTED',
      );

      // Verify failed transition AuditLog exists in DB
      const auditLog = await prisma.auditLog.findFirst({
        where: {
          targetId: prId,
          action: 'WORKFLOW_SUBMIT_FAILED',
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(auditLog).toBeDefined();
      expect(JSON.parse(auditLog!.afterStateJson).error).toContain(
        'Action SUBMIT is not allowed',
      );
    });

    it('should block transition when version is stale (optimistic locking)', async () => {
      // Create another PR to test version conflict
      const setupRes = await request(app.getHttpServer())
        .post('/api/v1/procurement/purchase-requests')
        .set('Authorization', `Bearer ${procOfficerToken}`)
        .set('x-warehouse-id', warehouseId)
        .set('x-branch-id', branchId)
        .set('x-idempotency-key', randomUUID())
        .send({
          branchId,
          warehouseId,
          lines: [{ itemId, quantity: 5 }],
        })
        .expect(201);

      const newPrId = setupRes.body.data.id;

      // Submit with a stale version 999
      const res = await request(app.getHttpServer())
        .post(`/api/v1/procurement/purchase-requests/${newPrId}/submit`)
        .set('Authorization', `Bearer ${procOfficerToken}`)
        .set('x-warehouse-id', warehouseId)
        .set('x-branch-id', branchId)
        .send({ comments: 'Stale version', version: 999 })
        .expect(409);

      expect(res.body.message).toContain('Version conflict');

      // Clean up the temporary new PR
      await prisma.pRLine.deleteMany({ where: { prId: newPrId } });
      await prisma.purchaseRequest.delete({ where: { id: newPrId } });
    });
  });
});
