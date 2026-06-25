import { defineConfig, devices } from '@playwright/test';

/**
 * LogiRest E2E Playwright Configuration
 *
 * Test suites:
 *  - tests/e2e/                      — Legacy specs (smoke, kitchen-request)
 *  - tests/e2e/specs/                — New QA blueprint specs (rbac, procurement, inventory)
 *
 * Run commands:
 *  npx playwright test --config tests/playwright.config.ts
 *  npx playwright test --config tests/playwright.config.ts tests/e2e/specs/rbac.spec.ts
 *  npx playwright show-report tests/results/playwright-report
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['list'],
    [
      'html',
      {
        outputFolder: 'tests/results/playwright-report',
        open: 'never',
      },
    ],
  ],
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    locale: 'en',
    // Capture full trace (screenshots + network) on first retry
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // Extra HTTP request timeout
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
  outputDir: 'tests/results/test-artifacts',
});
