# Developer Quickstart & Verification: LogiRest Risk Remediation

This guide outlines setup requirements, environment variables, and verification commands to test and compile the risk remediation features.

---

## 1. Environment Configurations (`.env`)

Add the following required variables to your local `apps/api/.env` file:

```bash
# JWT Access and Refresh Secrets (Fatal startup validation - TASK-005)
JWT_ACCESS_SECRET="generate-secure-64-character-string-here"
JWT_REFRESH_SECRET="generate-another-secure-64-character-string-here"

# Database Automated Backup Strategy (TASK-001)
BACKUP_S3_BUCKET="logirest-backups"
BACKUP_S3_ENDPOINT="http://localhost:9000" # MinIO dev URL
BACKUP_S3_ACCESS_KEY="minio-dev-user"
BACKUP_S3_SECRET_KEY="minio-dev-password"
BACKUP_RETENTION_DAYS=7

# External Alerting Channel Webhook (TASK-018)
ALERT_WEBHOOK_URL="https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX"

# Swagger API Basic Auth Credentials (TASK-020)
SWAGGER_ENABLED=true
SWAGGER_USER="admin"
SWAGGER_PASSWORD="super-secret-docs-password"
```

---

## 2. Dev Stack Setup

To run local S3 storage (MinIO) and visual metrics dashboards (Prometheus, Grafana) alongside PostgreSQL:

```bash
# Launch database and infrastructure containers
docker-compose up -d
```

---

## 3. Database Migration

Generate and execute the Prisma migrations to update User, KitchenRequest, YieldBatch, PasswordResetToken models, raw check constraints, and performance indexes:

```bash
# Generate database schema definitions
npx prisma generate --schema=apps/api/prisma/schema.prisma

# Create and apply migrations
npx prisma migrate dev --name risk_remediation_changes --schema=apps/api/prisma/schema.prisma
```

---

## 4. Compilation & Code Verification

Ensure that the NestJS API builds cleanly under strict TypeScript modes, with no ESLint violations:

```bash
# Build the NestJS API
npm run build --filter=api

# Run TypeScript typechecks across the Next.js frontend and packages
npm run typecheck --filter=web

# Run NestJS API unit and integration test suites
npm run test --workspace=apps/api
```
