# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: landed-cost.spec.ts >> Admin Role Assignment (US3) >> assign role button is visible
- Location: apps\web\tests\e2e\landed-cost.spec.ts:145:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('button', { name: /assign/i })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByRole('button', { name: /assign/i })

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
  110 |             ...v,
  111 |             currencyId: 'cur-usd',
  112 |             exchangeRate: 1.0,
  113 |             transactionDate: new Date().toISOString(),
  114 |             createdById: 'user-1',
  115 |             createdAt: new Date().toISOString(),
  116 |             updatedAt: new Date().toISOString(),
  117 |           })),
  118 |           meta: { total: 3, page: 1, page_size: 10, total_pages: 1 },
  119 |         }),
  120 |       }),
  121 |     );
  122 | 
  123 |     await page.goto('/en/landed-cost');
  124 |     await expect(page.locator('[data-slot="page-header"]')).toBeVisible();
  125 |   });
  126 | });
  127 | 
  128 | test.describe('Warehouse Scope Selector (US2)', () => {
  129 |   test('scope selector renders for scoped users', async ({ page }) => {
  130 |     await page.goto('/en/dashboard');
  131 |     const scope = page.getByText(/warehouse/i);
  132 |     await expect(scope).toBeVisible({ timeout: 5000 });
  133 |   });
  134 | });
  135 | 
  136 | test.describe('Admin Role Assignment (US3)', () => {
  137 |   test.beforeEach(async ({ page }) => {
  138 |     await page.goto('/en/admin/roles');
  139 |   });
  140 | 
  141 |   test('page loads with role list', async ({ page }) => {
  142 |     await expect(page.locator('[data-slot="page-header"]')).toBeVisible();
  143 |   });
  144 | 
  145 |   test('assign role button is visible', async ({ page }) => {
  146 |     const assignBtn = page.getByRole('button', { name: /assign/i });
> 147 |     await expect(assignBtn).toBeVisible({ timeout: 5000 });
      |                             ^ Error: expect(locator).toBeVisible() failed
  148 |   });
  149 | 
  150 |   test('role assignment modal opens and shows user table', async ({ page }) => {
  151 |     const mockRoles = [
  152 |       { id: 'ADMIN', displayName: 'Admin', description: 'Full access', userCount: 2, permissions: [] },
  153 |       { id: 'PROC_OFFICER', displayName: 'Procurement Officer', description: 'Procurement', userCount: 5, permissions: [] },
  154 |       { id: 'WH_KEEPER', displayName: 'Warehouse Keeper', description: 'Warehouse', userCount: 8, permissions: [] },
  155 |     ];
  156 | 
  157 |     const mockUsers = Array.from({ length: 5 }).map((_, i) => ({
  158 |       id: crypto.randomUUID(),
  159 |       name: `User ${i + 1}`,
  160 |       email: `user${i + 1}@example.com`,
  161 |       role: i % 2 === 0 ? 'ADMIN' : 'PROC_OFFICER',
  162 |       status: 'ACTIVE',
  163 |       created_at: new Date().toISOString(),
  164 |     }));
  165 | 
  166 |     await page.route('**/api/admin/roles', (route) =>
  167 |       route.fulfill({
  168 |         status: 200,
  169 |         contentType: 'application/json',
  170 |         body: JSON.stringify(mockRoles),
  171 |       }),
  172 |     );
  173 | 
  174 |     await page.route('**/api/admin/users*', (route) =>
  175 |       route.fulfill({
  176 |         status: 200,
  177 |         contentType: 'application/json',
  178 |         body: JSON.stringify({
  179 |           data: mockUsers,
  180 |           meta: { page: 1, page_size: 10, total: 5, total_pages: 1 },
  181 |         }),
  182 |       }),
  183 |     );
  184 | 
  185 |     await page.goto('/en/admin/roles');
  186 |     const assignBtn = page.getByRole('button', { name: /assign role/i });
  187 |     await assignBtn.click();
  188 | 
  189 |     const dialog = page.getByRole('dialog');
  190 |     await expect(dialog).toBeVisible();
  191 |     await expect(dialog.getByText(/user 1/i)).toBeVisible();
  192 |   });
  193 | 
  194 |   test('assigning a new role calls the API and succeeds', async ({ page }) => {
  195 |     const userId = crypto.randomUUID();
  196 |     let mutationCalled = false;
  197 | 
  198 |     await page.route('**/api/admin/roles', (route) =>
  199 |       route.fulfill({
  200 |         status: 200,
  201 |         contentType: 'application/json',
  202 |         body: JSON.stringify([
  203 |           { id: 'ADMIN', displayName: 'Admin', description: 'Full access', userCount: 2, permissions: [] },
  204 |           { id: 'PROC_OFFICER', displayName: 'Procurement Officer', description: 'Procurement', userCount: 5, permissions: [] },
  205 |         ]),
  206 |       }),
  207 |     );
  208 | 
  209 |     await page.route('**/api/admin/users*', (route) =>
  210 |       route.fulfill({
  211 |         status: 200,
  212 |         contentType: 'application/json',
  213 |         body: JSON.stringify({
  214 |           data: [
  215 |             {
  216 |               id: userId,
  217 |               name: 'Test User',
  218 |               email: 'test@example.com',
  219 |               role: 'WH_KEEPER',
  220 |               status: 'ACTIVE',
  221 |               created_at: new Date().toISOString(),
  222 |             },
  223 |           ],
  224 |           meta: { page: 1, page_size: 10, total: 1, total_pages: 1 },
  225 |         }),
  226 |       }),
  227 |     );
  228 | 
  229 |     await page.route(`**/api/admin/users/${userId}/role`, (route) => {
  230 |       mutationCalled = true;
  231 |       return route.fulfill({
  232 |         status: 200,
  233 |         contentType: 'application/json',
  234 |         body: JSON.stringify({ success: true, message: 'Role updated successfully' }),
  235 |       });
  236 |     });
  237 | 
  238 |     await page.goto('/en/admin/roles');
  239 |     const assignBtn = page.getByRole('button', { name: /assign role/i });
  240 |     await assignBtn.click();
  241 | 
  242 |     const dialog = page.getByRole('dialog');
  243 |     await expect(dialog).toBeVisible();
  244 | 
  245 |     const userRow = dialog.getByText('Test User');
  246 |     await userRow.click();
  247 | 
```