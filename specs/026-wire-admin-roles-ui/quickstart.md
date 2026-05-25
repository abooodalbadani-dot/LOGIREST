# Quickstart Guide: Wire Admin Roles UI to Real Backend API

This guide provides steps to verify, run, and understand the real roles implementation.

## How it Works

1. **Backend Integration**: 
   - A NestJS service queries active user counts grouped by roles via Prisma.
   - The static maps from `@logirest/shared-types` are used to populate role names, descriptions, and static capability grids.
   - The controllers guard the endpoint strictly using NestJS JWT authorization roles guards.
2. **Frontend Wiring**:
   - The frontend React hook `useAdminRoles` fetches from the real `GET /admin/roles` API.
   - The permissions grid is fully populated with read-only state indicators matching code-managed capacities.

## Testing & Verification

### Running Backend Unit Tests
Verify role list aggregation and query logic by running service tests:
```bash
npm run test --filter=api apps/api/src/modules/admin/admin.service.spec.ts
```

### Running E2E Integrations
Validate role access control and controller response payloads:
```bash
npm run test:e2e --filter=api apps/api/test/admin-roles.e2e-spec.ts
```

### Local Dev Verification
1. Boot NestJS API and Next.js frontend:
   ```bash
   npm run dev
   ```
2. Log in as an Administrator (`ADMIN`) role.
3. Access the `/admin/roles` dashboard.
4. Verify that real user counts matching PostgreSQL active users render instantaneously without latency simulation or hardcoded profiles.
5. Log in as a standard user (`WH_KEEPER`) and verify that visiting `/admin/roles` throws `403 Forbidden` and displays a clean error banner.
