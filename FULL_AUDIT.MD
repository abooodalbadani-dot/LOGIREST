# Frontend Codebase Audit: Kitchen-Store Inventory System
*Auditor: Senior Enterprise Frontend Architect*
*Date: 2026-05-03*

This deep technical audit assesses the production-readiness, structural integrity, and architectural constraints of the LogiRest Kitchen-Store Inventory System frontend. The analysis highlights severe risks regarding state management, workflow synchronization, and backend integration.

## 1️⃣ PROJECT STRUCTURE ANALYSIS
**Status:** Medium Risk / High Structure

- **Folder Architecture:** Adopts a Feature-Sliced Design (FSD) approach inside `src/features/` which separates concerns well (e.g., `purchasing`, `master-data`, `inventory`).
- **Module Boundaries:** Boundaries are mostly respected, but there is some leakage where master-data hooks are called directly inside feature components (e.g., `pr-form.tsx` uses `useMasterDataList`).
- **Client/Server Components:** Uses App Router. Pages (`page.tsx`) correctly wrap features using server-side localization (`getTranslations`), passing down to `'use client'` interactive boundaries (e.g., `PRFormClient`).
- **Structural Risk:** Extensive use of nested layouts (`MasterDataFormLayout`, `MasterDataDetailLayout`). While DRY, deeply nested client/server interleaving often causes rendering waterfalls when real backend data fetching replaces current dummy/mock hooks.

## 2️⃣ STATE MANAGEMENT ANALYSIS
**Status:** Critical Risk

- **Document State Handling:** There is **no centralized Document State Engine** (like XState or a strict context provider). Status logic (`DRAFT`, `SUBMITTED`, `APPROVED`) relies entirely on React-Query (`usePR`) fetching a string and UI conditionally rendering buttons.
- **Form Architecture:** Built on `react-hook-form` + `zod` schema validation. While robust for fields, the form state mixes business logic with UI state (e.g., `submitConfirmOpen` inside the same component doing the API mutation).
- **Derived Calculations:** Calculations (like FX rates, totals, variances) appear to be done ad-hoc inside specific feature components rather than in a unified data manipulation layer.
- **Backend Sync Risk:** Using `react-query` mutations (`useSubmitPR`, `useApprovePR`) without optimistic locking or versioning (`__v` or updated_at check) will lead to **race conditions** if two users attempt to approve/modify the same document.

## 3️⃣ WORKFLOW CONSISTENCY
**Status:** High Risk

- **Status Logic Consistency:** Scattered. PR, PO, GRN all implement their own specific hardcoded checks (`pr.status !== 'DRAFT'`).
- **Allowed Actions:** Scattered across UI components. There is no `ActionGuard` layer for business rules. If a backend rule changes (e.g., "PO can be edited after SUBMITTED if value < $100"), you will have to dig through `POFormClient`, `PRFormClient`, etc.
- **Disabled States:** Predictable but strictly localized. The "Edit Locked" fallback is duplicated across multiple feature forms.

## 4️⃣ PERMISSION & RBAC LAYER
**Status:** Medium Risk

- **Role Enforcement:** Uses a specialized `<PermissionGate action="view" resource="master_data">` component to wrap sensitive UI elements (like export buttons, approve buttons).
- **Reusable `<Can />` Pattern:** `PermissionGate` acts as this pattern.
- **Vulnerability:** Permissions are currently enforced *mostly* in the UI layout. If the actual routing layer (middleware or server components) does not strictly enforce these same rules, users could bypass the UI gate by navigating directly to URLs like `/purchase-requests/123/approve` or sending POST requests directly.

## 5️⃣ OPERATIONAL SCREENS AUDIT
**Status:** High Risk

- **GRN & Transfer (Ship/Receive):** Missing visible connection to a unified Ledger API. FEFO (First-Expired-First-Out) handling is not visibly enforced via UI warnings during selection.
- **Stocktake:** The workflow separates Counting and Variance Submission. However, preventing operations during stocktake relies on simple localized checks (`warehouse_locked` strings) rather than a robust interceptor that stops all stock-mutating API calls.
- **Table Design:** Good visual structure, but poor technical optimization for high-density operations.

## 6️⃣ TABLE & DATA DENSITY ANALYSIS
**Status:** High Risk

