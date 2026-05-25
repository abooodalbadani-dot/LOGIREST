# Quickstart & Verification Guide: Phase 3 Hardening

This document provides developers and deployers with clear instructions on how to set up, run, and verify the Phase 3 Observability, Security & Deployment Hardening features in the LogiRest system.

## 1. Local Containerized Infrastructure Setup

A standalone local message broker (Redis) container is included in the developer container composition to support background queues.

### Starting the Application Stack
1. Ensure Docker is running.
2. Run the following command from the repository root to build and boot the services (Next.js frontend, NestJS backend, PostgreSQL database, and Redis):
   ```bash
   docker-compose -f docker-compose.yml up --build
   ```
3. To verify that all containers are healthy:
   ```bash
   docker-compose ps
   ```

## 2. Fail-Fast Client Configuration Verification

The Next.js client application must fail immediately at startup if local mocks are disabled and no API URL is configured.

### Negative Scenario Test (Verify Fail-Fast)
1. Edit your local `.env` file in the frontend directory `apps/web/`.
2. Set or confirm that `NEXT_PUBLIC_USE_MOCKS` is strictly `false` (or missing).
3. Comment out or delete `NEXT_PUBLIC_API_URL`.
4. Launch the Next.js development server:
   ```bash
   npm run dev --filter=web
   ```
5. **Expected Outcome**: The terminal must output a fatal initialization error (e.g. `Fatal Error: NEXT_PUBLIC_API_URL configuration is missing`) and immediately terminate the startup process.

## 3. Secure Cookie & RTR Verification

User sessions are secured using HttpOnly cookies with Refresh Token Rotation (RTR).

### Verification Steps
1. Open your browser and navigate to the LogiRest login page.
2. Log in using a valid user account.
3. Open the browser's Developer Tools (F12) and go to the **Console** tab.
4. Execute `document.cookie`.
   - **Expected Outcome**: The returned string must not contain `access_token` or `refresh_token` (confirming `HttpOnly` is active).
5. Switch to the **Network** tab, perform an inventory mutation or page transition, and select the outgoing request.
   - **Expected Outcome**: Verify that the browser automatically sent the authentication cookies in the headers.
6. Trigger a session refresh or wait for the access token to expire.
   - **Expected Outcome**: The client requests `/auth/refresh` sending the `refresh_token` cookie. The backend rotates the token, invalidating the old family record, and returns two fresh secure cookies.

## 4. Active Health Check Verification

The `/health` endpoint must dynamically monitor database connectivity.

### Normal Status Test
1. Query the health check route:
   ```bash
   curl -i http://localhost:4000/health
   ```
2. **Expected Outcome**: Returns `200 OK` with JSON indicating that the database is healthy.

### Outage Recovery Test
1. Stop the PostgreSQL database service:
   ```bash
   docker-compose stop db
   ```
2. Query the health check route:
   ```bash
   curl -i http://localhost:4000/health
   ```
3. **Expected Outcome**: Returns `503 Service Unavailable` with details indicating database connectivity failure.
4. Restart the database container:
   ```bash
   docker-compose start db
   ```
5. Query `/health` again and verify that status dynamically returns to `200 OK`.

## 5. Transactional Outbox Worker Verification

Notifications are logged atomically inside the transaction and processed asynchronously using BullMQ.

### Verification Steps
1. Create or approve a Purchase Order.
2. Verify that the operation commits immediately on the UI.
3. Query the database table `outbox_events` and confirm that a record was added with `status = 'SENT'` (or `FAILED` if email configuration is mock/offline).
4. Succeeded records will remain in the database for exactly **7 days** for audit verification, after which the daily cleanup job deletes them.
5. Failed logs will remain indefinitely in the database.
