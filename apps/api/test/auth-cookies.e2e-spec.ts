import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';

describe('Secure Cookie Authentication (e2e)', () => {
  jest.setTimeout(90000);
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api/v1', {
      exclude: ['health'],
    });

    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  describe('POST /api/v1/auth/login', () => {
    it('should set logirest_token and logirest_refresh cookies on successful login', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'admin@logirest.com', password: 'Password123!' });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();

      const cookies = res.headers['set-cookie'] as any as string[];
      expect(cookies).toBeDefined();

      const tokenCookie = cookies.find((c: string) =>
        c.startsWith('logirest_token='),
      );
      const refreshCookie = cookies.find((c: string) =>
        c.startsWith('logirest_refresh='),
      );

      expect(tokenCookie).toBeDefined();
      expect(refreshCookie).toBeDefined();

      expect(tokenCookie).toContain('HttpOnly');
      expect(tokenCookie).toContain('SameSite=Strict');

      expect(refreshCookie).toContain('HttpOnly');
      expect(refreshCookie).toContain('SameSite=Lax');
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should authenticate requests using logirest_token cookie', async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'admin@logirest.com', password: 'Password123!' });

      const cookies = loginRes.headers['set-cookie'] as any as string[];
      const tokenCookieString = cookies.find((c: string) =>
        c.startsWith('logirest_token='),
      );
      const token = tokenCookieString!.split(';')[0];

      const profileRes = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Cookie', token);

      expect(profileRes.status).toBe(200);
      expect(profileRes.body.email).toBe('admin@logirest.com');
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('should rotate both logirest_token and logirest_refresh cookies', async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'admin@logirest.com', password: 'Password123!' });

      const cookies = loginRes.headers['set-cookie'] as any as string[];
      const refreshCookieString = cookies.find((c: string) =>
        c.startsWith('logirest_refresh='),
      );
      const refreshToken = refreshCookieString!.split(';')[0];

      const refreshRes = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Cookie', refreshToken);

      expect(refreshRes.status).toBe(200);
      expect(refreshRes.body.success).toBe(true);

      const newCookies = refreshRes.headers['set-cookie'] as any as string[];
      expect(newCookies).toBeDefined();

      const newTokenCookie = newCookies.find((c: string) =>
        c.startsWith('logirest_token='),
      );
      const newRefreshCookie = newCookies.find((c: string) =>
        c.startsWith('logirest_refresh='),
      );

      expect(newTokenCookie).toBeDefined();
      expect(newRefreshCookie).toBeDefined();
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should clear both logirest_token and logirest_refresh cookies', async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'admin@logirest.com', password: 'Password123!' });

      const cookies = loginRes.headers['set-cookie'] as any as string[];
      const refreshCookieString = cookies.find((c: string) =>
        c.startsWith('logirest_refresh='),
      );
      const refreshToken = refreshCookieString!.split(';')[0];

      const logoutRes = await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Cookie', refreshToken);

      expect(logoutRes.status).toBe(200);
      expect(logoutRes.body.success).toBe(true);

      const clearedCookies = logoutRes.headers['set-cookie'] as any as string[];
      expect(clearedCookies).toBeDefined();

      const tokenCookie = clearedCookies.find((c: string) =>
        c.startsWith('logirest_token='),
      );
      const refreshCookie = clearedCookies.find((c: string) =>
        c.startsWith('logirest_refresh='),
      );

      expect(tokenCookie).toContain('1970');
      expect(refreshCookie).toContain('1970');
    });
  });
});
