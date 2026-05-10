# Implementation Plan: i18n Full Parity & Key Hardening (Phase 2)

**Branch**: `004-i18n-parity-hardening` | **Date**: 2026-05-10 | **Spec**: [spec.md](file:///e:/Kitchen‑Store Inventory System/specs/004-i18n-parity-hardening/spec.md)
**Input**: Feature specification from `/specs/004-i18n-parity-hardening/spec.md`

## Summary

This feature implements Phase 2 of the STRICT FRONTEND RECOVERY MASTER PLAN, focusing on absolute translation parity and structural hardening of the i18n system. The technical approach involves creating an automated validation suite that runs in the CI pipeline to enforce 1:1 key parity between `ar.json` and `en.json`, flag empty or unauthorized identical values, detect hardcoded strings in the codebase, and enforce `snake_case` naming for all new keys.

## Technical Context

**Language/Version**: Next.js 15 (App Router), TypeScript 5.x.
**Primary Dependencies**: `next-intl`.
**Storage**: Local JSON files (`apps/web/messages/*.json`).
**Testing**: Custom Node.js validation scripts, `next lint`, `tsc --noEmit`.
**Target Platform**: Web (Vercel/Production).
**Project Type**: Web application.
**Performance Goals**: Build-time validation < 10s.
**Constraints**: 
- Absolute 1:1 structural parity required.
- Zero tolerance for hardcoded English in protected routes.
- `snake_case` enforcement for all new keys.
- Explicit ignore tags (`// i18n-dynamic`) for dynamic keys.
**Scale/Scope**: ~200+ translation keys, all components in `apps/web/src`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Phase Alignment**: Aligns with Step 4 (i18n Parity & Hardening) of the Frontend Stabilization phase. **PASS**
- **Zero Hard-coded Strings**: This is the core goal of the feature. **PASS**
- **Arabic-First/RTL**: Hardening translation keys ensures RTL strings are properly managed. **PASS**
- **Naming Standards**: Enforces `snake_case` as per constitutional requirement for this phase. **PASS**

## Project Structure

### Documentation (this feature)

```text
specs/004-i18n-parity-hardening/
├── spec.md              # Feature specification
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
apps/web/
├── messages/
│   ├── ar.json          # Arabic source of truth
│   └── en.json          # English source of truth
├── src/
│   ├── app/             # Page components to audit
│   └── components/      # UI components to audit
└── scripts/
    └── i18n-audit.js    # [NEW] Automated validation script
```

**Structure Decision**: The feature primarily affects existing message files and adds a centralized audit script in the `apps/web/scripts` directory to be invoked by the CI pipeline.

## Complexity Tracking

*No violations detected.*
