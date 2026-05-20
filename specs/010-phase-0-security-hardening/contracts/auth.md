# Auth Service Contracts

This file defines the API contracts for the authentication services modified during the security hardening phase.

---

## 1. Login Endpoint

Authenticates a user and sets the HTTP session cookie.

- **URL**: `/auth/login`
- **Method**: `POST`
- **Request Headers**:
  - `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "email": "user@logirest.com",
    "password": "securepassword"
  }
  ```
- **Response Headers**:
  - `Set-Cookie: logirest_token=<JWT>; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=86400`
- **Response Body (200 OK)**:
  ```json
  {
    "user": {
      "id": "usr-12345",
      "name": "Barakat Amin",
      "email": "user@logirest.com",
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

## 2. Refresh Endpoint

Proactively renews an active session token before expiration.

- **URL**: `/auth/refresh`
- **Method**: `POST`
- **Request Headers**:
  - `Content-Type: application/json`
- **Request Cookies**:
  - `logirest_token=<JWT>` (automatic)
- **Response Headers**:
  - `Set-Cookie: logirest_token=<NEW_JWT>; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=86400`
- **Response Body (200 OK)**:
  ```json
  {
    "status": "success",
    "expires_at": "2026-05-22T08:00:00Z"
  }
  ```
- **Response Body (401 Unauthorized)**:
  ```json
  {
    "code": "SESSION_EXPIRED",
    "message": "Your session has expired. Please log in again."
  }
  ```

---

## 3. Logout Endpoint

Terminates the user session on the server and clears client cookies.

- **URL**: `/auth/logout`
- **Method**: `POST`
- **Request Cookies**:
  - `logirest_token=<JWT>`
- **Response Headers**:
  - `Set-Cookie: logirest_token=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`
- **Response Body (200 OK)**:
  ```json
  {
    "status": "success",
    "message": "Logged out successfully"
  }
  ```
