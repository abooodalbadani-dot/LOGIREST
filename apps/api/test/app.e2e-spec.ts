/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  BadRequestException,
} from '@nestjs/common';
import { ValidationError } from 'class-validator';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Set global API prefix, excluding /health
    app.setGlobalPrefix('api/v1', {
      exclude: ['health'],
    });

    // Flat structured validation error formatting function
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

    // Global ValidationPipe config
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
  });

  it('/api/v1 (GET) - Root Hello World', () => {
    return request(app.getHttpServer())
      .get('/api/v1')
      .expect(200)
      .expect('Hello World!');
  });

  it('/health (GET) - Excluded from Prefix', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .then((res) => {
        expect(res.body.status).toBe('OK');
        expect(res.body.timestamp).toBeDefined();
      });
  });

  it('/api/v1/health (GET) - Should 404 (Prefix Excluded)', () => {
    return request(app.getHttpServer()).get('/api/v1/health').expect(404);
  });

  it('/api/v1/test-validation (POST) - Valid Payload', () => {
    return request(app.getHttpServer())
      .post('/api/v1/test-validation')
      .send({ name: 'Kitchen Store' })
      .expect(201)
      .then((res) => {
        expect(res.body.success).toBe(true);
        expect(res.body.data.name).toBe('Kitchen Store');
      });
  });

  it('/api/v1/test-validation (POST) - Invalid Payload (Structured Validation Errors)', () => {
    return request(app.getHttpServer())
      .post('/api/v1/test-validation')
      .send({ name: '' })
      .expect(400)
      .then((res) => {
        expect(res.body.success).toBe(false);
        expect(res.body.errors).toBeDefined();
        expect(res.body.errors).toHaveLength(1);
        expect(res.body.errors[0]).toEqual({
          field: 'name',
          message: 'Name should not be empty',
        });
      });
  });

  afterAll(async () => {
    await app.close();
  });
});
