# Logirest Monorepo

Welcome to the **Logirest** monorepo workspace. This project contains the frontend and backend applications for the Kitchen-Store Inventory System.

## Project Structure

The project is structured as an npm workspaces monorepo:

*   **`apps/web`**: Next.js 16+ frontend web application.
*   **`apps/api`**: NestJS 11+ backend API service.
*   **`packages/shared-types`**: Compiler-free TypeScript workspace package sharing RBAC rules, document statuses, capability actions, and workflow engine configurations directly between frontend and backend.

## Architecture & Integration

### Shared Package (`@logirest/shared-types`)
*   Provides a compiler-free workspace type definitions.
*   Uses TS Path Mappings (`@logirest/shared-types/*`) configured in `tsconfig.base.json` and respective app tsconfigs.
*   Includes:
    *   `rbac.ts`: User roles and segment scopes.
    *   `contracts/statuses.ts`: Unified document status configurations.
    *   `contracts/role-capabilities.ts`: Lowercase operational and UI capabilities mapped per role.
    *   `workflow/document-engine.ts`: Document status transitions and lock states.

### Backend API (`apps/api`)
*   Scaffolded using NestJS 11+.
*   Global routing prefix configured as `api/v1` (excluding the `/health` endpoint).
*   Configured with `cookie-parser` and CORS with credentials support.
*   Implements a custom flat validation response formatting:
    ```json
    {
      "success": false,
      "errors": [
        {
          "field": "propertyName",
          "message": "Validation error description"
        }
      ]
    }
    ```

## Development Commands

Run commands from the root directory using npm workspaces or Turbo Repo:

### Run Development Servers
```bash
# Run all apps in development mode
npm run dev

# Run only backend
npx turbo run dev --filter=api

# Run only frontend
npx turbo run dev --filter=web
```

### Typecheck & Compile Mappings
```bash
# Verify type safety across the entire monorepo
npm run typecheck
```

### Build for Production
```bash
# Build the backend API
npx turbo run build --filter=api

# Build the frontend Web client (subject to i18n-audit)
npx turbo run build --filter=web
```

### Run Tests
```bash
# Run backend e2e tests
npm run test:e2e --workspace=api

# Run backend unit tests
npm run test --workspace=api
```

---

## 🔒 Security Warning: Production Secrets Management

> [!CAUTION]
> **CRITICAL SECURITY REQUIREMENT FOR PRODUCTION**
> 
> Never check in, expose, or share plaintext production secrets. In production environments, critical environment variables **MUST** be managed securely via an enterprise secrets vault (e.g., **AWS Secrets Manager**, **Vercel Environment Variables**, **Docker Secrets**, **Google Secret Manager**, or **Azure Key Vault**).
> 
> The affected secrets are:
> 1. `JWT_ACCESS_SECRET` - Protects secure session and access token generation.
> 2. `JWT_REFRESH_SECRET` - Secures token rotation and user session validation.
> 3. `ENCRYPTION_KEY` - Used to encrypt sensitive DB configurations (e.g., SMTP passwords).
> 
> Failing to manage these securely in production puts user sessions and system integrity at risk.