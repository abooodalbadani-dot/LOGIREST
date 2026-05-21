# Quickstart Guide: Shared Package Setup & Scaffolding

This document provides concrete commands, file templates, and steps to initialize the `@logirest/shared-types` workspace package and scaffold the NestJS API gateway.

---

## 1. Setup `@logirest/shared-types` Package

Create a package workspace under `packages/shared-types`.

### Step 1.1: Create Directory and Package Configuration
Create `packages/shared-types/package.json`:
```json
{
  "name": "@logirest/shared-types",
  "version": "1.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "dependencies": {
    "zod": "^3.22.0"
  }
}
```

### Step 1.2: Populate Raw Source Files
Create `packages/shared-types/src/index.ts`:
```typescript
export * from './schemas';
export * from './workflows';
```

Create `packages/shared-types/src/workflows/index.ts`:
```typescript
export interface StateTransition {
  from: string;
  to: string;
  authorizedRoles: string[];
  requiresReason?: boolean;
}

export interface WorkflowMap {
  documentType: string;
  states: string[];
  transitions: StateTransition[];
}

export const transitionMapV2: Record<string, WorkflowMap> = {
  PURCHASE_REQUEST: {
    documentType: 'PURCHASE_REQUEST',
    states: ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'CANCELLED'],
    transitions: [
      { from: 'DRAFT', to: 'SUBMITTED', authorizedRoles: ['REQUESTER', 'MANAGER'] },
      { from: 'SUBMITTED', to: 'APPROVED', authorizedRoles: ['MANAGER', 'ADMIN'] },
      { from: 'SUBMITTED', to: 'REJECTED', authorizedRoles: ['MANAGER', 'ADMIN'], requiresReason: true },
      { from: 'DRAFT', to: 'CANCELLED', authorizedRoles: ['REQUESTER', 'MANAGER'] },
      { from: 'SUBMITTED', to: 'CANCELLED', authorizedRoles: ['REQUESTER', 'MANAGER'] }
    ]
  }
};
```

---

## 2. Path Aliases Mapping (No Pre-Compile)

To resolve `@logirest/shared-types` directly from raw TypeScript source files, add paths mapping configurations to the applications' TypeScript configurations.

### `tsconfig.json` / `tsconfig.base.json` Configuration:
```json
{
  "compilerOptions": {
    "paths": {
      "@logirest/shared-types": ["../../packages/shared-types/src/index.ts"],
      "@logirest/shared-types/*": ["../../packages/shared-types/src/*"]
    }
  }
}
```

---

## 3. Scaffolding `apps/api` via NestJS

Follow these steps to scaffold the backend API gateway container using the NestJS CLI.

### Step 3.1: Execution commands to initialize NestJS project
From the root workspace directory, run:
```bash
npx -y @nestjs/cli new apps/api --package-manager npm --strict
```
*(Clean up unnecessary files created by default in `apps/api` e.g., git repo files inside `apps/api/.git` if created, maintaining monorepo root git governance.)*

### Step 3.2: Configure Monorepo Workspace References
Update root `package.json` to include `"apps/api"` under `workspaces` if not already present.

---

## 4. Configuring Security, CORS, Cookie Parsing, and Global Pipes

Modify `apps/api/src/main.ts` to implement security and validation formatting rules:

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Expose root health check endpoint while keeping routing version prefix
  app.setGlobalPrefix('api/v1', {
    exclude: ['health'],
  });

  // Enable cookie transport support
  app.use(cookieParser());

  // Configure strict CORS policies
  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-warehouse-id', 'x-branch-id'],
  });

  // Override ValidationPipe exception factory for structured responses (FR-004)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      exceptionFactory: (validationErrors = []) => {
        const formattedErrors = validationErrors.map((error) => {
          const constraints = error.constraints ? Object.values(error.constraints) : [];
          return {
            field: error.property,
            message: constraints.join('. ') || 'Invalid value',
          };
        });

        return new BadRequestException({
          success: false,
          errors: formattedErrors,
        });
      },
    }),
  );

  await app.listen(process.env.PORT || 4000);
}
bootstrap();
```

---

## 5. Exposing Standardized `/health` Check Endpoint

Initialize a health module at `apps/api/src/health/`.

`health.controller.ts`:
```typescript
import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  private readonly startTime = Date.now();

  @Get()
  getHealth() {
    return {
      status: 'healthy',
      database: 'connected', // Will be integrated with Prisma check later
      uptime: Math.floor((Date.now() - this.startTime) / 1000), // in seconds
    };
  }
}
```
