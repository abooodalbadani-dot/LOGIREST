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
  let destWarehouseId: string;
  let whKeeperDestToken: string;
  let whKeeperDestId: string;
  let testItemId: string;

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

    const item = await prisma.item.create({
      data: { name: `Item ${suffix}`, sku: `SKU-${suffix}`, categoryId, uomId },
    });
    testItemId = item.id;

    // Users: Proc Officer (Allowed to submit PR, but not allowed to approve PR)
    const procEmail = `proc-${suffix}@logirest.com`;
    const passwordHash = await bcrypt.hash('Password123!');
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
      .send({ email: procEmail, password: 'Password123!' });
    procOfficerToken = procLogin.body.token || procLogin.body.accessToken;

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
      .send({ email: whEmail, password: 'Password123!' });
    whKeeperToken = whLogin.body.token || whLogin.body.accessToken;

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
      .send({ email: adminEmail, password: 'Password123!' });
    adminToken = adminLogin.body.token || adminLogin.body.accessToken;

    // Create destination warehouse
    const destWarehouse = await prisma.warehouse.create({
      data: {
        name: `Dest Warehouse ${suffix}`,
        code: `WH-DST-${suffix}`,
        branchId,
      },
    });
    destWarehouseId = destWarehouse.id;

    // Seed warehouseItem stock in origin warehouse
    await prisma.warehouseItem.create({
      data: {
        warehouseId,
        itemId: testItemId,
        qtyOnHand: 100,
        qtyAllocated: 0,
        wac: 10.0,
      },
    });

    // Users: WH Keeper for Dest Warehouse
    const whDestEmail = `wh-dst-${suffix}@logirest.com`;
    const whDestUser = await prisma.user.create({
      data: {
        email: whDestEmail,
        passwordHash,
        name: `WH Keeper Dest ${suffix}`,
        role: 'WH_KEEPER',
        isActive: true,
      },
    });
    whKeeperDestId = whDestUser.id;

    await prisma.userWarehouseScope.create({
      data: { userId: whKeeperDestId, warehouseId: destWarehouseId },
    });

    const whDestLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: whDestEmail, password: 'Password123!' });
    whKeeperDestToken = whDestLogin.body.token || whDestLogin.body.accessToken;
  });

  afterAll(async () => {
    // Teardown everything
    await prisma.transferLine.deleteMany({
      where: { transfer: { fromWarehouseId: warehouseId } },
    });
    await prisma.transfer.deleteMany({
      where: { fromWarehouseId: warehouseId },
    });
    await prisma.warehouseItemLot.deleteMany({
      where: { warehouseId: { in: [warehouseId, destWarehouseId] } },
    });
    await prisma.warehouseItem.deleteMany({
      where: { warehouseId: { in: [warehouseId, destWarehouseId] } },
    });
    await prisma.userWarehouseScope.deleteMany({
      where: {
        userId: { in: [procOfficerId, whKeeperId, adminId, whKeeperDestId] },
      },
    });
    await prisma.warehouseLock.deleteMany({
      where: { warehouseId: { in: [warehouseId, destWarehouseId] } },
    });
    await prisma.gRNLine.deleteMany({
      where: { item: { categoryId } },
    });
    await prisma.goodsReceivedNote.deleteMany({
      where: { warehouseId: { in: [warehouseId, destWarehouseId] } },
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
      where: {
        userId: { in: [procOfficerId, whKeeperId, adminId, whKeeperDestId] },
      },
    });
    await prisma.auditLog.deleteMany({
      where: {
        userId: { in: [procOfficerId, whKeeperId, adminId, whKeeperDestId] },
      },
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
    await prisma.warehouse.deleteMany({
      where: { id: { in: [warehouseId, destWarehouseId] } },
    });
    await prisma.documentSequence.deleteMany({
      where: { branchId },
    });
    await prisma.branch.delete({
      where: { id: branchId },
    });
    await prisma.user.deleteMany({
      where: {
        id: { in: [procOfficerId, whKeeperId, adminId, whKeeperDestId] },
      },
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

  describe('Transfer Workflow Roles and Scopes', () => {
    let transferId: string;

    beforeEach(async () => {
      // Create a DRAFT transfer from origin to destination
      const transfer = await prisma.transfer.create({
        data: {
          transferNumber: `TR-TEST-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          fromWarehouseId: warehouseId,
          toWarehouseId: destWarehouseId,
          status: 'DRAFT',
          lines: {
            create: {
              itemId: testItemId,
              quantityShipped: 5,
            },
          },
        },
      });
      transferId = transfer.id;
    });

    afterEach(async () => {
      // Clean up local transfers and lines
      await prisma.transferLine.deleteMany({
        where: { transferId },
      });
      await prisma.transfer.deleteMany({
        where: { id: transferId },
      });
    });

    it('should block unauthorized user role (PROC_OFFICER) from shipping a transfer (403 Forbidden)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/operations/transfers/${transferId}/ship`)
        .set('Authorization', `Bearer ${procOfficerToken}`)
        .set('x-warehouse-id', warehouseId)
        .set('x-branch-id', branchId)
        .send({ version: 1 })
        .expect(403);

      expect(res.body.message).toContain('is not authorized');

      // Verify persistent security AuditLog is written
      const audit = await prisma.auditLog.findFirst({
        where: {
          userId: procOfficerId,
          action: 'WORKFLOW_SHIP_FAILED',
        },
      });
      expect(audit).toBeDefined();
    });

    it('should block WAREHOUSE_KEEPER not scoped to origin from shipping a transfer (403 Forbidden)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/operations/transfers/${transferId}/ship`)
        .set('Authorization', `Bearer ${whKeeperDestToken}`)
        .set('x-warehouse-id', destWarehouseId)
        .set('x-branch-id', branchId)
        .send({ version: 1 })
        .expect(403);

      expect(res.body.message).toContain(
        'not authorized for the origin warehouse branch',
      );

      // Verify persistent security AuditLog is written
      const audit = await prisma.auditLog.findFirst({
        where: {
          userId: whKeeperDestId,
          action: 'UNAUTHORIZED_TRANSFER_SHIP',
        },
      });
      expect(audit).toBeDefined();
    });

    it('should allow WAREHOUSE_KEEPER scoped to origin to ship a transfer successfully (200 OK)', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/operations/transfers/${transferId}/ship`)
        .set('Authorization', `Bearer ${whKeeperToken}`)
        .set('x-warehouse-id', warehouseId)
        .set('x-branch-id', branchId)
        .send({ version: 1 })
        .expect(200);

      const updated = await prisma.transfer.findUnique({
        where: { id: transferId },
      });
      expect(updated!.status).toBe('IN_TRANSIT');
    });

    it('should block WAREHOUSE_KEEPER not scoped to destination from receiving a transfer (403 Forbidden)', async () => {
      // 1. Ship it first using Admin/authorized role
      await prisma.transfer.update({
        where: { id: transferId },
        data: { status: 'IN_TRANSIT', version: 2 },
      });

      // 2. Attempt to receive using keeper who is only scoped to the origin
      const res = await request(app.getHttpServer())
        .post(`/api/v1/operations/transfers/${transferId}/receive`)
        .set('Authorization', `Bearer ${whKeeperToken}`)
        .set('x-warehouse-id', warehouseId)
        .set('x-branch-id', branchId)
        .send({ version: 2 })
        .expect(403);

      expect(res.body.message).toContain(
        'not authorized for the destination warehouse branch',
      );

      // Verify persistent security AuditLog is written
      const audit = await prisma.auditLog.findFirst({
        where: {
          userId: whKeeperId,
          action: 'UNAUTHORIZED_TRANSFER_RECEIVE',
        },
      });
      expect(audit).toBeDefined();
    });

    it('should allow WAREHOUSE_KEEPER scoped to destination to receive a transfer successfully (200 OK)', async () => {
      // 1. Ship it first
      await prisma.transfer.update({
        where: { id: transferId },
        data: { status: 'IN_TRANSIT', version: 2 },
      });

      // 2. Receive using destination keeper
      await request(app.getHttpServer())
        .post(`/api/v1/operations/transfers/${transferId}/receive`)
        .set('Authorization', `Bearer ${whKeeperDestToken}`)
        .set('x-warehouse-id', destWarehouseId)
        .set('x-branch-id', branchId)
        .send({ version: 2 })
        .expect(200);

      const updated = await prisma.transfer.findUnique({
        where: { id: transferId },
      });
      expect(updated!.status).toBe('RECEIVED');
    });

    it('should enforce status check defense-in-depth: block ship action on already received transfer (400 Bad Request)', async () => {
      // 1. Set status to RECEIVED
      await prisma.transfer.update({
        where: { id: transferId },
        data: { status: 'RECEIVED', version: 3 },
      });

      // 2. Attempt to ship
      await request(app.getHttpServer())
        .post(`/api/v1/operations/transfers/${transferId}/ship`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-warehouse-id', warehouseId)
        .set('x-branch-id', branchId)
        .send({ version: 3 })
        .expect(400);
    });
  });
});
