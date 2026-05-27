import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('RateLimiting (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1', {
      exclude: ['health'],
    });

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should restrict auth login to a max of 5 requests per minute', async () => {
    // Make 5 login requests (will fail with 400 or 401 but not 429)
    for (let i = 0; i < 5; i++) {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'test@example.com', password: 'wrong' });

      expect(res.status).not.toBe(429);
    }

    // The 6th request must trigger throttler guard and return 429
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'test@example.com', password: 'wrong' });

    expect(res.status).toBe(429);
  });

  it('should allow more than 5 rapid requests on throttler-overridden items scan endpoint', async () => {
    // Items scan has a burst tolerance of 50 requests per second.
    // Let's send 8 requests in rapid succession. None should return 429.
    for (let i = 0; i < 8; i++) {
      const res = await request(app.getHttpServer())
        .get('/api/v1/items/scan')
        .query({ barcode: '123456789' });

      // Should be 401 Unauthorized (because we don't pass JWT) but NOT 429
      expect(res.status).toBe(401);
      expect(res.status).not.toBe(429);
    }
  });
});
