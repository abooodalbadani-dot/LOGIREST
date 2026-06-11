# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: landed-cost.spec.ts >> Dynamic Currency Display (US4) >> dashboard renders with currency data
- Location: apps\web\tests\e2e\landed-cost.spec.ts:265:3

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
  248 |     await expect(dialog.getByPlaceholder(/select role/i)).toBeVisible();
  249 |     const confirmBtn = dialog.getByRole('button', { name: /confirm/i });
  250 |     await expect(confirmBtn).toBeDisabled();
  251 | 
  252 |     const roleTrigger = dialog.locator('[data-slot="select-trigger"]');
  253 |     await roleTrigger.click();
  254 |     const roleOption = page.getByRole('option', { name: /procurement officer/i });
  255 |     await roleOption.click();
  256 | 
  257 |     await expect(confirmBtn).toBeEnabled();
  258 |     await confirmBtn.click();
  259 | 
  260 |     await expect(mutationCalled).toBe(true);
  261 |   });
  262 | });
  263 | 
  264 | test.describe('Dynamic Currency Display (US4)', () => {
  265 |   test('dashboard renders with currency data', async ({ page }) => {
  266 |     await page.goto('/en/dashboard');
> 267 |     await expect(page.locator('[data-slot="page-header"]')).toBeVisible();
      |                                                             ^ Error: expect(locator).toBeVisible() failed
  268 |   });
  269 | });
  270 | 
```