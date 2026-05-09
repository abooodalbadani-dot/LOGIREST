#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
WEB_DIR="$REPO_ROOT/apps/web"

echo "=== Frontend Baseline Generator ==="
echo "Repo root: $REPO_ROOT"
echo "Web dir:   $WEB_DIR"

# --- Check: git working tree must be clean ---
if ! git -C "$REPO_ROOT" diff --quiet || ! git -C "$REPO_ROOT" diff --cached --quiet; then
  echo "ERROR: Git working tree has uncommitted changes."
  echo "Commit or stash your changes before generating a baseline."
  git -C "$REPO_ROOT" status --short
  exit 1
fi

# --- Clear .next cache ---
if [ -d "$WEB_DIR/.next" ]; then
  echo "Clearing .next cache..."
  rm -rf "$WEB_DIR/.next"
fi

# --- Generate TypeScript error baseline ---
echo ""
echo "--- TypeScript Error Baseline ---"
pushd "$WEB_DIR" > /dev/null
npx tsc --noEmit 2>&1 | tee "$WEB_DIR/baseline_ts_errors.log" || true
popd > /dev/null

TS_ERRORS=$(grep -c "error TS" "$WEB_DIR/baseline_ts_errors.log" 2>/dev/null || echo "0")
echo "TypeScript errors captured: $TS_ERRORS"

# --- Generate ESLint error baseline ---
echo ""
echo "--- ESLint Error Baseline ---"
pushd "$WEB_DIR" > /dev/null
npx eslint --format json . 2>/dev/null > "$WEB_DIR/baseline_eslint.json" || true
popd > /dev/null

ESLINT_ERRORS=$(node -e "
  try {
    const data = require(process.argv[1]);
    let total = 0;
    for (const file of data) { total += file.errorCount || 0; }
    console.log(total);
  } catch { console.log(0); }
" "$WEB_DIR/baseline_eslint.json" 2>/dev/null || echo "0")
echo "ESLint errors captured: $ESLINT_ERRORS"

echo ""
echo "=== Baseline generation complete ==="
echo "Files created:"
echo "  - apps/web/baseline_ts_errors.log"
echo "  - apps/web/baseline_eslint.json"
echo ""
echo "Next steps:"
echo "  1. Review the generated baseline files."
echo "  2. Commit them to the repository."