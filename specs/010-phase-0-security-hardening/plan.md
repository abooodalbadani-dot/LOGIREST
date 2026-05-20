# Implementation Plan: Phase 0 Security Hardening

**Branch**: `010-phase-0-security-hardening` | **Date**: 2026-05-21 | **Spec**: [spec.md](file:///e:/Kitchen%E2%80%91Store%20Inventory%20System/specs/010-phase-0-security-hardening/spec.md)
**Input**: Feature specification from `/specs/010-phase-0-security-hardening/spec.md`

## Summary

The goal of this feature is to secure the frontend authentication layer by executing the Phase 0 Security Hardening tasks:
1. **Remove token-leaking logs**: Strip plain-text auth tokens and response logging from `apiClient` (`client.ts`).
2. **HttpOnly Cookie Migration**: Migrate the session token storage from vulnerable `localStorage` to a secure, HttpOnly cookie (`logirest_token`).
3. **401 Interceptor**: Intercept API requests returning `401 Unauthorized` status and trigger automated redirect to `/login?reason=expired` while preserving the return URL.
4. **Token Refresh & Silent Renewal**: Proactively refresh authentication tokens before they expire to ensure uninterrupted warehouse operations.

## Technical Context

**Language/Version**: TypeScript / Next.js 16 (App Router)
**Primary Dependencies**: React 19, Zod, next-intl, TanStack Query.
**Storage**: HttpOnly Cookies (`logirest_token`), `localStorage` for non-sensitive preferences (`logirest_user_overrides`, `logirest_active_scope`).
**Testing**: Vitest for unit tests, Playwright for E2E tests, and manual verification.
**Target Platform**: Browser (Web)
**Project Type**: web-application
**Performance Goals**: Redirect user to `/login?reason=expired` within 1.5s of session expiry; 0 token logs.
**Constraints**: Do NOT rename `proxy.ts` to `middleware.ts` (Next.js 16 configuration constraint).
**Scale/Scope**: Universal (Applied globally to all api request/response pipelines).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **Zero instability**: Security hardening directly prevents credential theft and logs contamination without modifying existing core features.
- [x] **Strict Phase Order**: Security hardening is Phase 0 (Prerequisite Step) before any stabilization or recovery steps can be deployed.
- [x] **No UI Redesign**: The UI remains untouched. A standard system toast is used for session expiry notifications.
- [x] **RTL Integrity**: Session expiry messages and redirect warnings utilize `next-intl` dictionary keys to ensure translation parity between English and Arabic.

## Project Structure

### Documentation (this feature)

```text
specs/010-phase-0-security-hardening/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (to be generated later)
```

### Source Code (repository root)

```text
apps/web/
├── src/
│   ├── app/
│   │   └── [locale]/
│   │       └── (auth)/
│   │           └── login/
│   │               └── page.tsx      # Read expired reason and display toast
│   ├── providers/
│   │   └── AuthProvider.tsx         # Manage session lifecycle, proactive renew
│   ├── lib/
│   │   └── api/
│   │       └── client.ts             # Remove logs, cookies integration, 401 interception
│   ├── proxy.ts                      # Ensure SSR route protection can read cookie
│   └── infrastructure/
│       └── mock/
│           └── mock-api.adapter.ts   # Mock endpoints for auth refresh, login, logout
```

**Structure Decision**: Standard Next.js App Router structure within the `apps/web` workspace. Changes will target the shared auth provider, API client utility, proxy routing middleware, and mock endpoints.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | N/A |
