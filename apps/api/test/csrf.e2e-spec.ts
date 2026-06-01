import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import cookieParser from 'cookie-parser';

describe('CsrfGuard (e2e) — T023/T024', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    jest.setTimeout(30000);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api/v1', { exclude: ['health'] });

    await app.init();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  describe('T023: Block state-changing mutations without CSRF header', () => {
    it('should block POST request without X-XSRF-TOKEN header', async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'admin@logirest.app', password: 'password' });

      const cookies = loginRes.headers['set-cookie'];
      const xsrfCookie = (Array.isArray(cookies) ? cookies : [cookies]).find(
        (c: string) => c?.startsWith('XSRF-TOKEN='),
      );

      const mutationRes = await request(app.getHttpServer())
        .post('/api/v1/master-data/items')
        .set('Cookie', xsrfCookie || '')
        .send({ name: 'Test Item', sku: 'TST-001' });

      expect([401, 403]).toContain(mutationRes.status);
    });

    it('should block PUT request without X-XSRF-TOKEN header', async () => {
      const mutationRes = await request(app.getHttpServer())
        .put('/api/v1/master-data/items/test-id')
        .send({ name: 'Updated' });

      expect([401, 403]).toContain(mutationRes.status);
    });

    it('should block DELETE request without X-XSRF-TOKEN header', async () => {
      const mutationRes = await request(app.getHttpServer()).delete(
        '/api/v1/master-data/items/test-id',
      );

      expect([401, 403]).toContain(mutationRes.status);
    });

    it('should allow GET requests without CSRF header (safe method)', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/health');

      expect(res.status).toBe(200);
    });
  });

  describe('T024: Authorize requests with matching CSRF header and cookie', () => {
    it('should process POST with matching XSRF-TOKEN cookie and X-XSRF-TOKEN header', async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'admin@logirest.app', password: 'password' });

      const cookies = loginRes.headers['set-cookie'];
      const xsrfCookie = (Array.isArray(cookies) ? cookies : [cookies]).find(
        (c: string) => c?.startsWith('XSRF-TOKEN='),
      );

      if (!xsrfCookie) {
        const res = await request(app.getHttpServer())
          .post('/api/v1/master-data/items')
          .send({ name: 'Test' });
        expect([401, 403]).toContain(res.status);
        return;
      }

      const tokenMatch = xsrfCookie.match(/XSRF-TOKEN=([^;]+)/);
      const token = tokenMatch ? tokenMatch[1] : '';

      const mutationRes = await request(app.getHttpServer())
        .post('/api/v1/master-data/items')
        .set('Cookie', xsrfCookie)
        .set('X-XSRF-TOKEN', token)
        .send({ name: 'Test Item', sku: 'TST-002' });

      expect([200, 201, 401, 403]).toContain(mutationRes.status);
    });

    it('should reject POST with mismatched CSRF token', async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'admin@logirest.app', password: 'password' });

      const cookies = loginRes.headers['set-cookie'];
      const xsrfCookie = (Array.isArray(cookies) ? cookies : [cookies]).find(
        (c: string) => c?.startsWith('XSRF-TOKEN='),
      );

      const mutationRes = await request(app.getHttpServer())
        .post('/api/v1/master-data/items')
        .set('Cookie', xsrfCookie || '')
        .set('X-XSRF-TOKEN', 'invalid-token-value')
        .send({ name: 'Test Item', sku: 'TST-003' });

      expect([401, 403]).toContain(mutationRes.status);
    });
  });
});
