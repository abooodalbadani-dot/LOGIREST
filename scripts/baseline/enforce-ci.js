#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

function readFileBOM(filePath) {
  let content = fs.readFileSync(filePath, "utf-8");
  if (content.charCodeAt(0) === 0xfeff) content = content.slice(1);
  return content;
}

const REPO_ROOT = path.resolve(__dirname, "..", "..");
const WEB_DIR = path.join(REPO_ROOT, "apps/web");

const BASELINE_TS_PATH = path.join(WEB_DIR, "baseline_ts_errors.log");
const BASELINE_ESLINT_PATH = path.join(WEB_DIR, "baseline_eslint.json");

let exitCode = 0;

// --- TypeScript enforcement ---
function enforceTypeScript() {
  console.log("=== TypeScript Baseline Enforcement ===");

  if (!fs.existsSync(BASELINE_TS_PATH)) {
    console.error("ERROR: baseline_ts_errors.log not found. Run generate.sh first.");
    return 1;
  }

  const baselineContent = readFileBOM(BASELINE_TS_PATH);
  const baselineMatches = baselineContent.match(/error TS/g);
  const baselineCount = baselineMatches ? baselineMatches.length : 0;

  let currentCount;
  try {
    const { execSync } = require("child_process");
    const output = execSync("npx tsc --noEmit", {
      cwd: WEB_DIR,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    const currentMatches = output.match(/error TS/g);
    currentCount = currentMatches ? currentMatches.length : 0;
  } catch (error) {
    const output = error.stdout || error.stderr || error.message || "";
    const currentMatches = output.match(/error TS/g);
    currentCount = currentMatches ? currentMatches.length : 0;
  }

  console.log(`Baseline TS errors: ${baselineCount}`);
  console.log(`Current  TS errors: ${currentCount}`);

  if (currentCount > baselineCount) {
    console.error(
      `FAIL: TypeScript errors increased from ${baselineCount} to ${currentCount}. Fix the new errors before merging.`
    );
    return 1;
  }

  console.log(`PASS: TypeScript errors within baseline (${baselineCount} allowed, ${currentCount} found).`);
  return 0;
}

// --- ESLint enforcement ---
function enforceESLint() {
  console.log("\n=== ESLint Baseline Enforcement ===");

  if (!fs.existsSync(BASELINE_ESLINT_PATH)) {
    console.error("ERROR: baseline_eslint.json not found. Run generate.sh first.");
    return 1;
  }

  const baselineData = JSON.parse(readFileBOM(BASELINE_ESLINT_PATH));
  let baselineCount = 0;
  for (const file of baselineData) {
    baselineCount += file.errorCount || 0;
  }

  let currentCount;
  try {
    const { execSync } = require("child_process");
    const tmpFile = path.join(WEB_DIR, ".tmp_eslint_output.json");
    execSync(`npx eslint --format json . --output-file "${tmpFile}"`, {
      cwd: WEB_DIR,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
      maxBuffer: 50 * 1024 * 1024,
    });
    const currentData = JSON.parse(readFileBOM(tmpFile));
    currentCount = 0;
    for (const file of currentData) {
      currentCount += file.errorCount || 0;
    }
    fs.unlinkSync(tmpFile);
  } catch (error) {
    const tmpFile = path.join(WEB_DIR, ".tmp_eslint_output.json");
    if (fs.existsSync(tmpFile)) {
      try {
        const currentData = JSON.parse(readFileBOM(tmpFile));
        currentCount = 0;
        for (const file of currentData) {
          currentCount += file.errorCount || 0;
        }
        fs.unlinkSync(tmpFile);
      } catch {
        currentCount = baselineCount + 1;
      }
    } else {
      currentCount = baselineCount + 1;
    }
  }

  console.log(`Baseline ESLint errors: ${baselineCount}`);
  console.log(`Current  ESLint errors: ${currentCount}`);

  if (currentCount > baselineCount) {
    console.error(
      `FAIL: ESLint errors increased from ${baselineCount} to ${currentCount}. Fix the new errors before merging.`
    );
    return 1;
  }

  console.log(`PASS: ESLint errors within baseline (${baselineCount} allowed, ${currentCount} found).`);
  return 0;
}

// --- Main ---
const tsResult = enforceTypeScript();
const eslintResult = enforceESLint();

process.exit((tsResult | eslintResult) ? 1 : 0);