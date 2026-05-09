# STRICT FRONTEND RECOVERY MASTER PLAN

## Project Context
**System:** Kitchen-Store Inventory System
**Stack:** Next.js App Router, TypeScript, React Query, React Hook Form, Custom apiClient, Turborepo
**Scale:** 100+ Concurrent Users Across Branches
**Focus:** Frontend Stabilization, i18n Parity, Concurrency Guards, UX Workflow Completeness.
**Financial Impact Constraint:** Zero tolerance for concurrency bugs, data loss, or unhandled UI states.

---

## PHASE 0 — Freeze & Baseline
**Objective:** Halt architectural drift, establish a verifiable baseline, and snapshot the current state of errors before beginning recovery.
**Scope:** Whole monorepo, specifically `apps/web`.

**Actions & Commands:**
1. **Branch Creation:** Freeze current state into a protected recovery branch.
   ```powershell
   git checkout -b recovery/frontend-stabilization
   ```
2. **TypeScript Baseline Snapshot:**
   ```powershell
   npx tsc --noEmit --project apps/web/tsconfig.json > apps/web/baseline_ts_errors.log
   ```
3. **ESLint Baseline Snapshot:**
   ```powershell
   npx eslint "apps/web/src/**/*.{ts,tsx}" -f json -o apps/web/baseline_eslint.json
   ```

**Strict Enforcement:**
- **Risk Level:** Low (Non-destructive)
- **Hidden Failure Modes:** Local uncommitted changes distorting the baseline; ignoring Next.js build cache artifacts.
- **Cross-Module Impact:** Establishes a global metric boundary; applies to all `apps/web`.
- **Regression Detection Method:** CI pipeline must reject any PR that increases the error count above these baseline numbers.
- **Rollback Strategy:** `git checkout main` and delete the recovery branch.
- **Measurable Completion Metrics:** 
  - 1 Protected Baseline Branch Created.
  - Exactly 1 `baseline_ts_errors.log` generated and committed.
  - Exactly 1 `baseline_eslint.json` generated and committed.

---

## PHASE 1 — Route & Navigation Integrity Audit
**Objective:** Ensure all pages are reachable, detect orphaned routes, and map the frontend router accurately.
**Scope:** `apps/web/src/app` and navigation components (e.g., Sidebar, Header).

**Actions & Commands:**
1. **Extract All Routes:** Find all Next.js App Router pages.
   ```powershell
   Get-ChildItem -Path "apps/web/src/app" -Recurse -Filter "page.tsx" | Select-Object FullName
   ```
2. **Detect Orphan Pages:** Cross-reference extracted routes against `Link` tags and programmatic `router.push`.
   ```powershell
   rg "href=|router\.push" apps/web/src
   ```
3. **Map Routes to Menu Items:** Generate an exhaustive audit table.

**Strict Enforcement:**
- **Risk Level:** Medium (Routing changes can break deep links)
- **Hidden Failure Modes:** Middleware intercepting routes incorrectly; localized routes (`/[locale]/...`) causing false positives in orphan detection; dynamic routes (`[id]`) not handled.
- **Cross-Module Impact:** Changes in routing affect global navigation state, breadcrumb context, and role-based access control (RBAC).
- **Regression Detection Method:** E2E Playwright test asserting HTTP 200 on the top 50 critical system paths.
- **Rollback Strategy:** Revert specific `page.tsx` moves/deletions. Enforce HTTP 301 redirects for any altered public/deep-linked paths.
- **Measurable Completion Metrics:** 
  - 100% of defined disk routes mapped in a formal audit table.
  - 0 Unlinked Orphan Pages remaining in the codebase.
  - 100% of routes protected by layout-level authentication guards.
  - 100% of dynamic routes (`[id]`, `[locale]`, etc.) must have at least one navigational entry point.

---

## PHASE 2 — i18n Full Parity & Key Hardening
**Objective:** Eradicate raw English text in UI, synchronize English and Arabic namespaces, and remove generic placeholders like "طلبات المطبخ".
**Scope:** `apps/web/messages/en.json`, `apps/web/messages/ar.json`, and all `.tsx` UI files.

**Actions & Commands:**
1. **Detect Namespace Drift:** Run Python script to detect structural differences between JSON files.
   ```powershell
   python scratch/find_dupes.py 
   ```
2. **Detect Raw Keys / Un-translated Text in UI:** 
   ```powershell
   rg "(?<!t\()>\s*[a-zA-Z][a-zA-Z0-9 ]+\s*<" apps/web/src/app apps/web/src/components
   ```
3. **Detect Placeholders:** Find repetitive placeholder values used to bypass translation completeness.
   ```powershell
   rg "طلبات المطبخ" apps/web/messages/ar.json
   ```

