# Data Model: Authentication & Security

This document outlines the data model and schema modifications required to support authentication and security scopes.

## 1. Schema Modifications

### Extended Model: `User` (in `schema.prisma`)
We will add a relation to track refresh tokens for session management and token rotation replay protection.

```prisma
model User {
  // Existing fields...
  id           String              @id @default(uuid())
  email        String              @unique
  passwordHash String
  name         String
  role         Role
  isActive     Boolean             @default(true)
  version      Int                 @default(1)
  createdAt    DateTime            @default(now())
  updatedAt    DateTime            @updatedAt

  // New Relation
  refreshTokens RefreshToken[]

  // Existing relations...
  warehouseScopes  UserWarehouseScope[]
  purchaseRequests PurchaseRequest[]
  approvalEvents   ApprovalEvent[]
  warehouseLocks   WarehouseLock[]
  stocktakeCounts  StocktakeCount[]
  auditLogs        AuditLog[]

  @@map("users")
}
```

---

### New Model: `RefreshToken` (in `schema.prisma`)
This table manages active user sessions and supports concurrent session isolation and Refresh Token Rotation (RTR).

```prisma
model RefreshToken {
  id            String   @id @default(uuid())
  tokenHash     String   @unique
  userId        String
  sessionId     String   // Groups tokens generated under the same login session
  parentTokenId String?  // Stores the ID of the token that rotated into this one
  expiresAt     DateTime
  isRevoked     Boolean  @default(false)
  createdAt     DateTime @default(now())
  version       Int      @default(1)

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([sessionId])
  @@map("refresh_tokens")
}
```

---

## 2. Validation & Security Rules

### User Credentials Validation
- **Email**: Must be validated using a regex email format. Unique constraint check.
- **Password**: Must be hashed using `bcrypt` (with a work factor of 12) before database insertion. Raw passwords must never be stored.

### Session Lifecycle Rules
- **Access Token (JWT)**:
  - Lifespan: Exactly 15 minutes.
  - Payload signature verified on every request using a secure environment variable `JWT_ACCESS_SECRET`.
  - Contents: `userId`, `email`, `role`.
- **Refresh Token (Cookie)**:
  - Cookie properties: `HttpOnly = true`, `SameSite = "Strict"`, `Secure = true`, `Path = "/api/v1/auth/refresh"`.
  - Lifespan: e.g., 7 days.
  - Contains `sessionId` and token ID inside its signed payload, matched against `tokenHash` in the database.

---

## 3. Auditing Events

Mutations to security states must log entries to the `AuditLog` table:

| Event Type | Action Code | Target Table | Description |
|---|---|---|---|
| User Login | `USER_LOGIN` | `users` | Logged upon successful user login. |
| User Logout | `USER_LOGIN_REVOKED` | `refresh_tokens` | Logged upon session termination/logout. |
| Scope Access Violation | `SCOPE_ACCESS_VIOLATION` | `warehouses` | Logged when a user tries to access a warehouse ID that is not within their database scopes. |
| Token Replay Attack | `REFRESH_TOKEN_REPLAY` | `refresh_tokens` | Logged when a previously revoked refresh token is reused. All session tokens are revoked. |
