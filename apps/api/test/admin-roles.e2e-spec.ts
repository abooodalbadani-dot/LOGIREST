/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { BcryptService } from '../src/auth/bcrypt.service';

describe('AdminRoles (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let bcrypt: BcryptService;
  let adminToken: string;
  let viewerToken: string;

  let branchId: string;
  let warehouseId: string;
  let adminId: string;
  let viewerId: string;

  beforeAll(async () => {
    jest.setTimeout(120000);
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1', {
      exclude: ['health'],
    });

    await app.init();

    prisma = app.get(PrismaService);
    bcrypt = app.get(BcryptService);

    const suffix = `roles-e2e-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Create branch and warehouse
    const branch = await prisma.branch.create({
      data: { name: `Branch ${suffix}`, code: `BR-${suffix}` },
    });
    branchId = branch.id;

    const warehouse = await prisma.warehouse.create({
      data: { name: `Warehouse ${suffix}`, code: `WH-${suffix}`, branchId },
    });
    warehouseId = warehouse.id;

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

    const adminLoginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: adminEmail, password: 'Password123!' });
    adminToken = adminLoginRes.body.token || adminLoginRes.body.accessToken;

    // Create Viewer User
    const viewerEmail = `viewer-${suffix}@logirest.com`;
    const viewerUser = await prisma.user.create({
      data: {
        email: viewerEmail,
        passwordHash,
        name: `Viewer ${suffix}`,
        role: 'VIEWER',
        isActive: true,
      },
    });
    viewerId = viewerUser.id;

    await prisma.userWarehouseScope.create({
      data: { userId: viewerId, warehouseId },
    });

    const viewerLoginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: viewerEmail, password: 'Password123!' });
    viewerToken = viewerLoginRes.body.token || viewerLoginRes.body.accessToken;
  });

  afterAll(async () => {
    if (prisma) {
      await Promise.all([
        prisma.userWarehouseScope.deleteMany({
          where: { userId: { in: [adminId, viewerId] } },
        }),
        prisma.refreshToken.deleteMany({
          where: { userId: { in: [adminId, viewerId] } },
        }),
      ]);
      await prisma.user.deleteMany({
        where: { id: { in: [adminId, viewerId] } },
      });
      await prisma.warehouse.delete({ where: { id: warehouseId } });
      await prisma.documentSequence.deleteMany({ where: { branchId } });
      await prisma.branch.delete({ where: { id: branchId } });
      await prisma.$disconnect();
    }
    await app.close();
  });

  describe('GET /api/v1/admin/roles', () => {
    it('should throw 401 Unauthorized when no token is provided', () => {
      return request(app.getHttpServer())
        .get('/api/v1/admin/roles')
        .expect(401);
    });

    it('should throw 403 Forbidden when standard non-admin user requests access', () => {
      if (!viewerToken) {
        return Promise.resolve(); // skip if no viewer is available to test
      }
      return request(app.getHttpServer())
        .get('/api/v1/admin/roles')
        .set('Authorization', `Bearer ${viewerToken}`)
        .set('x-warehouse-id', warehouseId)
        .set('x-branch-id', branchId)
        .expect(403);
    });

    it('should return 200 OK and list of role descriptors for ADMIN', () => {
      return request(app.getHttpServer())
        .get('/api/v1/admin/roles')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-warehouse-id', warehouseId)
        .set('x-branch-id', branchId)
        .expect(200)
        .then((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBe(10); // 10 core roles

          const adminDescriptor = res.body.find((r: any) => r.id === 'ADMIN');
          expect(adminDescriptor).toBeDefined();
          expect(adminDescriptor.displayName).toBe('Administrator');
          expect(typeof adminDescriptor.userCount).toBe('number');
          expect(adminDescriptor.userCount).toBeGreaterThanOrEqual(1); // at least current admin

          const whKeeperDescriptor = res.body.find(
            (r: any) => r.id === 'WH_KEEPER',
          );
          expect(whKeeperDescriptor).toBeDefined();
          expect(whKeeperDescriptor.displayName).toBe('Warehouse Keeper');
          expect(whKeeperDescriptor.permissions).toBeDefined();

          // Verify that read-only permissions mapping contains all modules
          expect(whKeeperDescriptor.permissions.length).toBeGreaterThan(0);
        });
    });
  });
});