**Strict Enforcement:**
- **Risk Level:** High (Broken i18n keys display raw text/placeholders, destroying enterprise credibility)
- **Hidden Failure Modes:** Dynamic translation keys (e.g., `t('status.' + dynamicVar)`) evading static analysis; Next-intl caching stale translations.
- **Cross-Module Impact:** Pervasive. Affects all UI components, modals, select dropdowns, and toast notifications.
- **Regression Detection Method:** Pre-commit hook running a strict JSON key-matching algorithm to prevent asymmetric language files.
- **Rollback Strategy:** Git revert of `messages/*.json` and corresponding UI files. Run `npm run clean` to flush the Next.js translation cache.
- **Measurable Completion Metrics:** 
  - 0 missing keys between `ar.json` and `en.json` (Absolute 1:1 parity).
  - 0 instances of placeholder strings (e.g., "طلبات المطبخ") used improperly.
  - 100% of user-facing UI text wrapped in the `t()` or `<NextIntlClientProvider>` translation engine.

---

## PHASE 3 — Mutation & Redirect Compliance Audit
**Objective:** Standardize how data is mutated, ensure `apiClient` is used consistently, and verify proper Next.js routing usage.
**Scope:** All client-side data mutations, hooks, and navigation flows.

**Actions & Commands:**
1. **Enforce `mutateAsync`:** Ensure promise awaiting for sequenced operations.
   ```powershell
   rg "\.mutateAsync\(" apps/web/src
   ```
2. **Detect Eager Routing:** Look for `router.push` outside of `onSuccess` callbacks.
   ```powershell
   rg "router\.push\(['\`\"]/" apps/web/src
   ```
3. **Verify Version Passing for Conflict Layer:** Ensure all update/edit mutations send the `version` field to trigger HTTP 409 when appropriate.
   ```powershell
   rg "version:" apps/web/src/lib/api
   ```

**Strict Enforcement:**
- **Risk Level:** Critical (Financial/Data Integrity impact on concurrent writes)
- **Hidden Failure Modes:** `mutate` firing without awaiting, causing race conditions; 409 Conflict logic bypassed by optimistic UI updates; double-submissions on slow networks.
- **Cross-Module Impact:** Affects Master Data, Inventory counting, and Procurement approvals.
- **Regression Detection Method:** Automated API testing simulating concurrent submissions to explicitly test the HTTP 409 global interceptor.
- **Rollback Strategy:** Revert mutation hook implementations to previous state. Feature-flag the global conflict interceptor if it causes systemic UI blocks.
- **Measurable Completion Metrics:** 
  - 100% of mutations must:
    - Either use `mutateAsync` with `await`
    - OR use `mutate` with strict `onSuccess`/`onError` boundaries
    - AND must NOT mix both in same component
  - 0 eager `router.push` calls before HTTP 200/201 is confirmed.
  - 100% of `update` endpoints pass the `version` payload.

---

## PHASE 4 — Guard Integrity Audit
**Objective:** Ensure forms with dirty state protect the user from accidental navigation, and that autosave screens do not falsely trigger it.
**Scope:** Forms using `react-hook-form` and the `UnsavedChangesGuard`.

**Actions & Commands:**
1. **Detect Unprotected Forms:** 
   ```powershell
   Get-ChildItem -Path apps/web/src -Recurse -Filter *.tsx | Select-String -Pattern "useForm" | Select-Object -ExpandProperty Path | Get-Unique | ForEach-Object { if (!(Select-String -Path $_ -Pattern "UnsavedChangesGuard" -Quiet)) { $_ } }
   ```
2. **Detect Guard Misuse:** Ensure `isDirty` state is properly bound.
   ```powershell
   rg "UnsavedChangesGuard.*isDirty" apps/web/src
   ```

**Strict Enforcement:**
- **Risk Level:** High (Severe user frustration and data loss due to accidental navigation)
- **Hidden Failure Modes:** `isDirty` remaining true after a failed API submission; Next.js router intercepting browser back button without triggering the `beforeunload` event.
- **Cross-Module Impact:** Affects all interactive forms.
- **Regression Detection Method:** Unit tests on form state asserting `isDirty` strictly resets to `false` on `onSuccess`. E2E tests validating Next.js `Link` blocking.
- **Rollback Strategy:** Globally disable `UnsavedChangesGuard` via context/provider if it traps users in infinite 'dirty' loops.
- **Measurable Completion Metrics:** 
  - 100% of creation/edit forms are wrapped with `UnsavedChangesGuard`.
  - 0 reported instances of false-positive dirty states blocking intentional navigation.

---

## PHASE 5 — UX Completeness & Workflow Closure
**Objective:** Validate that all pages have necessary contextual actions and users never reach a dead-end workflow.
**Scope:** List pages, Detail Pages, Edit pages, Document Lifecycle.

**Actions & Commands:**
1. **Detect Unconfirmed Destructive Actions:** 
   ```powershell
   rg "delete[A-Z].*\.mutate" apps/web/src
   ```
2. **Verify Locked/Read-Only States:** 
   ```powershell
   rg "DocumentLock" apps/web/src
   ```

