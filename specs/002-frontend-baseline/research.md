# Phase 0: Research & Clarification

**Feature**: 002-frontend-baseline

## Needs Clarification Resolutions

No unknowns were present in the Technical Context, but key design decisions for implementation details were researched.

## Research Findings

### Decision: Baseline Generation Script Language
- **Decision**: Bash (`generate.sh`)
- **Rationale**: Simple, dependency-free, and handles system operations (checking `git status`, deleting `apps/web/.next` directory, running npm commands) perfectly.
- **Alternatives considered**: A Node.js script could be used, but invoking `git` and parsing `npm run` outputs are slightly more cumbersome than simple shell piping.

### Decision: CI Enforcement Script Language
- **Decision**: Node.js (`enforce-ci.js`)
- **Rationale**: We need to parse a potentially large `baseline_eslint.json` file and compare error counts. Node.js is natively good at JSON parsing, and we already have a Node environment. Counting lines in a log file (for TS) is also trivial in Node.js.
- **Alternatives considered**: Using `jq` or `awk` in bash, which might be brittle across different CI runners or developer OSs (especially Windows).

### Decision: TypeScript Error Count Extraction
- **Decision**: Count lines containing `error TS` in the `baseline_ts_errors.log`.
- **Rationale**: Standard TypeScript compilation output formats errors with the string `error TS`.
- **Alternatives considered**: Writing a custom TS compiler host (too complex) or using `--extendedDiagnostics` (overkill).

### Decision: CI Pipeline Integration
- **Decision**: Add the custom script to the existing CI workflow YAML, executing after the standard type check and lint steps.
- **Rationale**: The CI should still run the normal `tsc --noEmit` and `eslint`, but we need our custom step to interpret the results instead of failing the build immediately on any error.
- **Alternatives considered**: Using a third-party GitHub Action. However, custom logic ensures tight coupling to our specific baseline files.
