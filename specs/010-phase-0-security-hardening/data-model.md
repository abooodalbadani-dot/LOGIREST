# Data Model: Phase 0 Security Hardening

This document defines the structures and attributes for authentication and session management.

---

## 1. User Session Entity

Represents an active, authenticated session.

### Schema

```typescript
interface UserSession {
  /** Unique session identifier */
  id: string;
  /** Encoded JWT token payload */
  token: string;
  /** Expiration timestamp (ISO 8601 format) */
  expires_at: string;
  /** The user entity associated with the session */
  user: AuthUser;
}
```

---

## 2. JWT Payload Claims

The structure of the token stored in the `logirest_token` cookie.

```json
{
  "sub": "usr-12345",
  "name": "Barakat Amin",
  "role": "INV_MGR",
  "exp": 1716300000,
  "user": {
    "id": "usr-12345",
    "name": "Barakat Amin",
    "email": "barakat@logirest.com",
    "role": "INV_MGR",
    "scopes": [
      {
        "branch_id": "br-main",
        "warehouse_id": "wh-central",
        "department_id": "dept-kitchen"
      }
    ]
  }
}
```

---

## 3. Cookie Storage Specs

The parameters utilized for the `logirest_token` cookie.

| Parameter | Value | Description |
|-----------|-------|-------------|
| **Name** | `logirest_token` | The cookie identifier. |
| **HttpOnly** | `true` | Prevents access via client-side JavaScript APIs (`document.cookie`). |
| **Secure** | `true` | Ensures cookie is only sent over HTTPS (disabled on localhost/HTTP in development). |
| **SameSite** | `Lax` | Protects against CSRF on cross-site navigations while allowing initial navigation. |
| **Path** | `/` | Cookie is scoped to the entire application route hierarchy. |
