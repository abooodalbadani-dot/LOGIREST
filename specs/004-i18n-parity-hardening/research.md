# Research: i18n Auditing & Hardening Patterns

## Decision: Custom Node.js Audit Script
**Rationale**: Using a custom script provides maximum control over project-specific rules (like `snake_case` and `// i18n-dynamic` tags) without adding heavy dependencies. It can be easily integrated into `turbo.json` as a linting step.

## Hardcoded Text Detection Strategy
**Decision**: Use a regex-based approach for initial detection in JSX/TSX, specifically targeting text between tags `>Text<` and inside props like `label="Text"`, while ignoring translated calls `t(...)`.
**Rationale**: Regex is faster for simple "raw string" detection in our current scale. If false positives become an issue, we will transition to an AST-based parser using `ts-morph`.

## CI Integration Pattern
**Decision**: Add a new task `i18n-audit` in `apps/web/package.json` and reference it in the global `turbo.json`.
**Rationale**: Ensures that every build or PR check runs the audit, fulfilling the "Blocking CI" requirement.

## Forbidden Placeholders Blacklist
**Decision**: Start with the following list:
- `طلبات المطبخ`
- `TODO`
- `FIXME`
- `[PLACEHOLDER]`
- `Kitchen Request`

## Alternatives Considered
- **i18next-parser**: Rejected because we are using `next-intl` and need specific "hardening" rules that generic parsers don't support easily (like identical-value detection).
- **ESLint Plugin**: Considered creating a custom ESLint rule. Rejected for this phase to move faster with a standalone script, but may be a Phase 8 enhancement.
