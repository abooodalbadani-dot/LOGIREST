import './otel';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {
  ValidationPipe,
  BadRequestException,
  VersioningType,
} from '@nestjs/common';
import { ValidationError } from 'class-validator';
import cookieParser from 'cookie-parser';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';

import { Logger } from 'nestjs-pino';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  app.useLogger(app.get(Logger));

  // Helmet: set secure HTTP response headers (X-Frame-Options, CSP, HSTS, etc.)
  app.use(helmet());

  // Configure cookie parser middleware
  app.use(cookieParser());

  // Configure CORS
  const allowedOrigins = (
    process.env.FRONTEND_URL || 'http://localhost:3000'
  ).split(',');
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
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

  // Swagger: only expose API docs in non-production environments
  if (process.env.NODE_ENV !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('LogiRest API')
      .setDescription('LogiRest Warehouse & Kitchen Inventory Management API')
      .setVersion('1.0')
      .addBearerAuth()
      .addCookieAuth('jwt')
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
  }

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

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
