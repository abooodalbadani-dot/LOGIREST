import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { ValidationError } from 'class-validator';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configure cookie parser middleware
  app.use(cookieParser());

  // Configure CORS
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  });

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

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
