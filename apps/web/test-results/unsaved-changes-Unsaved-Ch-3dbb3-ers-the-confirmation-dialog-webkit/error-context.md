# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: unsaved-changes.spec.ts >> Unsaved Changes Guard (SC-001, SC-003) >> SC-001: Navigating away from a dirty form triggers the confirmation dialog
- Location: apps\web\tests\e2e\unsaved-changes.spec.ts:8:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.fill: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByPlaceholder(/code|CODE/i).first()

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - button "Open Next.js Dev Tools" [ref=e7] [cursor=pointer]:
    - img [ref=e8]
  - alert [ref=e13]
  - main [ref=e14]:
    - generic [ref=e15]:
      - generic [ref=e16]:
        - img "Professional Kitchen" [ref=e18]
        - generic [ref=e22]:
          - generic [ref=e23]:
            - img [ref=e24]
            - generic [ref=e26]: System Online
          - button "Arabic" [ref=e27]
        - generic [ref=e28]:
          - generic [ref=e29]:
            - img "LogiRest Logo" [ref=e31]
            - generic [ref=e33]: v3.1.04
          - heading "LogiRest | Smart Inventory Control" [level=1] [ref=e34]
          - paragraph [ref=e35]: Precision management for high-performance kitchens. Real-time inventory tracking and automated procurement.
          - generic [ref=e36]:
            - generic [ref=e37]:
              - img [ref=e38]
              - generic [ref=e41]: Enterprise v3 Enabled
            - generic [ref=e42]:
              - generic [ref=e43]: OP
              - generic [ref=e44]: OP
              - generic [ref=e45]: OP
              - generic [ref=e46]: "+12"
            - generic [ref=e47]: ACTIVE OPERATORS
      - generic [ref=e50]:
        - generic [ref=e51]:
          - heading "Authorization Required" [level=2] [ref=e52]
          - paragraph [ref=e53]: Enter your credentials to access the secure portal.
        - generic [ref=e54]:
          - generic [ref=e55]:
            - generic [ref=e56]: Operator ID
            - generic [ref=e57]:
              - generic:
                - img
              - textbox "Enter ID or Email" [ref=e58]
          - generic [ref=e59]:
            - generic [ref=e60]:
              - generic [ref=e61]: Access Protocol
              - button "Recover Access" [ref=e62]
            - generic [ref=e63]:
              - generic:
                - img
              - textbox "Enter Password" [ref=e64]
              - button [ref=e65]:
                - img [ref=e66]
          - generic [ref=e69]:
            - button "BIOMETRIC LINK" [ref=e70]:
              - img [ref=e71]
              - generic [ref=e80]: BIOMETRIC LINK
            - button "HARDWARE TOKEN" [ref=e81]:
              - img [ref=e82]
              - generic [ref=e90]: HARDWARE TOKEN
          - button "INITIALIZE SESSION" [ref=e91]:
            - generic [ref=e92]:
              - img
              - text: INITIALIZE SESSION
  - region "Notifications alt+T"
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | test.describe('Unsaved Changes Guard (SC-001, SC-003)', () => {
  4   |   test.beforeEach(async ({ page }) => {
  5   |     await page.goto('/');
  6   |   });
  7   | 
  8   |   test('SC-001: Navigating away from a dirty form triggers the confirmation dialog', async ({
  9   |     page,
  10  |   }) => {
  11  |     await page.goto('/en/master-data/units-of-measure/new');
  12  |     await page.waitForSelector('form');
  13  | 
  14  |     const codeInput = page.getByPlaceholder(/code|CODE/i).first();
> 15  |     await codeInput.fill('TESTUOM');
      |                     ^ Error: locator.fill: Test timeout of 30000ms exceeded.
  16  | 
  17  |     const dialog = page.getByRole('dialog');
  18  |     await expect(dialog).not.toBeVisible();
  19  | 
  20  |     await page.getByRole('link', { name: /units.of.measure|uom/i }).first().click().catch(() => {
  21  |       // Link click intercepted by guard
  22  |     });
  23  | 
  24  |     await expect(dialog).toBeVisible();
  25  |     await expect(page.getByText(/unsaved changes/i)).toBeVisible();
  26  |   });
  27  | 
  28  |   test('SC-003: After successful form submission, navigating away does NOT trigger the dialog', async ({
  29  |     page,
  30  |   }) => {
  31  |     await page.goto('/en/master-data/units-of-measure/new');
  32  |     await page.waitForSelector('form');
  33  | 
  34  |     const codeInput = page.getByPlaceholder(/code|CODE/i).first();
  35  |     await codeInput.fill('TESTUOM');
  36  | 
  37  |     const nameEn = page.getByPlaceholder(/name.*en/i).first();
  38  |     await nameEn.fill('Test Unit');
  39  | 
  40  |     const nameAr = page.getByPlaceholder(/name.*ar/i).first();
  41  |     await nameAr.fill('وحدة اختبار');
  42  | 
  43  |     const saveButton = page.getByRole('button', { name: /save/i }).first();
  44  |     await saveButton.click();
  45  | 
  46  |     await page.waitForURL('**/master-data/units-of-measure', { timeout: 10000 });
  47  | 
  48  |     const dialog = page.getByRole('dialog');
  49  |     await expect(dialog).not.toBeVisible();
  50  |   });
  51  | 
  52  |   test('Clicking "Stay on Page" in the dialog keeps the user on the current form', async ({
  53  |     page,
  54  |   }) => {
  55  |     await page.goto('/en/master-data/units-of-measure/new');
  56  |     await page.waitForSelector('form');
  57  | 
  58  |     const codeInput = page.getByPlaceholder(/code|CODE/i).first();
  59  |     await codeInput.fill('STAYTEST');
  60  | 
  61  |     await page.getByRole('link', { name: /dashboard/i }).first().click().catch(() => {});
  62  | 
  63  |     const dialog = page.getByRole('dialog');
  64  |     await expect(dialog).toBeVisible();
  65  | 
  66  |     const stayButton = page.getByRole('button', { name: /stay/i });
  67  |     await stayButton.click();
  68  | 
  69  |     await expect(dialog).not.toBeVisible();
  70  |     await expect(page).toHaveURL(/units-of-measure/);
  71  |   });
  72  | 
  73  |   test('Clicking "Discard & Leave" navigates the user away', async ({ page }) => {
  74  |     await page.goto('/en/master-data/warehouses/new');
  75  |     await page.waitForSelector('form');
  76  | 
  77  |     const codeInput = page.getByPlaceholder(/code|CODE/i).first();
  78  |     await codeInput.fill('DISCARDTEST');
  79  | 
  80  |     await page.getByRole('link', { name: /dashboard/i }).first().click().catch(() => {});
  81  | 
  82  |     const dialog = page.getByRole('dialog');
  83  |     await expect(dialog).toBeVisible();
  84  | 
  85  |     const leaveButton = page.getByRole('button', { name: /discard|leave/i });
  86  |     await leaveButton.click();
  87  | 
  88  |     await expect(page).not.toHaveURL(/warehouses/);
  89  |   });
  90  | 
  91  |   test('Cancel button with skipGuard bypasses the dialog', async ({ page }) => {
  92  |     await page.goto('/en/master-data/warehouses/new');
  93  |     await page.waitForSelector('form');
  94  | 
  95  |     const codeInput = page.getByPlaceholder(/code|CODE/i).first();
  96  |     await codeInput.fill('CANCELTEST');
  97  | 
  98  |     const cancelButton = page.getByRole('button', { name: /cancel/i }).first();
  99  |     await cancelButton.click();
  100 | 
  101 |     const dialog = page.getByRole('dialog');
  102 |     await expect(dialog).not.toBeVisible();
  103 | 
  104 |     await expect(page).not.toHaveURL(/warehouses\/new/);
  105 |   });
  106 | 
  107 |   test('Browser back button triggers the dialog when form is dirty', async ({
  108 |     page,
  109 |   }) => {
  110 |     await page.goto('/en/master-data/warehouses');
  111 |     await page.goto('/en/master-data/warehouses/new');
  112 |     await page.waitForSelector('form');
  113 | 
  114 |     const codeInput = page.getByPlaceholder(/code|CODE/i).first();
  115 |     await codeInput.fill('BACKTEST');
```