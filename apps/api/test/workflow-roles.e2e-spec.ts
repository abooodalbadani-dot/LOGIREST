/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  Controller,
  Post,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { BcryptService } from '../src/auth/bcrypt.service';
import { WorkflowStateGuard } from '../src/guards/workflow-state.guard';
import { WorkflowAction } from '../src/decorators/workflow-action.decorator';

@Controller('test-workflow')
export class TestWorkflowController {
  @Post('grn/:id/post')
  @UseGuards(WorkflowStateGuard)
  @WorkflowAction({
    docType: 'grn',
    action: 'POST',
    modelName: 'goodsReceivedNote',
  })
  @HttpCode(HttpStatus.OK)
  postGrn() {
    return { success: true };
  }

  @Post('pr/:id/submit')
  @UseGuards(WorkflowStateGuard)
  @WorkflowAction({
    docType: 'pr',
    action: 'SUBMIT',
    modelName: 'purchaseRequest',
  })
  @HttpCode(HttpStatus.OK)
  submitPr() {
    return { success: true };
  }
}

describe('Workflow Roles and Warehouse Locks (e2e)', () => {
  jest.setTimeout(120000);
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let bcrypt: BcryptService;

  let procOfficerToken: string;
  let procOfficerId: string;
  let whKeeperToken: string;
  let whKeeperId: string;
  let adminToken: string;
  let adminId: string;

  let branchId: string;
  let warehouseId: string;
  let supplierId: string;
  let currencyId: string;
  let categoryId: string;
  let uomId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [TestWorkflowController],
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

    // Create supplier, currency, category, uom, item
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

    await prisma.item.create({
      data: { name: `Item ${suffix}`, sku: `SKU-${suffix}`, categoryId, uomId },
    });

    // Users: Proc Officer (Allowed to submit PR, but not allowed to approve PR)
    const procEmail = `proc-${suffix}@logirest.com`;
    const passwordHash = await bcrypt.hash('password123');
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

    // Users: Warehouse Keeper (NOT allowed to submit PR)
    const whEmail = `wh-${suffix}@logirest.com`;
    const whUser = await prisma.user.create({
      data: {
        email: whEmail,
        passwordHash,
        name: `WH Keeper ${suffix}`,
        role: 'WH_KEEPER',
        isActive: true,
      },
    });
    whKeeperId = whUser.id;

    await prisma.userWarehouseScope.create({
      data: { userId: whKeeperId, warehouseId },
    });

    const whLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: whEmail, password: 'password123' });
    whKeeperToken = whLogin.body.accessToken;

    // Users: Admin (Allowed to post GRN)
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
      where: { userId: { in: [procOfficerId, whKeeperId, adminId] } },
    });
    await prisma.warehouseLock.deleteMany({
      where: { warehouseId },
    });
    await prisma.gRNLine.deleteMany({
      where: { item: { categoryId } },
    });
    await prisma.goodsReceivedNote.deleteMany({
      where: { warehouseId },
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
      where: { userId: { in: [procOfficerId, whKeeperId, adminId] } },
    });
    await prisma.auditLog.deleteMany({
      where: { userId: { in: [procOfficerId, whKeeperId, adminId] } },
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
      where: { id: { in: [procOfficerId, whKeeperId, adminId] } },
    });

    await prisma.$disconnect();
    await app.close();
  });

  describe('Workflow Role Validation Checks', () => {
    let prId: string;

    beforeAll(async () => {
      // Create a DRAFT PR in DB
      const pr = await prisma.purchaseRequest.create({
        data: {
          requestNumber: `PR-ROLES-${Date.now()}`,
          branchId,
          warehouseId,
          status: 'DRAFT',
          createdById: procOfficerId,
        },
      });
      prId = pr.id;
    });

    it('should block WH_KEEPER from submitting a PR (403 Forbidden)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/test-workflow/pr/${prId}/submit`)
        .set('Authorization', `Bearer ${whKeeperToken}`)
        .set('x-warehouse-id', warehouseId)
        .set('x-branch-id', branchId)
        .expect(403);

      expect(res.body.message).toContain('is not authorized');
    });

    it('should allow PROC_OFFICER to submit a PR (200 OK)', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/test-workflow/pr/${prId}/submit`)
        .set('Authorization', `Bearer ${procOfficerToken}`)
        .set('x-warehouse-id', warehouseId)
        .set('x-branch-id', branchId)
        .expect(200);
    });
  });

  describe('Warehouse Operational Lock Checks', () => {
    let grnId: string;
    let prId: string;

    beforeAll(async () => {
      // Create a PO
      const po = await prisma.purchaseOrder.create({
        data: {
          poNumber: `PO-LOCK-${Date.now()}`,
          supplierId,
          currencyId,
          status: 'APPROVED',
        },
      });

      // Create GRN in RECEIVED status (target for POST)
      const grn = await prisma.goodsReceivedNote.create({
        data: {
          grnNumber: `GRN-LOCK-${Date.now()}`,
          poId: po.id,
          warehouseId,
          status: 'RECEIVED',
        },
      });
      grnId = grn.id;

      // Create PR in DRAFT status
      const pr = await prisma.purchaseRequest.create({
        data: {
          requestNumber: `PR-LOCK-${Date.now()}`,
          branchId,
          warehouseId,
          status: 'DRAFT',
          createdById: procOfficerId,
        },
      });
      prId = pr.id;
    });

    it('should allow physical inventory mutation (GRN POST) when warehouse is NOT locked', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/test-workflow/grn/${grnId}/post`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-warehouse-id', warehouseId)
        .set('x-branch-id', branchId)
        .expect(200);
    });

    it('should block physical inventory mutation (GRN POST) when warehouse is locked (423 Locked)', async () => {
      // Create active warehouse lock
      const lock = await prisma.warehouseLock.create({
        data: {
          warehouseId,
          lockType: 'STOCKTAKE',
          lockedById: procOfficerId,
          expiresAt: new Date(Date.now() + 3600 * 1000), // expires in 1h
          isActive: true,
        },
      });

      try {
        const res = await request(app.getHttpServer())
          .post(`/api/v1/test-workflow/grn/${grnId}/post`)
          .set('Authorization', `Bearer ${adminToken}`)
          .set('x-warehouse-id', warehouseId)
          .set('x-branch-id', branchId)
          .expect(423);

        expect(res.body.message).toContain(
          'Warehouse is locked. Physical inventory mutations are blocked',
        );
      } finally {
        // Clean up lock
        await prisma.warehouseLock.delete({ where: { id: lock.id } });
      }
    });

    it('should allow physical inventory mutation (GRN POST) when lock is inactive (isActive: false)', async () => {
      // Create inactive warehouse lock
      const lock = await prisma.warehouseLock.create({
        data: {
          warehouseId,
          lockType: 'STOCKTAKE',
          lockedById: procOfficerId,
          expiresAt: new Date(Date.now() + 3600 * 1000), // expires in 1h
          isActive: false,
        },
      });

      try {
        await request(app.getHttpServer())
          .post(`/api/v1/test-workflow/grn/${grnId}/post`)
          .set('Authorization', `Bearer ${adminToken}`)
          .set('x-warehouse-id', warehouseId)
          .set('x-branch-id', branchId)
          .expect(200);
      } finally {
        await prisma.warehouseLock.delete({ where: { id: lock.id } });
      }
    });

    it('should block physical inventory mutation (GRN POST) when lock is expired but active (423 Locked)', async () => {
      // Create expired warehouse lock
      const lock = await prisma.warehouseLock.create({
        data: {
          warehouseId,
          lockType: 'STOCKTAKE',
          lockedById: procOfficerId,
          expiresAt: new Date(Date.now() - 3600 * 1000), // expired 1h ago
          isActive: true,
        },
      });

      try {
        const res = await request(app.getHttpServer())
          .post(`/api/v1/test-workflow/grn/${grnId}/post`)
          .set('Authorization', `Bearer ${adminToken}`)
          .set('x-warehouse-id', warehouseId)
          .set('x-branch-id', branchId)
          .expect(423);

        expect(res.body.message).toContain(
          'Warehouse is locked. Physical inventory mutations are blocked',
        );
      } finally {
        await prisma.warehouseLock.delete({ where: { id: lock.id } });
      }
    });

    it('should allow procurement workflow action (PR SUBMIT) even when warehouse is locked', async () => {
      // Create active warehouse lock
      const lock = await prisma.warehouseLock.create({
        data: {
          warehouseId,
          lockType: 'STOCKTAKE',
          lockedById: procOfficerId,
          expiresAt: new Date(Date.now() + 3600 * 1000),
          isActive: true,
        },
      });

      try {
        // PR SUBMIT is non-mutating on physical inventory, so it should be allowed
        await request(app.getHttpServer())
          .post(`/api/v1/test-workflow/pr/${prId}/submit`)
          .set('Authorization', `Bearer ${procOfficerToken}`)
          .set('x-warehouse-id', warehouseId)
          .set('x-branch-id', branchId)
          .expect(200);
      } finally {
        await prisma.warehouseLock.delete({ where: { id: lock.id } });
      }
    });
  });
});
