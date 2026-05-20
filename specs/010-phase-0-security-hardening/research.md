# Research: Phase 0 Security Hardening

This document records the design decisions and technical investigations for implementing secure session storage, 401 redirection, and silent token renewal in the LogiRest frontend.

---

## 1. Secure Token Storage: HttpOnly Cookies

### Decision
Store the session token (`logirest_token`) in a secure, HttpOnly, SameSite=Lax cookie rather than `localStorage`.

### Rationale
- **XSS Mitigation**: `localStorage` is accessible to client-side scripts, making JWTs vulnerable to theft via Cross-Site Scripting (XSS). HttpOnly cookies prevent JavaScript from accessing the token (`document.cookie` returns empty for HttpOnly cookies).
- **SameSite Protection**: Using `SameSite=Lax` shields the application from Cross-Site Request Forgery (CSRF) for cross-site navigation, which is the standard default for session tokens.

### Alternatives Considered
- **In-Memory Token + Refresh Token Cookie**:
  - *Why rejected*: Storing the access token in memory and refresh token in a cookie requires complex state syncing across tabs and page reloads. A single session cookie simplifies tab syncing and aligns with the Next.js SSR architecture.

### Mock Environment Simulation
Since the developer environment is powered by a client-side mock adapter (`mock-api.adapter.ts`) that intercepts network calls inside the browser before they hit the network, we will simulate the HttpOnly cookie:
- In mock mode, `mock-api.adapter.ts` will write to `document.cookie` with standard parameters.
- Although browser security policies prevent making a client-written cookie truly `HttpOnly` (JavaScript can still inspect it in mock mode), the codebase will be written *as if* it is HttpOnly. The main application code will never access `document.cookie` or store tokens in `localStorage`.
- In production, the backend server will return the `Set-Cookie` header with the `HttpOnly` flag.

---

## 2. 401 Response Interception and Tab-Safe Renewal

### Decision
Implement a centralized interceptor in `apiClient` to handle 401 errors. If a request returns `401 Unauthorized`, it will attempt a token refresh. If the refresh fails, it will dispatch a custom event `auth:expired`.

### Rationale
- **Centralized Error Handling**: Having a single response interceptor in the API client guarantees that every network request respects authentication lifecycle rules.
- **Race Condition Prevention (Parallel Refresh Storms)**: When multiple parallel API requests encounter a 401 status simultaneously, they must not initiate multiple separate refresh requests. We will implement a singleton refresh Promise in `apiClient`. All interceptors waiting on a refresh will wait on this same Promise, and then retry their original requests.

### Alternatives Considered
- **Direct Redirection in API Client**:
  - *Why rejected*: The API client lacks router context and user state-cleaning utilities. Emitting a custom event (`auth:expired`) decouples the network utility from the UI routing mechanism.

---

## 3. Proactive Silent Session Renewal

### Decision
The `AuthProvider` will decode the JWT token on app mount and login, and schedule a timer to request `/auth/refresh` 5 minutes before the token expires.

### Rationale
- **Zero Interruption**: Warehouse and kitchen staff should not experience active session termination while actively using the system. Proactive renewal updates the cookie before requests start failing with 401.

### Alternatives Considered
- **Only Reactive Renewal (On 401)**:
  - *Why rejected*: If we only renew when a 401 is received, the user experiences a slight latency penalty on the request that triggered the 401. Proactive background renewal makes the auth process completely transparent.
