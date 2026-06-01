# Implementation Plan: Hardening & E2E Validation (Sprint 4)

**Branch**: `047-hardening-e2e-validation` | **Date**: 2026-06-01 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/047-hardening-e2e-validation/spec.md`

## Summary

Harden LogiRest's diagnostic endpoints, secure user-facing queries with selective soft-deletes, write robust automated E2E test scripts, and establish pilot load verification routines. The core deliverables are:
1. **Pilot Deployment & Rollback Drills**: Construct staging load scripts that simulate 50 concurrent transactions per second to verify serializable database locks, alongside automated recovery rollback commands that pause the CI/CD pipeline upon validation failures.
2. **Playwright Kitchen Request E2E Suites**: Author full Playwright automated E2E tests for the kitchen request lifecycle (drafting, lot deduction, cost entries, and complete transactional reversal during voiding) to prevent silent stock leaks.
3. **Public Route Diagnostics Hardening**: Restructure `/health` to expose only binary statuses publicly, while detailed backup calculations on `/health/backup` require `ADMIN` or `AUDITOR` roles. Secure `/metrics` behind secret keys resolved from system environment configurations.
4. **Selective Soft-Delete Query Filtering**: Transition search and item listing endpoints to apply explicit active checks, while database-level queries resolve historical records successfully. Mount a custom Nocturne 403 screen on client URL scope tampering.
5. **CSRF Protection Integration Tests**: Add integration tests verifying that mutation requests with authentication cookies are blocked with a `403 Forbidden` error when lacking valid `X-XSRF-TOKEN` headers.

---

## Technical Context

**Language/Version**: TypeScript 5.x, Node 20.x  
**Primary Dependencies**: Next.js 16, NestJS 10.x, Prisma 5.x, Playwright, @nestjs/terminus (for health checks), BullMQ  
**Storage**: PostgreSQL (Prisma ORM)  
**Testing**: Jest (unit and integration tests), Playwright (comprehensive E2E testing)  
**Target Platform**: Linux Server / Web Browsers  
**Performance Goals**: 
- Public `/health` loads in < 50ms with 0% DB dependency.
- Rollback disaster recovery restores staging database in under 3 minutes.
- Staging seeder anonymizes cost and PII data across 10k rows in < 10 seconds.
**Constraints**: 
- Load tests determine failure if lock contention deadlocks, or request p95 latency exceeds 500ms.
- Staging seeder sanitizes cost value mathematically using a static randomized factor per item across all records.
- CSRF validation failures trigger `403 Forbidden` response.
- Access to detailed database backup metadata and recovery stats on `/health/backup` is restricted to administrators and auditors.

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Backend Authority**: API endpoints enforce metrics secret tokens, JWT scoping, and CSRF token handshakes on the backend before running operations. (PASSED)
- **Pessimistic Locking**: Concurrent load simulations check serializable database locks (`SELECT FOR UPDATE`) under a peak parallel rate of 50 RPS. (PASSED)
- **No Global Soft-Delete Filtering**: Explicit active queries filter deactivated records in search pages, while permitting historical ledger joins to query inactive item rows successfully. (PASSED)
- **Zero-Trust Scope Enforcement**: Frontend page layers intercept unauthorized URL scope modifications and display dedicated custom `403 Access Denied` views matching the Nocturne aesthetic, validated by the backend Interceptor. (PASSED)

---

## Project Structure

### Documentation (this feature)

```text
specs/047-hardening-e2e-validation/
├── plan.md              # This file
├── research.md          # Phase 0 output: decisions and rationales
├── data-model.md        # Phase 1 output: data masking models and log schemas
├── quickstart.md        # Phase 1 output: E2E and load test bootstrap guidelines
└── contracts/
    └── api-endpoints.md # Phase 1 output: endpoints structure for split health & metrics keys
```

### Source Code (repository root)

```text
apps/api/src/
├── modules/
│   ├── health/          # Split public health check and secure /health/backup modules
│   └── metrics/         # Prometheus metrics endpoints secured by env token validation
└── database/
    └── seed.anonymized.ts # Staging seeder applying item-constant multiplicative jitter

apps/web/src/
├── app/[locale]/(app)/
│   └── errors/
│       └── 403/         # High-density Nocturne Access Denied custom page
└── features/
    └── reports/
        └── components/  # Valuations lists resolving 'Inactive' badges for soft-deleted entities

tests/
├── integration/
│   └── csrf.spec.ts     # Jest CSRF handshake integration tests
└── e2e/
    └── kitchen-request.spec.ts # Playwright kitchen request E2E validation script

scripts/
├── staging-load-test.ts # Simulated parallel transaction stress script
└── database-rollback.sh # Automated staging backup recovery shell script
```

**Structure Decision**: Monorepo Web Application. Keeps testing tools and infrastructure scripts separated from active runtime code, and places split diagnostics modules cleanly in `apps/api`.

---

## Complexity Tracking

*No gates violated. Section is marked N/A.*
