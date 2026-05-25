# Technical Research: Observability, Security & Deployment Hardening (Phase 3)

This document establishes the technical research, architectural decisions, and alternatives evaluated for the Phase 3 production hardening of the LogiRest Kitchen-Store Inventory System.

## Decision 1: Secure HttpOnly Cookie Authentication

### Background & Context
Session tokens (JWTs) must be protected from Cross-Site Scripting (XSS) attacks. If stored in client-side localStorage or generic accessible cookies, compromised third-party scripts can extract them to hijack sessions.

### Chosen Approach
Deliver the `access_token` and `refresh_token` as separate cookies issued directly by the backend API:
- `HttpOnly`: Prevents client-side scripts from reading the cookie (`document.cookie` is empty).
- `Secure`: Ensures cookies are only transmitted over TLS/HTTPS connections.
- `SameSite=Strict`: Restricts cookie propagation to strict same-domain requests, mitigating Cross-Site Request Forgery (CSRF).
- Continue supporting Refresh Token Rotation (RTR) and family revocation by reading the refresh token cookie directly in the `/auth/refresh` endpoint and updating both cookies upon rotation.

### Alternatives Considered
1. **Header-based Authorization (Status Quo)**: Rejected because storing the token in client memory/localStorage is highly vulnerable to XSS.
2. **SameSite=Lax**: Rejected. Although Lax allows top-level navigations to send cookies, Strict is highly preferred for enterprise inventory systems operating under the same domain to prevent any cross-site request exposure.

---

## Decision 2: Fail-Fast API Configuration Check

### Background & Context
"Magic" auto-detection or silent fallbacks for environment variables (like pointing to a fallback staging environment if undefined) leads to accidental production-to-development data leakage and configuration mismatch bugs.

### Chosen Approach
Enforce a strict, non-silent fail-fast configuration check at client application startup:
- Rely strictly on `NEXT_PUBLIC_API_URL`.
- If `NEXT_PUBLIC_USE_MOCKS` is strictly `false` (or missing/false by default) AND `NEXT_PUBLIC_API_URL` is undefined, throw a fatal startup error and halt the client application boot process.

### Alternatives Considered
1. **Auto-Detect Port / URL**: Rejected. Guessing ports (e.g. defaulting to `localhost:3000`) introduces runtime surprises and environment divergence.
2. **Silent Staging Fallback**: Rejected. Prevents testing errors but silently exposes environments to connecting to unauthorized endpoints.

---

## Decision 3: Database Health Check Ping

### Background & Context
A static `/health` check that returns `{ status: "OK" }` without testing real database connectivity leads to broken containers remaining active in production routing, masking database failures.

### Chosen Approach
Integrate Prisma connection pings inside the backend's `/health` endpoint:
- Issue a direct database query (e.g. `SELECT 1` or `prisma.$queryRaw`) within the health check check-flow.
- Return `200 OK` on active connection; return `503 Service Unavailable` with details when database connection is unreachable or timed out.

### Alternatives Considered
1. **Static HTTP Health Checks**: Rejected. Masks real backend health.
2. **Third-Party Agent Checks**: Rejected. Adds unnecessary infrastructure complexity when a simple Prisma connection ping covers the container health check.

---

## Decision 4: Asynchronous Transactional Outbox (BullMQ & Redis)

### Background & Context
Inline synchronous dispatches of emails or notifications slow down core inventory transactions and cause the entire database transaction to fail if the third-party email service experiences latency or outages.

### Chosen Approach
Implement the **Transactional Outbox Pattern**:
- Create an `OutboxEvent` table.
- Commit the core data changes (e.g. Purchase Order updates) and the corresponding `OutboxEvent` record in a single, atomic database transaction.
- Provision a standalone **Redis** container in `docker-compose.yml` for local development.
- A background worker (using **BullMQ**) polls the outbox table, serializes events, and dispatches them asynchronously.
- Enforce a **7-day retention policy** for succeeded events for auditing and log-bloat prevention. Retain failed events indefinitely.

### Alternatives Considered
1. **Synchronous Email Dispatch (Status Quo)**: Rejected. Introduces unacceptable latency and transactional fragility.
2. **Immediate Message Queue Push (without Outbox)**: Rejected. Pushing to a message broker outside of the database transaction runs the risk of a "Dual Write" failure (e.g., database transaction fails, but email has already been dispatched).

---

## Decision 5: Multi-Stage Production Packaging

### Background & Context
Production containers must be minimal, secure, and exclude development dependencies or source file compilation tools to minimize attack surface and image size.

### Chosen Approach
Provide highly optimized, multi-stage `Dockerfile` and `docker-compose.yml` configs:
- Multi-stage builds compile source files in a builder stage and copy only required production artifacts and `node_modules` to the final minimal runner stage.
- Local compose configurations define the client, API, and local Redis containers to ensure dev-prod consistency.
