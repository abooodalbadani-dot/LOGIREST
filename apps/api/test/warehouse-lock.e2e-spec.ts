/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  Controller,
  Post,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { BcryptService } from '../src/auth/bcrypt.service';

@Controller('test-lock')
export class TestLockController {
  @Post('mutate')
  @HttpCode(HttpStatus.CREATED)
  mutate() {
    return { success: true };
  }
}

describe('Warehouse Lock & Admin Override E2E', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let bcrypt: BcryptService;

  let adminToken: string;
  let adminId: string;
  let nonAdminToken: string;
  let nonAdminId: string;

  let branchId: string;
  let warehouseId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [TestLockController],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );

    await app.init();

    prisma = app.get(PrismaService);
    bcrypt = app.get(BcryptService);

    const suffix = `lock-e2e-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const branch = await prisma.branch.create({
      data: { name: `Branch ${suffix}`, code: `BR-${suffix}` },
    });
    branchId = branch.id;

    const warehouse = await prisma.warehouse.create({
      data: { name: `Warehouse ${suffix}`, code: `WH-${suffix}`, branchId },
    });
    warehouseId = warehouse.id;

    // Admin User
    const adminEmail = `admin-${suffix}@logirest.com`;
    const passwordHash = await bcrypt.hash('password123');
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
      .send({ email: adminEmail, password: 'password123' });
    adminToken = adminLoginRes.body.accessToken;

    // Non-Admin User (Proc Officer)
    const procEmail = `proc-${suffix}@logirest.com`;
    const procUser = await prisma.user.create({
      data: {
        email: procEmail,
        passwordHash,
        name: `Proc ${suffix}`,
        role: 'PROC_OFFICER',
        isActive: true,
      },
    });
    nonAdminId = procUser.id;

    await prisma.userWarehouseScope.create({
      data: { userId: nonAdminId, warehouseId },
    });

    const procLoginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: procEmail, password: 'password123' });
    nonAdminToken = procLoginRes.body.accessToken;
  });

  afterAll(async () => {
    if (prisma) {
      if (adminId || nonAdminId) {
        await prisma.userWarehouseScope.deleteMany({
          where: { userId: { in: [adminId, nonAdminId].filter(Boolean) } },
        });
      }
      if (warehouseId) {
        await prisma.warehouseLock.deleteMany({
          where: { warehouseId },
        });
      }
      if (adminId || nonAdminId) {
        await prisma.auditLog.deleteMany({
          where: { userId: { in: [adminId, nonAdminId].filter(Boolean) } },
        });
      }
      if (warehouseId) {
        await prisma.warehouse.delete({
          where: { id: warehouseId },
        });
      }
      if (branchId) {
        await prisma.documentSequence.deleteMany({
          where: { branchId },
        });
        await prisma.branch.delete({
          where: { id: branchId },
        });
      }
      if (adminId || nonAdminId) {
        await prisma.user.deleteMany({
          where: { id: { in: [adminId, nonAdminId].filter(Boolean) } },
        });
      }

      await prisma.$disconnect();
    }
    await app.close();
  });

  it('should allow mutation when warehouse is NOT locked', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/test-lock/mutate')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-warehouse-id', warehouseId)
      .set('x-branch-id', branchId)
      .send({ warehouseId })
      .expect(201);
  });

  it('should block mutation (423 Locked) when warehouse is locked', async () => {
    const lock = await prisma.warehouseLock.create({
      data: {
        warehouseId,
        lockType: 'STOCKTAKE',
        lockedById: adminId,
        expiresAt: new Date(Date.now() + 3600 * 1000), // active, 1h
        isActive: true,
      },
    });

    try {
      const res = await request(app.getHttpServer())
        .post('/api/v1/test-lock/mutate')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-warehouse-id', warehouseId)
        .set('x-branch-id', branchId)
        .send({ warehouseId })
        .expect(423);

      expect(res.body.message).toContain(
        'Warehouse is locked. Physical inventory mutations are blocked',
      );
    } finally {
      await prisma.warehouseLock.delete({ where: { id: lock.id } });
    }
  });

  it('should block mutation (423 Locked) even when lock is expired but isActive is true', async () => {
    const lock = await prisma.warehouseLock.create({
      data: {
        warehouseId,
        lockType: 'STOCKTAKE',
        lockedById: adminId,
        expiresAt: new Date(Date.now() - 3600 * 1000), // expired 1h ago
        isActive: true,
      },
    });

    try {
      await request(app.getHttpServer())
        .post('/api/v1/test-lock/mutate')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-warehouse-id', warehouseId)
        .set('x-branch-id', branchId)
        .send({ warehouseId })
        .expect(423);
    } finally {
      await prisma.warehouseLock.delete({ where: { id: lock.id } });
    }
  });

  it('should reject force-unlock for non-admin users (403 Forbidden)', async () => {
    const lock = await prisma.warehouseLock.create({
      data: {
        warehouseId,
        lockType: 'STOCKTAKE',
        lockedById: adminId,
        expiresAt: new Date(Date.now() + 3600 * 1000),
        isActive: true,
      },
    });

    try {
      await request(app.getHttpServer())
        .post(`/api/v1/warehouse-locks/${lock.id}/force-unlock`)
        .set('Authorization', `Bearer ${nonAdminToken}`)
        .set('x-warehouse-id', warehouseId)
        .set('x-branch-id', branchId)
        .send({ reason_notes: 'Bypassing locks for stocktake override' })
        .expect(403);
    } finally {
      await prisma.warehouseLock.delete({ where: { id: lock.id } });
    }
  });

  it('should reject force-unlock if reason_notes is too short (400 Bad Request)', async () => {
    const lock = await prisma.warehouseLock.create({
      data: {
        warehouseId,
        lockType: 'STOCKTAKE',
        lockedById: adminId,
        expiresAt: new Date(Date.now() + 3600 * 1000),
        isActive: true,
      },
    });

    try {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/warehouse-locks/${lock.id}/force-unlock`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-warehouse-id', warehouseId)
        .set('x-branch-id', branchId)
        .send({ reason_notes: 'short' })
        .expect(400);

      expect(res.body.message).toBe(
        'reason_notes must be longer than or equal to 10 characters',
      );
    } finally {
      await prisma.warehouseLock.delete({ where: { id: lock.id } });
    }
  });

  it('should allow admin to force unlock, write audit log, and permit subsequent mutations', async () => {
    const lock = await prisma.warehouseLock.create({
      data: {
        warehouseId,
        lockType: 'STOCKTAKE',
        lockedById: adminId,
        expiresAt: new Date(Date.now() + 3600 * 1000),
        isActive: true,
      },
    });

    try {
      // 1. Mutation is currently blocked
      await request(app.getHttpServer())
        .post('/api/v1/test-lock/mutate')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-warehouse-id', warehouseId)
        .set('x-branch-id', branchId)
        .send({ warehouseId })
        .expect(423);

      // 2. Perform force unlock
      await request(app.getHttpServer())
        .post(`/api/v1/warehouse-locks/${lock.id}/force-unlock`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-warehouse-id', warehouseId)
        .set('x-branch-id', branchId)
        .send({ reason_notes: 'Bypassing locks for stocktake override' })
        .expect(201);

      // 3. Verify lock is disabled in DB
      const updatedLock = await prisma.warehouseLock.findUnique({
        where: { id: lock.id },
      });
      expect(updatedLock?.isActive).toBe(false);

      // 4. Verify audit log was created
      const audit = await prisma.auditLog.findFirst({
        where: {
          userId: adminId,
          action: 'FORCE_UNLOCK',
          targetTable: 'warehouse_locks',
          targetId: lock.id,
        },
      });
      expect(audit).toBeDefined();
      expect(audit?.afterStateJson).toContain(
        'Bypassing locks for stocktake override',
      );

      // 5. Subsequent mutation should now succeed
      await request(app.getHttpServer())
        .post('/api/v1/test-lock/mutate')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-warehouse-id', warehouseId)
        .set('x-branch-id', branchId)
        .send({ warehouseId })
        .expect(201);
    } finally {
      await prisma.warehouseLock.delete({ where: { id: lock.id } });
    }
  });
});
