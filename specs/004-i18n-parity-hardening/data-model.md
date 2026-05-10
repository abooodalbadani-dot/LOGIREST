# Data Model: i18n & Audit Structures

## Translation Files (`messages/*.json`)
The translation files follow a nested JSON structure.

### Entity: TranslationKey
- **Key**: `snake_case` semantic identifier.
- **Value**: Non-empty localized string.
- **Constraint**: Must exist in both `ar.json` and `en.json`.
- **Constraint**: Values must not be identical unless the key is whitelisted (e.g., numbers, brands).

## Audit Results Structure
The `i18n-audit.js` script will output a JSON report and log to stdout.

### Entity: AuditReport
- **timestamp**: ISO Date.
- **status**: `PASS` | `FAIL`.
- **summary**:
  - `total_keys`: Count.
  - `missing_keys`: Count.
  - `hardcoded_strings`: Count.
- **errors**: List of:
  - `file`: Path.
  - `line`: Number.
  - `message`: Error description.
  - `type`: `MISSING_KEY` | `HARDCODED_TEXT` | `INVALID_NAME` | `PLACEHOLDER`.

## State Transitions: Key Hardening Workflow
1. **Detection**: Script scans files.
2. **Identification**: Errors mapped to specific files.
3. **Correction**: Developer wraps text in `t()` or adds key to JSON.
4. **Validation**: CI check passes on PR.
