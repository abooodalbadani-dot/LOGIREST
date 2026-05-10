# Feature Specification: i18n Full Parity & Key Hardening (Phase 2)

**Feature Branch**: `004-i18n-parity-hardening`  
**Created**: May 10, 2026  
**Status**: Draft  
**Input**: User description: "i18n Full Parity & Key Hardening (Phase 2 of STRICT FRONTEND RECOVERY MASTER PLAN)"

## Clarifications

### Session 2026-05-10

- Q: Should i18n detection be enforced in CI or manual? → A: Blocking CI Check (Build fails if rules are violated).
- Q: How deep should validation go (empty/identical)? → A: Strict Content (Flag missing keys, empty values, AND identical strings).
- Q: How to detect placeholders (blacklist vs pattern)? → A: Configurable Blacklist (Start with "طلبات المطبخ", "TODO", etc.).
- Q: How to handle dynamic keys? → A: Explicit Ignore (Allow dynamic keys ONLY if tagged with a comment like `// i18n-dynamic`).
- Q: Should we enforce a key naming convention? → A: snake_case (e.g., `sidebar_title`).


## User Scenarios & Testing *(mandatory)*

### User Story 1 - Structural Synchronization (Priority: P1)

Developers and translators need to ensure that the translation files for all supported languages (Arabic and English) have the exact same structure and keys. This prevents "missing key" errors or raw key IDs appearing in the UI for one language while the other is properly translated.

**Why this priority**: Absolute parity is critical for enterprise credibility. A single missing key in a production environment can lead to user confusion or a "broken" feel.

**Independent Test**: Can be fully tested by running a comparison script between `ar.json` and `en.json` and verifying that the output reports zero discrepancies.

**Acceptance Scenarios**:

1. **Given** that `en.json` has a new key added, **When** the parity check is run, **Then** it must fail and identify the missing key in `ar.json`.
2. **Given** that both files have the exact same keys, **When** the parity check is run, **Then** it must pass successfully.

---

### User Story 2 - Raw Text Removal (Priority: P1)

Users must experience a fully localized interface. No hardcoded English text should "leak" into the Arabic UI (or vice versa). Every piece of text the user sees must be managed through the translation engine.

**Why this priority**: Raw English text in an Arabic interface is a major UX failure and violates the "Zero Tolerance" policy for UI inconsistencies in the master plan.

**Independent Test**: Can be tested by searching the codebase for raw string patterns within JSX/TSX tags and verifying that zero instances are found in user-facing directories.

**Acceptance Scenarios**:

1. **Given** a new UI component is created, **When** a developer adds raw text inside a `<div>`, **Then** the automated check must flag it as an error.
2. **Given** all UI text is wrapped in `t()`, **When** the check is run, **Then** it must return a clean report.

---

### User Story 3 - Placeholder Cleanup (Priority: P1)

Users should see contextually accurate translations. Generic placeholders like "طلبات المطبخ" (Kitchen Requests) which were used to bypass translation requirements must be identified and replaced with the correct domain-specific keys.

**Why this priority**: Placeholders undermine the accuracy of the system and can lead to data misinterpretation by users (e.g., seeing "Kitchen Requests" on a "Purchase Order" screen).

**Independent Test**: Can be tested by searching for forbidden placeholder strings across all `messages/*.json` files.

**Acceptance Scenarios**:

1. **Given** that `ar.json` contains a placeholder string used for a generic label, **When** the placeholder sweep is run, **Then** it must list every file and line where it occurs.
2. **Given** that all placeholders have been replaced with unique keys, **When** the sweep is run, **Then** it must return zero results.

---

### Edge Cases

- **What happens when dynamic translation keys are used?** (e.g., `t('status.' + value)`). The automated scan will flag these unless they are explicitly marked with a `// i18n-dynamic` comment. The system must still ensure that every possible value for `value` is accounted for in both translation files manually or via a mapping manifest.
- **How does system handle nested translation namespaces?** The parity script must recursively check nested objects to ensure deep parity, not just top-level keys.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001:** System MUST detect and report all keys that exist in one language file but are missing in the other (Namespace Parity). This check MUST be enforced in the CI pipeline.
- **FR-002:** System MUST identify all hardcoded strings in `.tsx` files located in `apps/web/src/app` and `apps/web/src/components` that are not wrapped in a translation function (Raw Text Detection).
- **FR-003:** System MUST identify all occurrences of forbidden placeholder strings via a configurable blacklist (e.g., "طلبات المطبخ", "TODO", "FIXME") within the translation files.
- **FR-004:** System MUST achieve 100% key parity between `en.json` and `ar.json` before Phase 2 is considered complete.
- **FR-005:** System MUST ensure that 100% of user-facing UI text in protected routes is derived from the `next-intl` translation engine.
- **FR-006:** All NEW translation keys MUST follow the `snake_case` naming convention (e.g., `inventory_dashboard_title`).


### Key Entities *(include if feature involves data)*

- **Translation File**: A JSON file containing key-value pairs where keys are semantic identifiers and values are the localized text.
- **Translation Engine**: The `next-intl` framework used to inject localized strings into components based on the user's current locale.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001:** Absolute 1:1 parity (Zero missing keys, zero empty values, and zero unauthorized identical strings between `ar.json` and `en.json`). Validated by blocking CI check.
- **SC-002:** Zero (0) hardcoded English strings detected in user-facing components via automated scanning.
- **SC-003:** Zero (0) instances of forbidden placeholder strings (e.g., "طلبات المطبخ") used in the final localized files.
- **SC-004:** 100% of user-facing UI text wrapped in the `t()` or `<NextIntlClientProvider>` translation engine.

## Assumptions

- **Target Users**: The target users are multi-lingual staff across different inventory branches.
- **Scope Boundaries**: This phase focuses on the `apps/web` application. Backend error messages (if not passed through the translation engine) are out of scope unless they are rendered in the UI.
- **Dependency on existing system**: Requires the `next-intl` configuration to be stable and the `ar.json`/`en.json` files to be the primary sources of truth.
