# SMTP Configuration API Endpoint Contract

## 1. Get System Settings
Exposes stored settings (with SMTP password masked).
* **Endpoint**: `GET /api/v1/admin/settings`
* **Headers**:
  * `Authorization: Bearer <token>`
* **Response (200 OK)**:
  ```json
  {
    "smtp_host": "smtp.mailtrap.io",
    "smtp_port": 587,
    "smtp_user": "user123",
    "smtp_password": "********",
    "smtp_encryption": "tls"
  }
  ```

## 2. Update System Settings
* **Endpoint**: `PUT /api/v1/admin/settings`
* **Headers**:
  * `Authorization: Bearer <token>`
  * `Content-Type: application/json`
  * `X-XSRF-TOKEN: <token>`
* **Body**:
  ```json
  {
    "smtp_host": "smtp.mailtrap.io",
    "smtp_port": 587,
    "smtp_user": "user123",
    "smtp_password": "newpassword123",
    "smtp_encryption": "tls"
  }
  ```
* **Response (200 OK)**: Returns the updated settings object.

## 3. Test SMTP Connection
* **Endpoint**: `POST /api/v1/admin/settings/test-email`
* **Headers**:
  * `Authorization: Bearer <token>`
  * `Content-Type: application/json`
  * `X-XSRF-TOKEN: <token>`
* **Body**:
  ```json
  {
    "smtp_host": "smtp.mailtrap.io",
    "smtp_port": 587,
    "smtp_user": "user123",
    "smtp_password": "password123",
    "smtp_encryption": "tls",
    "to": "admin@logirest.app"
  }
  ```
* **Response (201 Created)**:
  ```json
  {
    "success": true,
    "message": "Test email sent successfully."
  }
  ```
