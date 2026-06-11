# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: landed-cost.spec.ts >> Landed Cost Allocation (US1) >> page renders with correct title
- Location: apps\web\tests\e2e\landed-cost.spec.ts:8:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('[data-slot="page-header"]')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('[data-slot="page-header"]')

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
  3   | test.describe('Landed Cost Allocation (US1)', () => {
  4   |   test.beforeEach(async ({ page }) => {
  5   |     await page.goto('/en/landed-cost');
  6   |   });
  7   | 
  8   |   test('page renders with correct title', async ({ page }) => {
> 9   |     await expect(page.locator('[data-slot="page-header"]')).toBeVisible();
      |                                                             ^ Error: expect(locator).toBeVisible() failed
  10  |     await expect(page.getByText(/landed cost/i).first()).toBeVisible();
  11  |   });
  12  | 
  13  |   test('wizard shows calculator icon when in development mode', async ({ page }) => {
  14  |     const calcIcon = page.locator('svg.lucide-calculator');
  15  |     const comingSoon = page.getByText(/coming soon/i);
  16  |     await expect(calcIcon).toBeVisible({ timeout: 5000 });
  17  |     await expect(comingSoon).toBeVisible();
  18  |   });
  19  | 
  20  |   test('create voucher API call succeeds with mocked data', async ({ page }) => {
  21  |     const voucherId = crypto.randomUUID();
  22  |     await page.route('**/api/procurement/landed-cost', (route) => {
  23  |       if (route.request().method() === 'POST') {
  24  |         return route.fulfill({
  25  |           status: 201,
  26  |           contentType: 'application/json',
  27  |           body: JSON.stringify({
  28  |             data: {
  29  |               id: voucherId,
  30  |               voucherNumber: 'LCV-20260601-0001',
  31  |               allocationMethod: 'VALUE',
  32  |               totalAllocatedCost: 1500.0,
  33  |               status: 'DRAFT',
  34  |               currencyId: 'cur-usd',
  35  |               exchangeRate: 1.0,
  36  |               transactionDate: new Date().toISOString(),
  37  |               version: 1,
  38  |               createdById: 'user-1',
  39  |               createdAt: new Date().toISOString(),
  40  |               updatedAt: new Date().toISOString(),
  41  |             },
  42  |           }),
  43  |         });
  44  |       }
  45  |       return route.fulfill({
  46  |         status: 200,
  47  |         contentType: 'application/json',
  48  |         body: JSON.stringify({ data: [], meta: { total: 0, page: 1, page_size: 10, total_pages: 0 } }),
  49  |       });
  50  |     });
  51  | 
  52  |     await page.goto('/en/landed-cost');
  53  |     await expect(page.locator('[data-slot="page-header"]')).toBeVisible();
  54  |   });
  55  | 
  56  |   test('post voucher dispatches revalidation job', async ({ page }) => {
  57  |     const voucherId = crypto.randomUUID();
  58  |     await page.route(`**/api/procurement/landed-cost/${voucherId}/post`, (route) =>
  59  |       route.fulfill({
  60  |         status: 200,
  61  |         contentType: 'application/json',
  62  |         body: JSON.stringify({
  63  |           data: {
  64  |             id: voucherId,
  65  |             voucherNumber: 'LCV-20260601-0002',
  66  |             allocationMethod: 'VALUE',
  67  |             totalAllocatedCost: 2500.0,
  68  |             status: 'PROCESSING',
  69  |             version: 2,
  70  |           },
  71  |         }),
  72  |       }),
  73  |     );
  74  | 
  75  |     await page.route(`**/api/procurement/landed-cost/${voucherId}`, (route) =>
  76  |       route.fulfill({
  77  |         status: 200,
  78  |         contentType: 'application/json',
  79  |         body: JSON.stringify({
  80  |           data: {
  81  |             id: voucherId,
  82  |             voucherNumber: 'LCV-20260601-0002',
  83  |             status: 'DRAFT',
  84  |             version: 1,
  85  |           },
  86  |         }),
  87  |       }),
  88  |     );
  89  | 
  90  |     await page.goto(`/en/landed-cost`);
  91  |     await expect(page.locator('[data-slot="page-header"]')).toBeVisible();
  92  |   });
  93  | 
  94  |   test('list vouchers shows paginated data', async ({ page }) => {
  95  |     const mockVouchers = Array.from({ length: 3 }).map((_, i) => ({
  96  |       id: crypto.randomUUID(),
  97  |       voucherNumber: `LCV-20260601-${String(i + 1).padStart(4, '0')}`,
  98  |       allocationMethod: 'VALUE',
  99  |       totalAllocatedCost: 1000.0 * (i + 1),
  100 |       status: i === 2 ? 'POSTED' : 'DRAFT',
  101 |       version: 1,
  102 |     }));
  103 | 
  104 |     await page.route('**/api/procurement/landed-cost*', (route) =>
  105 |       route.fulfill({
  106 |         status: 200,
  107 |         contentType: 'application/json',
  108 |         body: JSON.stringify({
  109 |           data: mockVouchers.map((v) => ({
```