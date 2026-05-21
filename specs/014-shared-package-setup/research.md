# Research & Design Decisions: Shared Package Setup & Scaffolding

This document details the research findings, design patterns, and architectural decisions for Phase 1: Shared Package Setup & Scaffolding.

## 1. Build-Free Monorepo Workspace Referencing

### The Challenge
We want a shared package (`@logirest/shared-types`) that does not require a compilation step (`npm run build`) before its types/schemas can be consumed by `apps/web` (Next.js) and `apps/api` (NestJS). Having to pre-compile the types package causes development latency, compiler mismatch errors, and out-of-sync builds.

### Decision & Rationale
We will configure TypeScript path mapping in the monorepo. This allows consuming applications to resolve `@logirest/shared-types` directly from its raw source code (`packages/shared-types/src/index.ts`).

1. **Root `package.json`**:
   Configured with npm workspaces to register `apps/*` and `packages/*`.
2. **Shared Package `package.json`**:
   ```json
   {
     "name": "@logirest/shared-types",
     "version": "1.0.0",
     "private": true,
     "main": "./src/index.ts",
     "types": "./src/index.ts"
   }
   ```
3. **Consuming Applications' `tsconfig.json`**:
   Add paths to resolve the package directly:
   ```json
   "compilerOptions": {
     "paths": {
       "@logirest/shared-types": ["../../packages/shared-types/src/index.ts"],
       "@logirest/shared-types/*": ["../../packages/shared-types/src/*"]
     }
   }
   ```

This guarantees 0 compile steps for the shared package during development. Any type change in `packages/shared-types` is immediately picked up by Next.js and NestJS.

---

## 2. Standardized Validation Error Formatting

### The Challenge
Under **FR-004**, NestJS must reject invalid DTO payloads with a standardized JSON structure:
```json
{
  "success": false,
  "errors": [
    { "field": "email", "message": "Email is invalid" }
  ]
}
```
Default NestJS validation returns a structure like:
```json
{
  "statusCode": 400,
  "message": ["email must be an email"],
  "error": "Bad Request"
}
```

### Decision & Rationale
We will override the default NestJS `ValidationPipe` exception factory to transform validation errors.

```typescript
import { ValidationPipe, BadRequestException } from '@nestjs/common';

export const globalValidationPipe = new ValidationPipe({
  whitelist: true,
  transform: true,
  exceptionFactory: (validationErrors = []) => {
    const formattedErrors = validationErrors.map((error) => {
      // Flatten constraints (e.g. isEmail, minLength) into a single string
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
});
```

---

## 3. Security, CORS, and Cookie Transport

### Authentication Cookie
Under **FR-005**, the cookie-based authentication transport must use:
- **Name**: `logirest_token`
- **Attributes**: HTTP-only (`httpOnly: true`), `sameSite: 'lax'`, `path: '/'`, and `secure: true` in production (based on `NODE_ENV === 'production'`).

We will integrate `cookie-parser` middleware in NestJS:
```typescript
import * as cookieParser from 'cookie-parser';
app.use(cookieParser());
```

### CORS Configuration
CORS will be explicitly configured in `apps/api/src/main.ts` using NestJS configuration:
```typescript
app.enableCors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-warehouse-id', 'x-branch-id'],
});
```
This ensures the browser is permitted to send credentials (cookies) to the backend.

---

## 4. Root Health Check and Excluded Prefix Routing

### The Challenge
All API routes must run under the versioned prefix `/api/v1` except for `/health`.

### Decision & Rationale
NestJS allows excluding routes from the global prefix.
In `apps/api/src/main.ts`:
```typescript
app.setGlobalPrefix('api/v1', {
  exclude: ['health'],
});
```
This keeps `/health` at the root path, which is critical for standard load balancers and orchestrator health checks.
