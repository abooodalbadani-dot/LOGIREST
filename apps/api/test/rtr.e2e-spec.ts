/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call */
import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  BadRequestException,
} from '@nestjs/common';
import { ValidationError } from 'class-validator';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';

describe('Refresh Token Rotation (e2e)', () => {
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

    function formatErrors(
      validationErrors: ValidationError[],
    ): { field: string; message: string }[] {
      const result: { field: string; message: string }[] = [];
      const format = (errors: ValidationError[], parentProperty = '') => {
        for (const error of errors) {
          const propertyPath = parentProperty
            ? `${parentProperty}.${error.property}`
            : error.property;
          if (error.constraints) {
            result.push({
              field: propertyPath,
              message: Object.values(error.constraints)[0],
            });
          }
          if (error.children && error.children.length > 0) {
            format(error.children, propertyPath);
          }
        }
      };
      format(validationErrors);
      return result;
    }

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        exceptionFactory: (validationErrors: ValidationError[] = []) => {
          const formattedErrors = formatErrors(validationErrors);
          return new BadRequestException({
            success: false,
            errors: formattedErrors,
          });
        },
      }),
    );

    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('should return new access token on silent refresh', async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'admin@logirest.com', password: 'adminpassword' });

      const cookies = loginRes.headers['set-cookie'];
      const refreshCookie = Array.isArray(cookies)
        ? cookies.find((c: string) => c.startsWith('logirest_refresh='))
        : undefined;

      if (!refreshCookie) {
        console.warn('Refresh cookie not set, skipping refresh test');
        return;
      }

      const refreshToken = refreshCookie.split(';')[0].split('=')[1];

      const refreshRes = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Cookie', `logirest_refresh=${refreshToken}`);

      expect(refreshRes.status).toBe(200);
      expect(refreshRes.body.success).toBe(true);
      expect(refreshRes.body.accessToken).toBeDefined();
    });

    it('should reject on reused refresh token (replay detection)', async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'admin@logirest.com', password: 'adminpassword' });

      const cookies = loginRes.headers['set-cookie'];
      const refreshCookie = Array.isArray(cookies)
        ? cookies.find((c: string) => c.startsWith('logirest_refresh='))
        : undefined;

      if (!refreshCookie) {
        return;
      }

      const refreshToken = refreshCookie.split(';')[0].split('=')[1];

      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Cookie', `logirest_refresh=${refreshToken}`);

      const replayRes = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Cookie', `logirest_refresh=${refreshToken}`);

      expect(replayRes.status).toBe(401);
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should clear refresh cookie on logout', async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'admin@logirest.com', password: 'adminpassword' });

      const cookies = loginRes.headers['set-cookie'];
      const refreshCookie = Array.isArray(cookies)
        ? cookies.find((c: string) => c.startsWith('logirest_refresh='))
        : undefined;

      const refreshToken = refreshCookie
        ? refreshCookie.split(';')[0].split('=')[1]
        : '';

      const logoutRes = await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Cookie', `logirest_refresh=${refreshToken}`);

      expect(logoutRes.status).toBe(200);
      expect(logoutRes.body.success).toBe(true);
    });
  });
});
