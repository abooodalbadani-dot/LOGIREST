# Quickstart: i18n Parity Audit

## Prerequisites
- Node.js installed.
- Dependencies installed: `npm install` in `apps/web`.

## Running the Audit Locally

To run the full parity and hardening check:
```bash
# From the project root
npx turbo run i18n-audit

# Or from apps/web
npm run i18n-audit
```

## How to Fix Common Errors

### 1. Missing Key (MISSING_KEY)
Ensure the key exists in both `apps/web/messages/ar.json` and `apps/web/messages/en.json`.

### 2. Hardcoded Text (HARDCODED_TEXT)
Wrap the text in the translation function:
```tsx
// Before
<div>Save Changes</div>

// After
<div>{t('save_changes')}</div>
```

### 3. Dynamic Key False Positive
If using a dynamic key that the script can't track, add a comment:
```tsx
const label = t('status.' + status); // i18n-dynamic
```

### 4. Invalid Name (INVALID_NAME)
Ensure new keys are in `snake_case`.
- ❌ `saveChanges`
- ✅ `save_changes`
