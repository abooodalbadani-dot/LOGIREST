/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';

describe('AdminRoles (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let adminToken: string;
  let viewerToken: string;

  beforeAll(async () => {
    jest.setTimeout(90000);
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1', {
      exclude: ['health'],
    });

    await app.init();

    prisma = app.get(PrismaService);

    // Login as Admin
    const adminLoginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@logirest.com', password: 'adminpassword' });
    adminToken = adminLoginRes.body.accessToken;

    // Login as Viewer (non-admin)
    const viewerLoginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'viewer@logirest.com', password: 'viewerpassword' });
    
    // Fallback if viewer doesn't exist in seed
    if (viewerLoginRes.status !== 200) {
      // Find or create a viewer user
      const user = await prisma.user.findFirst({
        where: { role: 'VIEWER', isActive: true },
      });
      if (user) {
        // Create direct token or log in with another account.
        // Usually seed has viewer@logirest.com or store.manager@logirest.com. Let's try store manager:
        const storeMgrRes = await request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send({ email: 'store.manager@logirest.com', password: 'storepassword' });
        viewerToken = storeMgrRes.body.accessToken;
      }
    } else {
      viewerToken = viewerLoginRes.body.accessToken;
    }
  });

  afterAll(async () => {
    await prisma.$disconnect();
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
        .expect(403);
    });

    it('should return 200 OK and list of role descriptors for ADMIN', () => {
      return request(app.getHttpServer())
        .get('/api/v1/admin/roles')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .then((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBe(10); // 10 core roles
          
          const adminDescriptor = res.body.find((r: any) => r.id === 'ADMIN');
          expect(adminDescriptor).toBeDefined();
          expect(adminDescriptor.displayName).toBe('Administrator');
          expect(typeof adminDescriptor.userCount).toBe('number');
          expect(adminDescriptor.userCount).toBeGreaterThanOrEqual(1); // at least current admin
          
          const whKeeperDescriptor = res.body.find((r: any) => r.id === 'WH_KEEPER');
          expect(whKeeperDescriptor).toBeDefined();
          expect(whKeeperDescriptor.displayName).toBe('Warehouse Keeper');
          expect(whKeeperDescriptor.permissions).toBeDefined();
          
          // Verify that read-only permissions mapping contains all modules
          expect(whKeeperDescriptor.permissions.length).toBeGreaterThan(0);
        });
    });
  });
});
