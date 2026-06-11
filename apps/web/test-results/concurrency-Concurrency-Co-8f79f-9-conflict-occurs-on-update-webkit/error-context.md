# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: concurrency.spec.ts >> Concurrency / Conflict Resolution (409) >> ConflictDialog appears when a 409 conflict occurs on update
- Location: apps\web\tests\e2e\concurrency.spec.ts:8:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('button', { name: /save/i })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByRole('button', { name: /save/i })

```

```yaml
- alert
- main:
  - img "Professional Kitchen"
  - text: System Online
  - button "Arabic"
  - img "LogiRest Logo"
  - text: v3.1.04
  - heading "LogiRest | Smart Inventory Control" [level=1]
  - paragraph: Precision management for high-performance kitchens. Real-time inventory tracking and automated procurement.
  - text: Enterprise v3 Enabled OP OP OP +12 ACTIVE OPERATORS
  - heading "Authorization Required" [level=2]
  - paragraph: Enter your credentials to access the secure portal.
  - text: Operator ID
  - textbox "Enter ID or Email"
  - text: Access Protocol
  - button "Recover Access"
  - textbox "Enter Password"
  - button
  - button "BIOMETRIC LINK"
  - button "HARDWARE TOKEN"
  - button "INITIALIZE SESSION"
- region "Notifications alt+T"
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | test.describe('Concurrency / Conflict Resolution (409)', () => {
  4   |   test.beforeEach(async ({ page }) => {
  5   |     await page.goto('/');
  6   |   });
  7   | 
  8   |   test('ConflictDialog appears when a 409 conflict occurs on update', async ({ page }) => {
  9   |     await page.goto('/en/master-data/warehouses/W-001/edit');
  10  | 
  11  |     await page.waitForSelector('form');
  12  | 
  13  |     const saveButton = page.getByRole('button', { name: /save/i });
> 14  |     await expect(saveButton).toBeVisible();
      |                              ^ Error: expect(locator).toBeVisible() failed
  15  | 
  16  |     await page.route('**/api/warehouses/W-001', (route) =>
  17  |       route.fulfill({
  18  |         status: 409,
  19  |         contentType: 'application/json',
  20  |         body: JSON.stringify({
  21  |           message: 'Conflict',
  22  |           currentVersion: 3,
  23  |           originalVersion: 1,
  24  |         }),
  25  |       })
  26  |     );
  27  | 
  28  |     await saveButton.click();
  29  | 
  30  |     const dialog = page.getByRole('dialog');
  31  |     await expect(dialog).toBeVisible();
  32  |     await expect(dialog.getByText(/conflict/i)).toBeVisible();
  33  |   });
  34  | 
  35  |   test('ConflictDialog "Reload" button refreshes data and re-enables save', async ({
  36  |     page,
  37  |   }) => {
  38  |     await page.goto('/en/master-data/warehouses/W-001/edit');
  39  | 
  40  |     await page.waitForSelector('form');
  41  | 
  42  |     await page.route('**/api/warehouses/W-001', (route) =>
  43  |       route.fulfill({
  44  |         status: 409,
  45  |         contentType: 'application/json',
  46  |         body: JSON.stringify({
  47  |           message: 'Conflict',
  48  |           currentVersion: 3,
  49  |           originalVersion: 1,
  50  |         }),
  51  |       })
  52  |     );
  53  | 
  54  |     const saveButton = page.getByRole('button', { name: /save/i });
  55  |     await saveButton.click();
  56  | 
  57  |     const dialog = page.getByRole('dialog');
  58  |     await expect(dialog).toBeVisible();
  59  | 
  60  |     await page.route('**/api/warehouses/W-001', (route) =>
  61  |       route.fulfill({
  62  |         status: 200,
  63  |         contentType: 'application/json',
  64  |         body: JSON.stringify({
  65  |           id: 'W-001',
  66  |           code: 'MAIN-WH',
  67  |           name_en: 'Main Warehouse',
  68  |           name_ar: 'المستودع الرئيسي',
  69  |           type: 'MAIN',
  70  |           branch_id: 'BR-001',
  71  |           is_active: true,
  72  |           version: 3,
  73  |         }),
  74  |       })
  75  |     );
  76  | 
  77  |     const reloadButton = dialog.getByRole('button', { name: /reload/i });
  78  |     await reloadButton.click();
  79  | 
  80  |     await expect(dialog).not.toBeVisible();
  81  | 
  82  |     await expect(saveButton).toBeEnabled();
  83  |   });
  84  | 
  85  |   test('ConflictDialog "Stay" button dismisses dialog but keeps save disabled (FR-007)', async ({
  86  |     page,
  87  |   }) => {
  88  |     await page.goto('/en/master-data/warehouses/W-001/edit');
  89  | 
  90  |     await page.waitForSelector('form');
  91  | 
  92  |     await page.route('**/api/warehouses/W-001', (route) =>
  93  |       route.fulfill({
  94  |         status: 409,
  95  |         contentType: 'application/json',
  96  |         body: JSON.stringify({
  97  |           message: 'Conflict',
  98  |           currentVersion: 3,
  99  |           originalVersion: 1,
  100 |         }),
  101 |       })
  102 |     );
  103 | 
  104 |     const saveButton = page.getByRole('button', { name: /save/i });
  105 |     await saveButton.click();
  106 | 
  107 |     const dialog = page.getByRole('dialog');
  108 |     await expect(dialog).toBeVisible();
  109 | 
  110 |     const stayButton = dialog.getByRole('button', { name: /stay|cancel|close/i });
  111 |     await stayButton.click();
  112 | 
  113 |     await expect(dialog).not.toBeVisible();
  114 | 
```