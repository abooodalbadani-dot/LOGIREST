# Implementation Plan: Security Replay Attack Alerts

**Branch**: `028-replay-attack-alerts` | **Date**: 2026-05-25 | **Spec**: [specs/028-replay-attack-alerts/spec.md](./spec.md)
**Input**: Feature specification from `/specs/028-replay-attack-alerts/spec.md`

## Summary

TASK-002 addresses a critical security vulnerability where token replay detection alerts are silently swallowed by the system. While `rtr.service.ts` correctly detects refresh token replay attacks and writes `SECURITY_ALERT_REPLAY_ATTACK` events to the outbox, the `OutboxWorker` does not process these events, falling back to a `default` case that discards them.

We will resolve this by:
1. Implementing a robust case handler in `OutboxWorker.resolveRecipients()` to dynamically resolve active administrator email addresses at dispatch time.
2. Implementing a security template in `OutboxWorker.renderTemplate()` with formatted incident details (timestamp, affected user, session, IP address).
3. Modifying `rtr.service.ts` to write an in-system notification directly to the database within the atomic transaction block alongside the outbox event writing.
4. Implementing the robust retry policy (5 retries over 1 hour with exponential backoff) in the outbox processing loop.

---

## Technical Context

**Language/Version**: TypeScript / Node.js 20 / NestJS 10  
**Primary Dependencies**: BullMQ, Redis, Nodemailer, NestJS, Prisma  
**Storage**: PostgreSQL (via Prisma Client)  
**Testing**: Jest (Unit and E2E integration tests)  
**Target Platform**: Linux Server / Docker Monorepo  
**Project Type**: Monorepo Web Application (Backend API in `apps/api`)  
**Performance Goals**: Email alerts queued within 5 seconds; in-system notifications created within 3 seconds of replay detection.  
**Constraints**: Outbox retry policy of 5 attempts maximum over 1 hour; dynamic resolution of administrators.  
**Scale/Scope**: Core security auditing and notification system.  

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Rule Category | Constitution Guideline | Compliance Status | Rationale |
| :--- | :--- | :---: | :--- |
| **Monorepo Architecture** | Strictly separate concerns; do not mix NestJS code in Next.js web application. | **COMPLIANT** | All changes are encapsulated in `apps/api` (the backend server authority). |
| **State Machine Parity** | Verify all transitions check database status and capabilities. | **COMPLIANT** | Security replay events are immutable audits, not document transitions. |
| **Immutable Auditing** | Mutating ledger/session states must write immutable audit logs with before/after states. | **COMPLIANT** | RTR service already records the audit log transactionally; our change extends notifications atomicity. |
| **IDOR Prevention** | Payload-provided scopes are untrusted; verify via interceptor. | **COMPLIANT** | Resolves target admins entirely server-side; does not trust client payload. |

---

## Project Structure

### Documentation (this feature)

```text
specs/028-replay-attack-alerts/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── checklists/
    └── requirements.md  # Spec quality checklist
```

### Source Code (repository root)

```text
apps/api/src/
├── auth/
│   └── rtr.service.ts         # Injects in-system notifications within transaction
├── modules/
│   ├── outbox/
│   │   ├── outbox.worker.ts   # Resolves and renders SECURITY_ALERT_REPLAY_ATTACK events
│   │   └── email.service.ts   # Dispatches brand-wrapped security template
│   └── notifications/
│       └── notification.service.ts
```

**Structure Decision**: Option 2 (Monorepo structure with backend changes restricted to NestJS api app). All components are fully isolated within `apps/api`.

---

## Complexity Tracking

*All constitution checks have passed successfully. No architectural violations are introduced.*
