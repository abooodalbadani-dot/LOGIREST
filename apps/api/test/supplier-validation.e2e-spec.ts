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

describe('Supplier Validation (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let accessToken: string;
  let branchId: string;
  let warehouseId: string;

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

    // Get Auth Token
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@logirest.com', password: 'Password123!' });
    accessToken = res.body.token;

    // Fetch seeded branch and warehouse to set active scope headers
    const branch = await prisma.branch.findFirst({ where: { code: 'HQ' } });
    const warehouse = await prisma.warehouse.findFirst({
      where: { code: 'WH-HQ-01' },
    });
    branchId = branch!.id;
    warehouseId = warehouse!.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  it('should successfully create a supplier with null optional contact fields', async () => {
    // Generate a unique code to avoid conflict errors
    const randomCode = `SUP-TST-${Math.floor(1000 + Math.random() * 9000)}`;

    const res = await request(app.getHttpServer())
      .post('/api/v1/suppliers')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-branch-id', branchId)
      .set('x-warehouse-id', warehouseId)
      .send({
        name: 'Validation Test Supplier',
        code: randomCode,
        contactEmail: null,
        contactPhone: null,
        contactName: null,
        isActive: true,
      });

    console.log('STATUS:', res.status);
    console.log('BODY:', JSON.stringify(res.body, null, 2));

    // Expecting 201 Created or 200 OK
    expect([200, 201]).toContain(res.status);
    expect(res.body.contactEmail).toBe('');
    expect(res.body.contactPhone).toBe('');
    expect(res.body.contactName).toBe('');

    // Clean up created test supplier
    if (res.body.id) {
      await prisma.supplier.delete({
        where: { id: res.body.id },
      });
    }
  });
});
