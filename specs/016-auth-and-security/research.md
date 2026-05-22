# Research: Token Rotation & Scope Interception

This document details the architectural research and technical decisions resolved for the Authentication & Security feature.

## 1. Refresh Token Rotation (RTR) and Session Revocation

### The Problem
Refresh Token Rotation (RTR) ensures that refresh tokens are single-use. However, if a refresh token is stolen, a malicious actor might attempt to use it. If the legitimate user also attempts to use it (or vice-versa), one of them will perform a "replay" (re-using a token that has already been rotated). We must detect this immediately and invalidate the entire session chain (all active tokens generated from that root session).

### Decision
We will model refresh tokens using a linked family tree:
1. Every successful login generates a new `sessionId` (representing the concurrent session root) and a `RefreshToken` record.
2. The refresh token contains the `sessionId` and a hash of the token.
3. When a client performs a silent refresh:
   - The server queries the database for the active refresh token matching the cookie.
   - If the token is found and is **not** revoked, it is marked as `isRevoked = true` (or deleted/replaced), and a new refresh token is issued with the same `sessionId`.
   - If the token is found but is **already revoked**, this indicates a **replay attack** (token reuse). The server must immediately look up all refresh tokens with the same `sessionId` and mark them all as revoked (`isRevoked = true`) or delete them from the database, force-logging out all devices associated with that session.
   - If the token is not found in the database at all (e.g., deleted), the request is rejected.

### Alternatives Considered
- *Stateless JWT Blacklisting*: Storing revoked tokens in Redis. Rejected because introducing Redis adds architectural complexity (additional container/service dependency) not required by the project scale. Leveraging PostgreSQL with appropriate indexing on `sessionId` and `tokenHash` handles this with negligible latency.
- *Single session per user*: Restricting users to exactly one session. Rejected because of requirement **FR-009**, which explicitly mandates concurrent sessions support.

---

## 2. Scope Isolation (IDOR Prevention) via NestJS Interceptor

### The Problem
We need to ensure that users can only query or mutate inventory resources for the branch and warehouse they are authorized for. The scopes are supplied in headers: `x-warehouse-id` and `x-branch-id`. We need to:
1. Extract these headers.
2. Validate against the `UserWarehouseScope` table to check if the user is assigned to this warehouse.
3. Inject the validated scope parameters into the request context, allowing down-stream controllers/services to implicitly scope queries (e.g., `where: { warehouseId }`).
4. Log any violation to `AuditLog`.

### Decision
We will implement a NestJS `ScopeInterceptor` implementing `NestInterceptor`:
- It runs after the `JwtAuthGuard` (meaning the request is already authenticated and `req.user` is populated).
- It extracts the `x-warehouse-id` and `x-branch-id` headers.
- If they are missing:
  - If the route is marked public, or belongs to exempt routes (e.g., `/auth/**` or `/admin/**` or basic profile routes), we skip validation.
  - Otherwise, it throws a `400 Bad Request` or `403 Forbidden` (since target scope is missing).
- It queries the database `UserWarehouseScope` to verify the mapping between `req.user.id` and the requested `warehouseId`.
- If unauthorized:
  - It writes a record to the `AuditLog` table:
    - `userId`: the authenticated user's ID.
    - `action`: `UNAUTHORIZED_SCOPE_ACCESS`.
    - `targetTable`: `Warehouse`.
    - `targetId`: the attempted warehouse ID.
    - `beforeStateJson`: `""`.
    - `afterStateJson`: serialized JSON containing headers, user details, and attempted scope.
  - Throws a `403 Forbidden` error with "Scope not authorized".
- If authorized:
  - It injects `warehouseId` and `branchId` into the request context (e.g., `req.activeWarehouseId` and `req.activeBranchId`).
  - Downstream handlers can access these fields using a custom decorator `@ActiveScope()` or directly from the request object.

---

## 3. JWT and User Active Verification Overhead

### The Problem
**FR-010** states: "The authentication guard MUST query the database on every incoming request to verify that the user ID extracted from the access token exists and that the user's `isActive` flag is true."
Doing a database lookup on every request can introduce database query overhead and latency.

### Decision
We will proceed with the database lookup because:
1. Database index lookups on primary key `User.id` in PostgreSQL take <1ms, which easily satisfies the success criteria of <5ms overhead per request.
2. It guarantees real-time security. If an administrator deactivates an account, access is blocked instantly (in the same second) rather than waiting 15 minutes for the JWT access token to expire.
3. To optimize, the lookup will select only `id` and `isActive` fields from the `User` table (using Prisma `select: { id: true, isActive: true, role: true }`) to minimize payload and serialization overhead.
