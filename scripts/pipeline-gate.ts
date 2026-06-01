interface GateResult {
  passed: boolean;
  status: 'PASS' | 'HOLD' | 'FAIL';
  checks: GateCheck[];
  holdToken?: string;
}

interface GateCheck {
  name: string;
  passed: boolean;
  details: string;
}

const HOLD_TOKEN_ENV = 'ADMIN_APPROVAL_KEY';

function resolveAdminKey(): string | null {
  return process.env[HOLD_TOKEN_ENV] || null;
}

function validateAdminKey(key: string): boolean {
  const expected = resolveAdminKey();
  if (!expected) {
    console.warn('[pipeline-gate] ADMIN_APPROVAL_KEY not set in environment. Holds cannot be bypassed.');
    return false;
  }
  return key === expected;
}

async function checkLoadTestResults(): Promise<GateCheck> {
  const resultPath = process.env.LOAD_TEST_RESULT_PATH || 'tests/results/load-test-run.json';
  try {
    const fs = await import('fs');
    if (!fs.existsSync(resultPath)) {
      return { name: 'Load Test Results', passed: false, details: `Results file not found: ${resultPath}` };
    }
    const raw = fs.readFileSync(resultPath, 'utf-8');
    const metrics = JSON.parse(raw);
    if (metrics.status === 'FAILURE') {
      const errors = (metrics.errors || []).join('; ');
      return { name: 'Load Test Results', passed: false, details: `Load test failed: ${errors}` };
    }
    return { name: 'Load Test Results', passed: true, details: `Load test passed. p95: ${metrics.metrics?.p95LatencyMS}ms` };
  } catch (err: any) {
    return { name: 'Load Test Results', passed: false, details: `Error reading results: ${err.message}` };
  }
}

async function checkRollbackDrill(): Promise<GateCheck> {
  const resultPath = process.env.ROLLBACK_RESULT_PATH || 'tests/results/rollback-drill.json';
  try {
    const fs = await import('fs');
    if (!fs.existsSync(resultPath)) {
      return { name: 'Rollback Drill', passed: false, details: `Results file not found: ${resultPath}` };
    }
    const raw = fs.readFileSync(resultPath, 'utf-8');
    const result = JSON.parse(raw);
    if (!result.success) {
      return { name: 'Rollback Drill', passed: false, details: result.error || 'Rollback drill failed' };
    }
    return { name: 'Rollback Drill', passed: true, details: `Restored in ${result.recoverySeconds}s` };
  } catch (err: any) {
    return { name: 'Rollback Drill', passed: false, details: `Error reading results: ${err.message}` };
  }
}

async function evaluateGates(approvalKey?: string): Promise<GateResult> {
  const [loadTestCheck, rollbackCheck] = await Promise.all([
    checkLoadTestResults(),
    checkRollbackDrill(),
  ]);

  const allChecks = [loadTestCheck, rollbackCheck];
  const failedChecks = allChecks.filter((c) => !c.passed);

  const result: GateResult = {
    passed: failedChecks.length === 0,
    status: 'PASS',
    checks: allChecks,
  };

  if (failedChecks.length > 0) {
    if (approvalKey && validateAdminKey(approvalKey)) {
      result.status = 'PASS';
      result.passed = true;
      console.log('[pipeline-gate] Admin approval key accepted. Bypassing hold.');
    } else {
      result.status = 'HOLD';
      result.passed = false;
      console.log('[pipeline-gate] Gates failed. Pipeline entering HOLD status.');
      console.log('[pipeline-gate] Provide ADMIN_APPROVAL_KEY to bypass.');
    }
  }

  for (const check of allChecks) {
    const icon = check.passed ? '✓' : '✗';
    console.log(`  ${icon} ${check.name}: ${check.details}`);
  }

  return result;
}

const approvalKey = process.argv[2] || process.env[HOLD_TOKEN_ENV];

evaluateGates(approvalKey)
  .then((result) => {
    console.log(`\n[pipeline-gate] Status: ${result.status}`);
    process.exit(result.passed ? 0 : 1);
  })
  .catch((err) => {
    console.error('[pipeline-gate] Fatal error:', err);
    process.exit(1);
  });
