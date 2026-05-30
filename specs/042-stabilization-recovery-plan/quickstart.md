# Quickstart & Developer Verification Guide: LogiRest Engineering Recovery & Stabilization

## Prerequisites

- Node.js 20+ installed
- Docker + docker-compose (for PostgreSQL and the full dev stack)
- AWS CLI configured (for backup/restore drill only)
- `pg_dump` and `psql` binaries available on the host

## 1. Environment Setup

Copy and fill the required environment variables:

```bash
cp docker-compose.env.example .env
```

Required additions for this feature (append to `.env`):

```env
# Backup configuration
BACKUP_S3_BUCKET=logirest-backups
BACKUP_S3_REGION=eu-west-1
BACKUP_S3_ACCESS_KEY_ID=<your-key>
BACKUP_S3_SECRET_ACCESS_KEY=<your-secret>
BACKUP_ENCRYPTION_KEY=<32-byte-hex-key>

# JWT (must not be empty — server will refuse to start if missing)
JWT_ACCESS_SECRET=<your-access-secret>
JWT_REFRESH_SECRET=<your-refresh-secret>
```

## 2. Database Setup & Migration

```bash
# Start PostgreSQL via docker-compose
docker-compose up -d postgres

# Apply all migrations (including the new CHECK constraint migration)
npx prisma migrate deploy --schema=apps/api/prisma/schema.prisma

# Run the production seed (provisions default Main Kitchen department)
npx ts-node apps/api/prisma/seed.prod.ts
```

## 3. Start the Development Stack

```bash
# Start both API and web in watch mode
npm run dev

# Or individually:
npm run dev --filter=api   # NestJS API on :3001
npm run dev --filter=web   # Next.js on :3000
```

## 4. Verification Checklist

### ✅ Pagination Envelope (FR-001, FR-002)

```bash
# Should return { data: [...], meta: { total, page, page_size, total_pages } }
curl -H "Authorization: Bearer <token>" http://localhost:3001/inventory/warehouses
curl -H "Authorization: Bearer <token>" http://localhost:3001/master-data/barcodes
curl -H "Authorization: Bearer <token>" http://localhost:3001/master-data/currencies
curl -H "Authorization: Bearer <token>" http://localhost:3001/audit-logs
```

### ✅ JWT Fail-Fast Startup (FR-003)

```bash
# Start the API without JWT secrets — must terminate immediately
JWT_ACCESS_SECRET= JWT_REFRESH_SECRET= npm run dev --filter=api
# Expected: Fatal error logged, process exits with code 1
```

### ✅ Negative Stock Prevention (FR-012)

```bash
# Attempt to issue more stock than available — must return 400
curl -X POST http://localhost:3001/inventory/issues \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{ "itemId": "<id>", "quantity": 999999, "warehouseId": "<id>" }'
# Expected: 400 Bad Request — "Insufficient stock"
```

### ✅ Health Endpoint (FR-011)

```bash
curl http://localhost:3001/health
# Expected: { "status": "ok" | "degraded", "checks": { "backup": { ... } } }
```

### ✅ Backup Drill (SC-007)

```bash
# Trigger a manual backup run
curl -X POST http://localhost:3001/backup/run \
  -H "Authorization: Bearer <admin-token>"

# Run the restore drill script (requires AWS credentials in env)
bash scripts/backup-restore-drill.sh
# Expected: "PASS — restore completed in X minutes (< 240 minutes)"
```

## 5. Build & Type Validation

```bash
# API typecheck
npm run typecheck --filter=api

# Web typecheck
npm run typecheck --filter=web

# Full monorepo build
npm run build
```

All commands must complete with zero errors before this feature is considered done.
