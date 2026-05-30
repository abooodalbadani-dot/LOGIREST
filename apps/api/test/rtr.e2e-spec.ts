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
import { getQueueToken } from '@nestjs/bullmq';

jest.setTimeout(180000);

describe('Refresh Token Rotation (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    jest.setTimeout(90000);
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
    const queue = app.get(getQueueToken('outbox'));
    jest.spyOn(queue, 'add').mockResolvedValue({ id: 'mock-job-id' } as any);
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  describe('Refresh Token Rotation Lifecycle (e2e)', () => {
    it('should complete the full Refresh Token Rotation lifecycle including silent refresh, replay attack detection, and session logout', async () => {
      console.log('E2E TEST PROGRESS: Starting Step 1 (Login)...');
      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'admin@logirest.com', password: 'Password123!' });

      expect(loginRes.status).toBe(200);
      const cookies = loginRes.headers['set-cookie'];
      const refreshCookie = Array.isArray(cookies)
        ? cookies.find((c: string) => c.startsWith('logirest_refresh='))
        : undefined;
      expect(refreshCookie).toBeDefined();
      const refreshToken1 = refreshCookie.split(';')[0].split('=')[1];

      console.log('E2E TEST PROGRESS: Starting Step 2 (Silent Refresh)...');
      const refreshRes = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Cookie', `logirest_refresh=${refreshToken1}`);

      expect(refreshRes.status).toBe(200);
      expect(refreshRes.body.success).toBe(true);
      expect(refreshRes.body.accessToken).toBeDefined();

      const refreshCookies2 = refreshRes.headers['set-cookie'];
      const refreshCookie2 = Array.isArray(refreshCookies2)
        ? refreshCookies2.find((c: string) => c.startsWith('logirest_refresh='))
        : undefined;
      expect(refreshCookie2).toBeDefined();
      const refreshToken2 = refreshCookie2.split(';')[0].split('=')[1];

      console.log(
        'E2E TEST PROGRESS: Starting Step 3 (Replay Attack Preparations)...',
      );
      // Clear out previous alerts first
      console.log('E2E TEST PROGRESS: Deleting previous outboxEvents...');
      await prisma.outboxEvent.deleteMany({
        where: { eventType: 'SECURITY_ALERT_REPLAY_ATTACK' },
      });
      console.log('E2E TEST PROGRESS: Deleting previous notificationLogs...');
      await prisma.notificationLog.deleteMany({
        where: { targetRole: 'ADMIN' },
      });

      console.log('E2E TEST PROGRESS: Making Replay Attack Request...');
      const replayRes = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Cookie', `logirest_refresh=${refreshToken1}`);

      console.log(
        'E2E TEST PROGRESS: Replay Attack Request Completed. Checking Assertions...',
      );
      expect(replayRes.status).toBe(401);

      // Verify outbox alert event was created in database
      const outboxEvent = await prisma.outboxEvent.findFirst({
        where: { eventType: 'SECURITY_ALERT_REPLAY_ATTACK' },
        orderBy: { createdAt: 'desc' },
      });
      expect(outboxEvent).toBeDefined();
      expect(outboxEvent?.payload).toBeDefined();
      expect(outboxEvent?.status).toBe('PENDING');

      // Verify transactional in-system notification targeting Role.ADMIN is created
      const notification = await prisma.notificationLog.findFirst({
        where: { targetRole: 'ADMIN' },
        orderBy: { createdAt: 'desc' },
      });
      expect(notification).toBeDefined();
      expect(notification?.message.toLowerCase()).toContain(
        'replay attack detected',
      );

      console.log('E2E TEST PROGRESS: Starting Step 4 (Logout)...');
      const logoutRes = await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Cookie', `logirest_refresh=${refreshToken2}`);

      expect(logoutRes.status).toBe(200);
      expect(logoutRes.body.success).toBe(true);
      console.log('E2E TEST PROGRESS: Completed All Steps Successfully!');
    }, 180000);
  });
});
