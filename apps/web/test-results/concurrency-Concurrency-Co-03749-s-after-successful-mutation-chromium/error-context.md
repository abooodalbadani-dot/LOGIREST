# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: concurrency.spec.ts >> Concurrency / Conflict Resolution (409) >> mutateAsync pattern: redirect only happens after successful mutation
- Location: apps\web\tests\e2e\concurrency.spec.ts:118:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: /save/i })

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
  115 |     await expect(saveButton).toBeDisabled();
  116 |   });
  117 | 
  118 |   test('mutateAsync pattern: redirect only happens after successful mutation', async ({
  119 |     page,
  120 |   }) => {
  121 |     await page.goto('/en/master-data/units-of-measure/UOM-001/edit');
  122 | 
  123 |     await page.waitForSelector('form');
  124 | 
  125 |     let mutationAttempted = false;
  126 |     await page.route('**/api/units-of-measure/UOM-001', (route) => {
  127 |       mutationAttempted = true;
  128 |       route.fulfill({
  129 |         status: 200,
  130 |         contentType: 'application/json',
  131 |         body: JSON.stringify({ id: 'UOM-001', version: 2 }),
  132 |       });
  133 |     });
  134 | 
  135 |     const saveButton = page.getByRole('button', { name: /save/i });
> 136 |     await saveButton.click();
      |                      ^ Error: locator.click: Test timeout of 30000ms exceeded.
  137 | 
  138 |     await page.waitForURL('**/master-data/units-of-measure', { timeout: 5000 });
  139 |     expect(mutationAttempted).toBe(true);
  140 |   });
  141 | 
  142 |   test('mutateAsync pattern: no redirect on mutation error', async ({ page }) => {
  143 |     await page.goto('/en/master-data/units-of-measure/UOM-001/edit');
  144 | 
  145 |     await page.waitForSelector('form');
  146 | 
  147 |     await page.route('**/api/units-of-measure/UOM-001', (route) =>
  148 |       route.fulfill({
  149 |         status: 500,
  150 |         contentType: 'application/json',
  151 |         body: JSON.stringify({ message: 'Internal Server Error' }),
  152 |       })
  153 |     );
  154 | 
  155 |     const saveButton = page.getByRole('button', { name: /save/i });
  156 |     await saveButton.click();
  157 | 
  158 |     await page.waitForTimeout(1000);
  159 | 
  160 |     expect(page.url()).toContain('/master-data/units-of-measure/UOM-001/edit');
  161 |   });
  162 | });
```