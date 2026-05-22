/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  BadRequestException,
} from '@nestjs/common';
import { ValidationError } from 'class-validator';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { BcryptService } from '../src/auth/bcrypt.service';

describe('AuthController (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let bcrypt: BcryptService;

  beforeAll(async () => {
    jest.setTimeout(90000);
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

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
    bcrypt = app.get(BcryptService);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  describe('POST /api/v1/auth/login', () => {
    it('should return 401 for invalid credentials', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'nonexistent@test.com', password: 'wrongpassword' })
        .expect(401);
    });

    it('should return 401 for deactivated user', async () => {
      const hash = await bcrypt.hash('deactivated123');
      await prisma.user.upsert({
        where: { email: 'deactivated@test.com' },
        update: { passwordHash: hash, isActive: false },
        create: {
          email: 'deactivated@test.com',
          passwordHash: hash,
          name: 'Deactivated User',
          role: 'VIEWER',
          isActive: false,
        },
      });

      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'deactivated@test.com', password: 'deactivated123' })
        .expect(401);
    });

    it('should return 200 with access token for valid credentials', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'admin@logirest.com', password: 'adminpassword' })
        .expect(200)
        .then((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.accessToken).toBeDefined();
          expect(res.body.user.email).toBe('admin@logirest.com');
        });
    });
  });

  describe('GET /api/v1/auth/me', () => {
    let accessToken: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'admin@logirest.com', password: 'adminpassword' });
      accessToken = res.body.accessToken;
    });

    it('should return 401 without token', () => {
      return request(app.getHttpServer()).get('/api/v1/auth/me').expect(401);
    });

    it('should return user profile with valid token', () => {
      return request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .then((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.user.email).toBe('admin@logirest.com');
        });
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should return success', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .expect(200)
        .then((res) => {
          expect(res.body.success).toBe(true);
        });
    });
  });
});
