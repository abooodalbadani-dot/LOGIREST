# Quickstart: Phase 0 Security Hardening

This guide explains how to run, verify, and test the cookie-based session storage, token refresh, and 401 interception redirect locally.

---

## 1. Running the Local Environment

Ensure you are on the `010-phase-0-security-hardening` branch:

```bash
git checkout 010-phase-0-security-hardening
```

Ensure dependencies are installed and the development server can start:

```bash
# In e:\Kitchen-Store Inventory System
npm install
npm run dev
```

By default, the application runs in mock mode when `NEXT_PUBLIC_USE_MOCKS` is `true`.

---

## 2. Manual Verification Checklist

### Secure Storage Verification
1. Open the application in your browser (e.g. `http://localhost:3000`).
2. Log in with standard dev credentials (e.g. `admin@logirest.com` / `admin`).
3. Open Browser Developer Tools (`F12`).
4. Select **Application** (Chrome/Edge) or **Storage** (Firefox) tab.
5. Inspect **Local Storage** and **Session Storage** for `localhost:3000`.
   - **Verification**: `logirest_token` MUST NOT be present.
6. Inspect **Cookies** for `localhost:3000`.
   - **Verification**: `logirest_token` MUST contain the active JWT token.

### 401 Interceptor and Redirection Verification
1. To trigger a mock 401, perform an action or wait for the session to expire, or manually tamper with the `logirest_token` cookie value in your browser to render it invalid.
2. Trigger any API call (e.g., refreshing or listing master data).
3. **Verification**:
   - The application intercepts the 401, clears local overrides, and routes to `/login?reason=expired&redirect=<path>`.
   - A warning notification is displayed: "Your session has expired. Please log in again."
   - Log back in; the application should automatically redirect you back to the preserved `<path>`.

### Silent Renewal Verification
1. Reduce the JWT token's lifetime simulation in `mock-api.adapter.ts` to 10 seconds.
2. Authenticate and monitor the **Network** tab in Developer Tools.
3. **Verification**:
   - Every 5 seconds (50% of the token life or 5 minutes before actual expiry), a background call to `POST /auth/refresh` is dispatched.
   - The cookie `logirest_token` is updated with the new token.
