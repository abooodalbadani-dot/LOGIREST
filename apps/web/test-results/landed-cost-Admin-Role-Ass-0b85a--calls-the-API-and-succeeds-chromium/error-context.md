# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: landed-cost.spec.ts >> Admin Role Assignment (US3) >> assigning a new role calls the API and succeeds
- Location: apps\web\tests\e2e\landed-cost.spec.ts:194:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: /assign role/i })

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - button "Open Next.js Dev Tools" [ref=e7] [cursor=pointer]:
    - img [ref=e8]
  - alert [ref=e11]
  - main [ref=e12]:
    - generic [ref=e13]:
      - generic [ref=e14]:
        - img "Professional Kitchen" [ref=e16]
        - generic [ref=e20]:
          - generic [ref=e21]:
            - img [ref=e22]
            - generic [ref=e24]: System Online
          - button "Arabic" [ref=e25]
        - generic [ref=e26]:
          - generic [ref=e27]:
            - img "LogiRest Logo" [ref=e29]
            - generic [ref=e31]: v3.1.04
          - heading "LogiRest | Smart Inventory Control" [level=1] [ref=e32]
          - paragraph [ref=e33]: Precision management for high-performance kitchens. Real-time inventory tracking and automated procurement.
          - generic [ref=e34]:
            - generic [ref=e35]:
              - img [ref=e36]
              - generic [ref=e39]: Enterprise v3 Enabled
            - generic [ref=e40]:
              - generic [ref=e41]: OP
              - generic [ref=e42]: OP
              - generic [ref=e43]: OP
              - generic [ref=e44]: "+12"
            - generic [ref=e45]: ACTIVE OPERATORS
      - generic [ref=e48]:
        - generic [ref=e49]:
          - heading "Authorization Required" [level=2] [ref=e50]
          - paragraph [ref=e51]: Enter your credentials to access the secure portal.
        - generic [ref=e52]:
          - generic [ref=e53]:
            - generic [ref=e54]: Operator ID
            - generic [ref=e55]:
              - generic:
                - img
              - textbox "Enter ID or Email" [ref=e56]
          - generic [ref=e57]:
            - generic [ref=e58]:
              - generic [ref=e59]: Access Protocol
              - button "Recover Access" [ref=e60]
            - generic [ref=e61]:
              - generic:
                - img
              - textbox "Enter Password" [ref=e62]
              - button [ref=e63]:
                - img [ref=e64]
          - generic [ref=e67]:
            - button "BIOMETRIC LINK" [ref=e68]:
              - img [ref=e69]
              - generic [ref=e78]: BIOMETRIC LINK
            - button "HARDWARE TOKEN" [ref=e79]:
              - img [ref=e80]
              - generic [ref=e88]: HARDWARE TOKEN
          - button "INITIALIZE SESSION" [ref=e89]:
            - generic [ref=e90]:
              - img
              - text: INITIALIZE SESSION
  - region "Notifications alt+T"
```

# Test source

```ts
  140 | 
  141 |   test('page loads with role list', async ({ page }) => {
  142 |     await expect(page.locator('[data-slot="page-header"]')).toBeVisible();
  143 |   });
  144 | 
  145 |   test('assign role button is visible', async ({ page }) => {
  146 |     const assignBtn = page.getByRole('button', { name: /assign/i });
  147 |     await expect(assignBtn).toBeVisible({ timeout: 5000 });
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
> 240 |     await assignBtn.click();
      |                     ^ Error: locator.click: Test timeout of 30000ms exceeded.
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
  267 |     await expect(page.locator('[data-slot="page-header"]')).toBeVisible();
  268 |   });
  269 | });
  270 | 
```