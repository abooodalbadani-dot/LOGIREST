# Data Model: Route Integrity Audit Report Schema

The audit report (`audit-report.md`) follows a strict schema to ensure clarity and actionable results.

## Report Structure

### 1. Route Integrity Table
| Path | Status | Guard | Notes |
| :--- | :--- | :--- | :--- |
| `/dashboard` | `Active` | `Protected` | Primary entry point |
| `/login` | `Active` | `Public` | Auth entry point |
| `/old-page` | `Orphan` | `Protected` | No references found |
| `/inventory/[id]` | `Review` | `Protected` | Dynamic path construction |

### 2. Broken References Table
| Source File | Target Path | Issue |
| :--- | :--- | :--- |
| `components/Sidebar.tsx` | `/wrong-path` | 404 - Route not found |

## Status Enums

### Route Status
- `Active`: Verified static reference found in the codebase.
- `Orphan`: No static references found. Candidate for removal or linking.
- `Review`: Dynamic path construction detected. Requires manual verification.
- `Entry`: Known entry point (e.g., Dashboard, Login).

### Guard Status
- `Protected`: Route is subject to the `logirest_token` check in `proxy.ts`.
- `Public`: Route is explicitly listed in `publicPaths` in `proxy.ts`.
- `Bypass`: Route is excluded from the middleware `matcher` (e.g., assets, internal).

## Validation Rules
- All `page.tsx` files must be accounted for.
- Every `Active` route must have at least one valid source in the Navigation Mapping.
- Every `Orphan` route must be justified or marked for deletion in the follow-up tasks.
