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

describe('Scope Isolation (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

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
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  describe('Scope header validation', () => {
    let accessToken: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'admin@logirest.com', password: 'Password123!' });
      accessToken = res.body.token;
    });

    it('should skip scope check for auth endpoints', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(200);
    });

    it('should return 400 when scope headers are missing on non-exempt route', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/test-scope')
        .set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Missing active scope headers');
    });

    it('should return 403 for unauthorized scope (warehouse not scoped to user)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/test-scope')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-warehouse-id', '00000000-0000-0000-0000-000000000099')
        .set('x-branch-id', '00000000-0000-0000-0000-000000000099');

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Access denied: Scope not authorized');
    });

    it('should return 403 for scope IDOR (warehouse belongs to different branch)', async () => {
      const mainWh = await prisma.warehouse.findFirst({
        where: { code: 'WH-HQ-01' },
      });
      const northBranch = await prisma.branch.findFirst({
        where: { code: 'NORTH' },
      });
      expect(mainWh).toBeDefined();
      expect(northBranch).toBeDefined();

      const res = await request(app.getHttpServer())
        .get('/api/v1/test-scope')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-warehouse-id', mainWh!.id)
        .set('x-branch-id', northBranch!.id);

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Access denied: Scope not authorized');
    });

    it('should return 200 for valid authorized scope', async () => {
      const mainWh = await prisma.warehouse.findFirst({
        where: { code: 'WH-HQ-01' },
      });
      const mainBranch = await prisma.branch.findFirst({
        where: { code: 'HQ' },
      });
      expect(mainWh).toBeDefined();
      expect(mainBranch).toBeDefined();

      const res = await request(app.getHttpServer())
        .get('/api/v1/test-scope')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-warehouse-id', mainWh!.id)
        .set('x-branch-id', mainBranch!.id);

      expect(res.status).toBe(200);
      expect(res.text).toBe('scope-ok');
    });
  });
});