- **Standardization:** Uses a standardized `<DataTable>` component powered by `@tanstack/react-table`.
- **Performance Risks:** The `DataTable` lacks virtualization (e.g., `@tanstack/react-virtual`). Rendering a GRN or Stocktake with 500+ items will cause catastrophic DOM lag and crash low-end POS/tablet devices.
- **Accessibility/Keyboard:** Uses standard HTML tables. Needs strict ARIA roles and keyboard arrow navigation (vital for fast-paced inventory entry).

## 7️⃣ RTL / LTR IMPLEMENTATION
**Status:** Medium Risk / Good Base

- **Direction Control:** Properly controlled at the root `<html>` tag via `dir={locale === "ar" ? "rtl" : "ltr"}` in `layout.tsx`.
- **Tailwind Usage:** Correct use of logical properties (`ps-`, `me-`, `text-start`) instead of hardcoded `pl-` or `text-left`.
- **Mirroring:** Icons (e.g., `ArrowLeft` in RTL) need careful review to ensure they flip contextually, as some lucide-react icons do not flip automatically without specific CSS transforms.

## 8️⃣ BARCODE HANDLING READINESS
**Status:** High Risk

- **Implementation:** `<ScanInput>` component exists with a simple debounce timer (100ms) triggered by character length `> 4`.
- **Vulnerability:** Standard USB/Bluetooth wedge scanners send data rapidly followed by an `Enter` key. The current `onChange` debounce logic conflicts with the `onKeyDown` `Enter` listener, potentially triggering double-submissions.
- **Focus Stealing:** The component attempts to re-focus automatically after blur (`setTimeout` 150ms). This often traps users in the input, breaking accessibility and preventing them from navigating other form fields without a mouse.

## 9️⃣ LEDGER IMMUTABILITY COMPLIANCE
**Status:** Critical Risk

- **Readonly Mode:** `Edit Locked` screens exist, but the protection is entirely UI-based.
- **Immutability Assurance:** Missing a clear structural separation between "Mutable Draft Form" and "Immutable Posted Viewer". Right now, forms like `pr-form.tsx` just conditionally disable inputs. An immutable ledger document should render a strictly read-only component (no form libraries attached) to guarantee zero chance of modification payloads.
- **Reverse/Adjustment:** There is no explicit "Reverse Document" trail visible in the standard flows.

## 🔟 BACKEND INTEGRATION RISK ANALYSIS
**Status:** Critical Risk

- **Dummy/Mock Leakage:** The system currently relies on mock hooks that resolve instantly or with minor delays. When a real API is introduced, the lack of robust optimistic UI rollback mechanisms will break the perceived speed.
- **Missing States:** Global error handling (ErrorBoundary) for failed API fetches seems sparse compared to the localized `isLoading` checks.
- **Transaction Conflicts:** Because there is no `version` tracking on entities, two managers approving the same PR concurrently will result in silent overwrites or backend 500s that the frontend isn't prepared to handle gracefully.

---

## 11️⃣ CRITICAL ISSUES SUMMARY

> [!CAUTION]
> **CRITICAL (Must Fix Before Backend Integration)**
> - **Virtualization in DataTable:** Large GRNs or Stocktakes will crash the browser without `@tanstack/react-virtual`.
> - **Optimistic Locking:** Introduce a `version` or `updated_at` field in form submissions to prevent concurrent overwrite bugs.
> - **Barcode Scanner Race Conditions:** Refactor `<ScanInput>` to exclusively rely on `onSubmit` or `Enter` capture to prevent duplicate wedge scanner inputs.

> [!WARNING]
> **HIGH RISK**
> - **State Engine Absence:** Centralize status transitions (e.g., `DRAFT -> SUBMITTED -> APPROVED`) into a unified state machine or constant map rather than hardcoding string checks in every file.
> - **Focus Trapping:** Remove the aggressive 150ms `setTimeout` refocus in `<ScanInput>` as it severely degrades UX for non-scanner tasks.

> [!IMPORTANT]
> **STRUCTURAL IMPROVEMENTS**
> - **Immutable Viewers:** Create dedicated `ReadonlyDocumentViewer` components instead of using disabled React-Hook-Form instances for posted ledger documents.
> - **Server-Side Gatekeeping:** Ensure `PermissionGate` logic is mirrored identically in `middleware.ts` or server components to prevent URL-based bypasses.

> [!NOTE]
> **UX IMPROVEMENTS**
> - **Icon Mirroring:** Audit `lucide-react` directional icons to ensure they flip via `rtl:rotate-180` where applicable.
> - **Keyboard Navigation:** Add up/down arrow key navigation to data tables for rapid data entry without mouse usage.
