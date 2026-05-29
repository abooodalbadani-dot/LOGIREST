# Technical Research: Phase 0 — Pre-Deploy Blockers

**Branch**: `038-phase0-pre-deploy-blockers` | **Date**: 2026-05-29

This document details the engineering research, options evaluated, and definitive technical decisions for resolving the 7 P0 Pre-Deploy Blockers.

---

## TASK-01 · RTR Token Rotation Atomicity

### Problem Definition
In `rtr.service.ts`, refresh-token rotation is performed via two non-atomic calls: first revoking the current token, then creating a new token. A process crash, database connection drop, or runtime exception between these calls locks the user session permanently.

### Decision
Wrap both operations in an interactive database transaction: `this.prisma.$transaction(async (tx) => { ... })` using the active model's `version` field for optimistic locking.

### Alternatives Evaluated

* **Option A: Non-interactive batch transaction (`$transaction([ ... ])`)**: Rejected because we need to query data and perform conditional checks inside the transaction block before persisting the new token.
* **Option B (Chosen): Interactive transaction (`$transaction(async (tx) => { ... })`)**: Allows executing queries, performing optimistic lock validation, and inserting the new token under a single atomic isolation unit. If any step fails, the transaction is fully rolled back, leaving the old token active and valid.

---

## TASK-02 · JWT Secret Security Validation

### Problem Definition
`auth.module.ts` uses well-known default development keys if environment variables are not set. This makes all production JWTs easily forgeable.

### Decision
Introduce custom Zod refinements (`refine`) inside `env.validation.ts` that explicitly inspect the `NODE_ENV` variable. If `NODE_ENV === 'production'`, the validation rejects known weak default development values and throws a boot-blocking error.

### Alternatives Evaluated

* **Option A: Dynamic module error throwing**: Throwing errors directly inside `AuthModule` instantiation. Rejected because it happens too late in the NestJS initialization cycle.
* **Option B (Chosen): Pre-boot configuration schema validation via Zod**: Enforced during the NestJS bootstrap step inside `env.validation.ts`. Fails fast and blocks the server container from completing its startup cycle.

---

## TASK-03 · Docker Restart Policies

### Problem Definition
Services inside `docker-compose.yml` lack restart configurations. A transient OOM crash or database failure results in permanent service downtime until manual operator intervention.

### Decision
Configure `restart: unless-stopped` on all 5 service containers (db, redis, api, web, caddy).

### Alternatives Evaluated

* **Option A: `restart: always`**: Restarts the container regardless of why it stopped. Rejected because it makes planned shutdowns difficult; the daemon will keep attempting to boot stopped containers upon restart.
* **Option B (Chosen): `restart: unless-stopped`**: Automatically restarts containers in all crash/reboot scenarios *unless* the operator has explicitly stopped the container using `docker compose stop`.

---

## TASK-04 · Docker API & Frontend Healthcheck

### Problem Definition
The API and frontend containers are immediately marked as "healthy" upon container boot. Caddy routes client traffic before the database migrations finish, or before the NestJS/Next.js servers bind to their respective ports, leading to transient HTTP 502/503 errors during deployments.

### Decision
Define explicit `healthcheck` blocks using `curl` probes inside `docker-compose.yml` and bind downstream service routing using the `depends_on: { condition: service_healthy }` constraint.

### Alternatives Evaluated

* **Option A: Standard TCP socket checks**: Pinging ports directly (e.g. `nc -z localhost 4000`). Rejected because it does not verify application readiness (a port might bind before the NestJS bootstrap finishes).
* **Option B (Chosen): Application endpoint probes**: Using `curl -f http://localhost:4000/api/v1/health` with a customized `start_period` of 30 seconds to allow Prisma migrations to complete.

---

## TASK-05 · Idempotent Database Seeding

### Problem Definition
Seeding is run automatically in the Docker startup `CMD`. It uses simple `create` mutations. On any subsequent redeployment, the container crashes due to database unique constraint violations.

### Decision
1. Rewrite `prisma/seed.ts` to use `upsert()` or `findFirst()` checks instead of direct `create()` calls.
2. Remove the seeding invocation from the production Dockerfile `CMD` entirely. Seeding is treated as a manual, one-time operator runbook command during fresh environment setups.

---

## TASK-06 · PostgreSQL Lock Timeout

### Problem Definition
By default, PostgreSQL allows database row locks to wait indefinitely. If a transaction hangs or gets blocked, all subsequent concurrent requests targeting the same rows are blocked, consuming database connection pool limits.

### Decision
Append `lock_timeout=5000` (5 seconds) to the database connection string inside the production environment variable templates. This forces Postgres to abort transactions that are blocked on row locks for more than 5 seconds, failing fast and allowing immediate client retries.

---

## TASK-07 · Backup & Restore Procedure

### Problem Definition
No mechanism exists to recover the database in the event of logical corruption, hardware failures, or disaster events.

### Decision
Develop two dedicated shell scripts (`scripts/backup.sh` and `scripts/restore.sh`) and document their operational execution inside a revised `RUNBOOK.md`.

* `backup.sh`: Invokes `pg_dump` with custom binary format (`-Fc`) and implements an automatic 30-day file prune cycle using `find -mtime +30 -delete`.
* `restore.sh`: An interactive recovery tool that enforces strict user verification (typing `RESTORE` to confirm) and handles database dropping/recreation.
