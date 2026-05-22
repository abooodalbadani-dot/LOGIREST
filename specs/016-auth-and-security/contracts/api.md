# API Contract: Authentication & Security Endpoints

This document specifies the contract endpoints, request/response formats, headers, and error codes for the LogiRest security modules.

## 1. Authentication Endpoints

### 1.1 Login
Authenticate a user and establish a secure session.

* **URL**: `/api/v1/auth/login`
* **Method**: `POST`
* **Request Headers**:
  * `Content-Type`: `application/json`
* **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "SecretPassword123"
  }
  ```
* **Success Response**:
  * **Code**: `200 OK`
  * **Set-Cookie**: `logirest_refresh=<Token>; HttpOnly; SameSite=Lax; Path=/api/v1/auth/refresh; Secure` (Secure omitted in local dev)
  * **Response Body**:
    ```json
    {
      "accessToken": "eyJhbGciOi...",
      "user": {
        "id": "c30f4e3c-f4b6-4de5-bd35-fbbe30df4001",
        "email": "user@example.com",
        "nameAr": "اسم المستخدم",
        "nameEn": "User Name",
        "role": "INV_MGR"
      }
    }
    ```
* **Error Responses**:
  * **Code**: `401 Unauthorized` (Invalid credentials or inactive user account)
    ```json
    {
      "statusCode": 401,
      "message": "Invalid email or password"
    }
    ```

---

### 1.2 Silent Session Refresh
Rotate the active session refresh token and issue a new short-lived access token.

* **URL**: `/api/v1/auth/refresh`
* **Method**: `POST`
* **Request Cookies**:
  * `logirest_refresh`: `<Token>`
* **Success Response**:
  * **Code**: `200 OK`
  * **Set-Cookie**: `logirest_refresh=<NewToken>; HttpOnly; SameSite=Lax; Path=/api/v1/auth/refresh; Secure`
  * **Response Body**:
    ```json
    {
      "accessToken": "eyJhbGciOi..."
    }
    ```
* **Error Responses**:
  * **Code**: `401 Unauthorized` (Expired, tampered, or already-replayed refresh token)
    ```json
    {
      "statusCode": 401,
      "message": "Session expired or invalid"
    }
    ```

---

### 1.3 Logout
Terminate the active session and invalidate the refresh token cookie.

* **URL**: `/api/v1/auth/logout`
* **Method**: `POST`
* **Success Response**:
  * **Code**: `200 OK`
  * **Set-Cookie**: `logirest_refresh=; HttpOnly; SameSite=Lax; Path=/api/v1/auth/refresh; Max-Age=0; Secure`
  * **Response Body**:
    ```json
    {
      "success": true
    }
    ```

---

### 1.4 Get Profile
Retrieve details of the currently authenticated user session.

* **URL**: `/api/v1/auth/me`
* **Method**: `GET`
* **Headers**:
  * `Authorization`: `Bearer <accessToken>`
* **Success Response**:
  * **Code**: `200 OK`
  * **Response Body**:
    ```json
    {
      "id": "c30f4e3c-f4b6-4de5-bd35-fbbe30df4001",
      "email": "user@example.com",
      "nameAr": "اسم المستخدم",
      "nameEn": "User Name",
      "role": "INV_MGR",
      "warehouseScopes": [
        {
          "warehouseId": "wh-001-uuid",
          "branchId": "br-001-uuid"
        }
      ]
    }
    ```

---

## 2. Scoping Headers (IDOR Protection)

All operational and inventory API routes (except auth/public status routes) MUST require scope identifiers passed as HTTP headers.

### Required Headers:
* `x-warehouse-id`: The UUID of the target warehouse.
* `x-branch-id`: The UUID of the target branch.

### Error Codes for Scoping Guard:
* **Missing Headers**: `400 Bad Request` if `x-warehouse-id` or `x-branch-id` is omitted.
  ```json
  {
    "statusCode": 400,
    "message": "Missing active scope headers: x-warehouse-id, x-branch-id"
  }
  ```
* **Unauthorized Scope**: `403 Forbidden` if the requested warehouse/branch IDs do not map to the authenticated user's scopes in the database.
  ```json
  {
    "statusCode": 403,
    "message": "Access denied: Scope not authorized"
  }
  ```