**Strict Enforcement:**
- **Risk Level:** High (User workflow friction and accidental data deletion)
- **Hidden Failure Modes:** "Delete" buttons visible to unauthorized roles; "Edit" buttons active on locked/approved documents (e.g., closed stocktakes).
- **Cross-Module Impact:** Impacts global authorization (RBAC) and document lifecycle state machines.
- **Regression Detection Method:** Visual regression testing (e.g., Playwright screenshots) explicitly checking for the absence of Edit buttons on closed documents.
- **Rollback Strategy:** Revert specific UI component layout changes.
- **Measurable Completion Metrics:** 
  - 100% of List pages possess a standard "Create" workflow.
  - 100% of destructive mutations (Delete/Reject) are strictly bound to a Confirmation Dialog.
  - 100% of Closed/Approved documents render the `DocumentLock` component and disable all form inputs.

---

## PHASE 6 — Console & Runtime Error Sweep
**Objective:** Clean up React hydration errors, missing key warnings, and test concurrency limits in runtime.
**Scope:** Browser DevTools, React strict mode, production build.

**Actions & Commands:**
1. **Detect React Key Warnings:** 
   ```powershell
   rg "\.map\(.*=>.*\s*<[A-Za-z]+(?![^>]*key=)" apps/web/src
   ```
2. **Detect Hydration Mismatches:**
   Run `npm run build` then `npm run start`. Monitor terminal and browser console for `Warning: Expected server HTML`.
3. **Detect Memory Leaks (State on Unmounted):**
   Navigate quickly between list and detail pages while network requests are pending to detect React state updates on unmounted components.
4. **Concurrency Simulation:**
   Force an edit conflict by modifying the same document in two separate browser tabs.

**Strict Enforcement:**
- **Risk Level:** High (Silent failures, memory leaks, erratic UI state, unrecoverable crashes)
- **Hidden Failure Modes:** Unhandled Promise rejections swallowed by React Query; Hydration mismatches causing full client-side re-renders and lost DOM state.
- **Cross-Module Impact:** Global frontend stability.
- **Regression Detection Method:** CI/CD step enforcing zero hydration warnings during `next build`.
- **Rollback Strategy:** Revert specific component refactors causing the hydration mismatch.
- **Measurable Completion Metrics:** 
  - 0 React Key warnings in the console.
  - 0 Hydration Mismatches on a production build.
  - 0 Unhandled promise rejections.
  - 0 "Can't perform a React state update on an unmounted component" warnings (Memory leak check).

---

## PHASE 7 — Final Stabilization Report
**Objective:** Categorize findings and make the final Go/No-Go decision for the recovery branch merge.

**Severity Classification:**
*   🔴 **Critical:** App crashes, 404 routes, missing form guards, broken conflict handling, eager routing on failed mutations.
*   🟠 **High:** Missing translations, broken workflow loops (no back button), hydration errors, unconfirmed destructive actions.
*   🟡 **Medium:** Misaligned UI tokens, missing loading states on secondary actions.
*   🟢 **Low:** Console warnings (non-crashing), minor CSS specificity issues.

**Strict Enforcement:**
- **Go/No-Go Decision Matrix:**
  - **GO:** 0 Critical, 0 High issues remain.
  - **NO-GO:** Any Critical or High issue remains unresolved.
- **Production Readiness Score:**
  *(Calculated out of 100 based on the absolute completion of Phases 1-6)*
  - Route Integrity: __/15
  - i18n Parity: __/20
  - Mutation Compliance: __/20
  - Guard Integrity: __/15
  - UX Completeness: __/15
  - Runtime Sweep: __/15
  - **TOTAL:** ___ / 100 (Hard Pass threshold: > 95)

---

## PHASE 8 — Continuous Monitoring Safeguards
**Objective:** Ensure the system does not degrade over time after the recovery stabilization. Protect the frontend architecture from future erosion.
**Scope:** Production environment and CI/CD pipelines.

**Actions & Protocol:**
1. **Logging Strategy:** Integrate global error boundary with a logging provider (e.g., Sentry, Datadog). Ensure Source Maps are uploaded securely during `next build`.
2. **Runtime Health Checks:** Implement synthetic browser checks (e.g., Datadog Synthetics) asserting that the `/login` and main `/dashboard` render within 2.5 seconds.
3. **Post-Deployment Checklist:** Require QA sign-off on 5 critical user flows in the production environment immediately following deployment.
4. **Weekly Audit Protocol:** Automated script parsing `ar.json` vs `en.json` failing the CI pipeline if discrepancies are merged.

**Strict Enforcement:**
- **Risk Level:** Medium (Overhead of monitoring, alert fatigue)
- **Hidden Failure Modes:** Alert fatigue causing critical issues to be ignored; Logging mechanisms exposing PII or financial data.
- **Cross-Module Impact:** Global observability and compliance.
- **Regression Detection Method:** Alerting thresholds on error rates (e.g., > 1% failure rate on `mutateAsync` triggers PagerDuty).
- **Rollback Strategy:** N/A (Monitoring layer adjustments only).
- **Measurable Completion Metrics:** 
  - 100% of unhandled frontend errors captured and reported to telemetry.
  - 100% masking of sensitive payloads in network logs.
  - CI pipeline configured to fail if i18n drift > 0%.
