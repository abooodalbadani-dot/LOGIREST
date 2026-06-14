import './otel';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import {
  ValidationPipe,
  BadRequestException,
  VersioningType,
} from '@nestjs/common';
import { ValidationError } from 'class-validator';
import cookieParser from 'cookie-parser';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { json, urlencoded } from 'express';
import type { Request, Response, NextFunction } from 'express';

import { Logger } from 'nestjs-pino';
import { TransformInterceptor } from './interceptors/transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
    bodyParser: false,
  });

  const rootDir = process.cwd().includes('apps')
    ? join(process.cwd(), '..', '..')
    : process.cwd();
  const uploadsDir = join(rootDir, 'apps', 'web', 'public', 'uploads');

  if (!existsSync(uploadsDir)) {
    mkdirSync(uploadsDir, { recursive: true });
  }

  app.useStaticAssets(uploadsDir, {
    prefix: '/uploads',
  });
  app.useStaticAssets(uploadsDir, {
    prefix: '/api/v1/uploads',
  });

  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ limit: '10mb', extended: true }));

  app.useLogger(app.get(Logger));

  // Helmet: set secure HTTP response headers (X-Frame-Options, CSP, HSTS, etc.)
  app.use(helmet());

  // Configure cookie parser middleware
  app.use(cookieParser());

  // Configure CORS
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://localhost',
      'http://127.0.0.1:3000',
      'http://127.0.0.1',
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'x-idempotency-key',
      'x-department-id',
      'x-branch-id',
      'x-warehouse-id',
      'x-xsrf-token',
    ],
  });

  // Set global API prefix, excluding /health and /metrics
  app.setGlobalPrefix('api', {
    exclude: ['health', 'metrics'],
  });

  // Enable URI-based versioning globally (defaulting to version '1')
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // Swagger: HTTP Basic Auth protection for Swagger UI in all environments except development
  const nodeEnv = process.env.NODE_ENV || 'development';
  if (nodeEnv !== 'development') {
    app.use('/api/docs', (req: Request, res: Response, next: NextFunction) => {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        res.setHeader(
          'WWW-Authenticate',
          'Basic realm="Otantik Restuarant Swagger Docs"',
        );
        return res.status(401).send('Unauthorized');
      }

      const auth = Buffer.from(authHeader.split(' ')[1] || '', 'base64')
        .toString()
        .split(':');
      const user = auth[0];
      const pass = auth[1];

      const expectedUser = process.env.SWAGGER_USER || 'admin';
      const expectedPass = process.env.SWAGGER_PASS || 'logirest123';

      if (user === expectedUser && pass === expectedPass) {
        return next();
      }

      res.setHeader(
        'WWW-Authenticate',
        'Basic realm="Otantik Restuarant Swagger Docs"',
      );
      return res.status(401).send('Unauthorized');
    });
  }

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Otantik Restuarant API')
    .setDescription(
      'Otantik Restuarant Warehouse & Kitchen Inventory Management API',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addCookieAuth('jwt')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

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

  // Register Global Interceptor for camelCase transformation and name fallback
  app.useGlobalInterceptors(new TransformInterceptor());

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
