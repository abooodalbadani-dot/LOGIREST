import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/database/prisma.service';

describe('API List Response Shape Contract (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let accessToken: string;
  let warehouseId: string;
  let branchId: string;

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

    // Login to get token
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@logirest.com', password: 'Password123!' })
      .expect(200);

    accessToken = loginRes.body.token;

    // Retrieve WH-HQ-01 warehouse ID from db
    const wh = await prisma.warehouse.findUnique({
      where: { code: 'WH-HQ-01' },
    });
    warehouseId = wh?.id || '';
    branchId = wh?.branchId || '';
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.$disconnect();
    }
    if (app) {
      await app.close();
    }
  });

  function assertPaginatedEnvelope(res: request.Response) {
    expect(res.body).toBeDefined();
    expect(res.body.data).toBeDefined();
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.meta).toBeDefined();
    expect(res.body.meta).toEqual(
      expect.objectContaining({
        total: expect.any(Number),
        page: expect.any(Number),
        pageSize: expect.any(Number),
        totalPages: expect.any(Number),
      }),
    );
  }

  describe('Master Data Envelopes', () => {
    it('GET /api/v1/branches - should return conforming list envelope', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/branches')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-warehouse-id', warehouseId)
        .set('x-branch-id', branchId)
        .expect(200);
      assertPaginatedEnvelope(res);
    });

    it('GET /api/v1/departments - should return conforming list envelope', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/departments')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-warehouse-id', warehouseId)
        .set('x-branch-id', branchId)
        .expect(200);
      assertPaginatedEnvelope(res);
    });

    it('GET /api/v1/categories - should return conforming list envelope', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/categories')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-warehouse-id', warehouseId)
        .set('x-branch-id', branchId)
        .expect(200);
      assertPaginatedEnvelope(res);
    });

    it('GET /api/v1/suppliers - should return conforming list envelope', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/suppliers')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-warehouse-id', warehouseId)
        .set('x-branch-id', branchId)
        .expect(200);
      assertPaginatedEnvelope(res);
    });

    it('GET /api/v1/units-of-measure - should return conforming list envelope', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/units-of-measure')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-warehouse-id', warehouseId)
        .set('x-branch-id', branchId)
        .expect(200);
      assertPaginatedEnvelope(res);
    });

    it('GET /api/v1/currencies - should return conforming list envelope', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/currencies')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-warehouse-id', warehouseId)
        .set('x-branch-id', branchId)
        .expect(200);
      assertPaginatedEnvelope(res);
    });

    it('GET /api/v1/barcodes - should return conforming list envelope', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/barcodes')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-warehouse-id', warehouseId)
        .set('x-branch-id', branchId)
        .expect(200);
      assertPaginatedEnvelope(res);
    });
  });

  describe('Inventory & Movements Envelopes', () => {
    it('GET /api/v1/inventory/balance - should return conforming list envelope', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/inventory/balance')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-warehouse-id', warehouseId)
        .set('x-branch-id', branchId)
        .expect(200);
      assertPaginatedEnvelope(res);
    });

    it('GET /api/v1/inventory/lots - should return conforming list envelope', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/inventory/lots')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-warehouse-id', warehouseId)
        .set('x-branch-id', branchId)
        .expect(200);
      assertPaginatedEnvelope(res);
    });

    it('GET /api/v1/inventory/movements - should return conforming list envelope', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/inventory/movements')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-warehouse-id', warehouseId)
        .set('x-branch-id', branchId)
        .expect(200);
      assertPaginatedEnvelope(res);
    });
  });

  describe('Procurement & Operations Document Envelopes', () => {
    it('GET /api/v1/procurement/purchase-requests - should return conforming list envelope', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/procurement/purchase-requests')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-warehouse-id', warehouseId)
        .set('x-branch-id', branchId)
        .expect(200);
      assertPaginatedEnvelope(res);
    });

    it('GET /api/v1/procurement/purchase-orders - should return conforming list envelope', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/procurement/purchase-orders')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-warehouse-id', warehouseId)
        .set('x-branch-id', branchId)
        .expect(200);
      assertPaginatedEnvelope(res);
    });

    it('GET /api/v1/procurement/grns - should return conforming list envelope', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/procurement/grns')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-warehouse-id', warehouseId)
        .set('x-branch-id', branchId)
        .expect(200);
      assertPaginatedEnvelope(res);
    });

    it('GET /api/v1/operations/transfers - should return conforming list envelope', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/operations/transfers')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-warehouse-id', warehouseId)
        .set('x-branch-id', branchId)
        .expect(200);
      assertPaginatedEnvelope(res);
    });

    it('GET /api/v1/operations/issues - should return conforming list envelope', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/operations/issues')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-warehouse-id', warehouseId)
        .set('x-branch-id', branchId)
        .expect(200);
      assertPaginatedEnvelope(res);
    });

    it('GET /api/v1/operations/adjustments - should return conforming list envelope', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/operations/adjustments')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-warehouse-id', warehouseId)
        .set('x-branch-id', branchId)
        .expect(200);
      assertPaginatedEnvelope(res);
    });

    it('GET /api/v1/stocktake/sessions - should return conforming list envelope', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/stocktake/sessions')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-warehouse-id', warehouseId)
        .set('x-branch-id', branchId)
        .expect(200);
      assertPaginatedEnvelope(res);
    });

    it('GET /api/v1/operations/kitchen-requests - should return conforming list envelope', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/operations/kitchen-requests')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-warehouse-id', warehouseId)
        .set('x-branch-id', branchId)
        .expect(200);
      assertPaginatedEnvelope(res);
    });
  });
});
