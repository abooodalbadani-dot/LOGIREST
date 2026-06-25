# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: specs\procurement.spec.ts >> Procurement — Full Procure-to-Pay Workflow >> PR-01 | PROC_OFFICER can view the Purchase Request list
- Location: tests\e2e\specs\procurement.spec.ts:86:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('PR-2026-1782422636092')
Expected: visible
Error: strict mode violation: getByText('PR-2026-1782422636092') resolved to 2 elements:
    1) <span dir="ltr" class="font-mono text-cyan-500 font-bold drop-shadow-[0_0_8px_rgba(6,182,212,0.4)]">PR-2026-1782422636092</span> aka getByRole('table').getByText('PR-2026-1782422636092')
    2) <span class="text-sm font-black text-[#0B1220] dark:text-white uppercase tracking-tight">PR-2026-1782422636092</span> aka getByText('PR-2026-').nth(2)

Call log:
  - Expect "toBeVisible" with timeout 8000ms
  - waiting for getByText('PR-2026-1782422636092')

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - button "Open Next.js Dev Tools" [ref=e7] [cursor=pointer]:
    - img [ref=e8]
  - alert [ref=e13]
  - generic [ref=e15]:
    - banner [ref=e17]:
      - generic [ref=e18]:
        - img "Otantik Corporate Identity" [ref=e21] [cursor=pointer]
        - button "Switch Context Test Branch /Test Warehouse" [ref=e22]:
          - img [ref=e25]
          - generic [ref=e28]:
            - generic [ref=e29]: Switch Context
            - generic [ref=e31]: Test Branch /Test Warehouse
          - img [ref=e32]
      - generic [ref=e34]:
        - link "Search" [ref=e35]:
          - /url: /en/search
          - img [ref=e36]
        - generic [ref=e39]:
          - button "Notifications" [ref=e41]:
            - img [ref=e42]
          - button "Toggle Theme" [ref=e46]:
            - img [ref=e48]
          - button "Arabic" [ref=e51]:
            - generic [ref=e52]: Arabic
        - link "User Profile" [ref=e53]:
          - /url: /en/profile
          - generic [ref=e54]:
            - generic [ref=e55]: E2E Proc Officer
            - generic [ref=e56]: PROC_OFFICER
          - generic [ref=e57]: E
        - button "Logout" [ref=e58]:
          - img [ref=e59]
    - generic [ref=e62]:
      - complementary [ref=e64]:
        - navigation [ref=e67]:
          - generic [ref=e68]:
            - generic [ref=e69]: Dashboard
            - link "Dashboard Overview" [ref=e71]:
              - /url: /en/dashboard
              - img [ref=e72]
              - generic [ref=e77]: Dashboard Overview
          - generic [ref=e78]:
            - generic [ref=e79]: Supply Chain
            - generic [ref=e80]:
              - link "Purchase Requests" [ref=e81]:
                - /url: /en/purchase-requests
                - img [ref=e83]
                - generic [ref=e86]: Purchase Requests
              - link "Purchase Orders" [ref=e88]:
                - /url: /en/purchase-orders
                - img [ref=e89]
                - generic [ref=e93]: Purchase Orders
          - generic [ref=e94]:
            - generic [ref=e95]: Master Data Hub
            - generic [ref=e96]:
              - link "Items Registry" [ref=e97]:
                - /url: /en/master-data/items
                - img [ref=e98]
                - generic [ref=e102]: Items Registry
              - link "Warehouse Nodes" [ref=e103]:
                - /url: /en/master-data/warehouses
                - img [ref=e104]
                - generic [ref=e107]: Warehouse Nodes
              - link "Units of Measure" [ref=e108]:
                - /url: /en/master-data/units-of-measure
                - img [ref=e109]
                - generic [ref=e115]: Units of Measure
              - link "Suppliers" [ref=e116]:
                - /url: /en/master-data/suppliers
                - img [ref=e117]
                - generic [ref=e121]: Suppliers
              - link "Barcode Registry" [ref=e122]:
                - /url: /en/master-data/barcodes
                - img [ref=e123]
                - generic [ref=e124]: Barcode Registry
              - link "Currency Registry" [ref=e125]:
                - /url: /en/master-data/currencies
                - img [ref=e126]
                - generic [ref=e131]: Currency Registry
              - link "FX Rates" [ref=e132]:
                - /url: /en/master-data/fx-rates
                - img [ref=e133]
                - generic [ref=e136]: FX Rates
              - link "Branch Locations" [ref=e137]:
                - /url: /en/master-data/branches
                - img [ref=e138]
                - generic [ref=e142]: Branch Locations
              - link "Data Import" [ref=e143]:
                - /url: /en/master-data/import
                - img [ref=e144]
                - generic [ref=e148]: Data Import
          - generic [ref=e149]:
            - generic [ref=e150]: Reports
            - generic [ref=e151]:
              - link "Reports & Analytics" [ref=e152]:
                - /url: /en/reports
                - img [ref=e153]
                - generic [ref=e155]: Reports & Analytics
              - link "Available Inventory" [ref=e156]:
                - /url: /en/reports/available-inventory
                - img [ref=e157]
                - generic [ref=e160]: Available Inventory
              - link "Currency Summaries" [ref=e161]:
                - /url: /en/reports/currency-summaries
                - img [ref=e162]
                - generic [ref=e165]: Currency Summaries
              - link "Expiry Report" [ref=e166]:
                - /url: /en/reports/expiry
                - img [ref=e167]
                - generic [ref=e170]: Expiry Report
              - link "Stock Movements" [ref=e171]:
                - /url: /en/reports/movements
                - img [ref=e172]
                - generic [ref=e175]: Stock Movements
              - link "Procurement Status" [ref=e176]:
                - /url: /en/reports/procurement-status
                - img [ref=e177]
                - generic [ref=e180]: Procurement Status
              - link "WAC History" [ref=e181]:
                - /url: /en/reports/wac-history
                - img [ref=e182]
                - generic [ref=e185]: WAC History
              - link "Stocktake Variance" [ref=e186]:
                - /url: /en/reports/stocktake-variance
                - img [ref=e187]
                - generic [ref=e190]: Stocktake Variance
      - main [ref=e191]:
        - generic [ref=e192]:
          - generic [ref=e193]:
            - navigation [ref=e194]:
              - generic [ref=e195]:
                - link "Dashboard Overview" [ref=e196]:
                  - /url: /en/dashboard
                - img [ref=e198]
              - generic [ref=e201]: Purchase Requests
            - generic [ref=e202]:
              - generic [ref=e203]:
                - heading "Purchase Requests" [level=1] [ref=e205]
                - generic [ref=e206]: Internal procurement requests and approval workflow
              - link "Create New PR" [ref=e208]:
                - /url: /en/purchase-requests/new
                - button "Create New PR" [ref=e209]:
                  - img
                  - text: Create New PR
          - generic [ref=e210]:
            - generic [ref=e211]:
              - generic:
                - img
              - generic [ref=e212]:
                - generic [ref=e213]: Total Requests
                - generic [ref=e214]: "2"
              - img [ref=e216]
            - generic [ref=e219]:
              - generic:
                - img
              - generic [ref=e220]:
                - generic [ref=e221]: Approved PRs
                - generic [ref=e222]: "0"
              - img [ref=e224]
            - generic [ref=e227]:
              - generic:
                - img
              - generic [ref=e228]:
                - generic [ref=e229]: Pending Review
                - generic [ref=e230]: "2"
              - img [ref=e232]
          - generic [ref=e237]:
            - generic [ref=e238]:
              - generic [ref=e239]:
                - generic [ref=e241]:
                  - img
                  - textbox "Search" [ref=e242]
                - button "All Statuses" [ref=e245]:
                  - generic [ref=e247]: All Statuses
                  - img [ref=e248]
              - button "Export / Print" [ref=e251]:
                - img
                - generic [ref=e252]: Export / Print
                - img
            - table [ref=e254]:
              - rowgroup [ref=e255]:
                - row "Status ⇅ Document No ⇅ Warehouse ⇅ Created At ⇅ Requested By ⇅ ⇅" [ref=e256]:
                  - columnheader "Status ⇅" [ref=e257] [cursor=pointer]:
                    - generic [ref=e258]:
                      - text: Status
                      - generic [ref=e259]: ⇅
                  - columnheader "Document No ⇅" [ref=e260] [cursor=pointer]:
                    - generic [ref=e261]:
                      - text: Document No
                      - generic [ref=e262]: ⇅
                  - columnheader "Warehouse ⇅" [ref=e263] [cursor=pointer]:
                    - generic [ref=e264]:
                      - text: Warehouse
                      - generic [ref=e265]: ⇅
                  - columnheader "Created At ⇅" [ref=e266] [cursor=pointer]:
                    - generic [ref=e267]:
                      - text: Created At
                      - generic [ref=e268]: ⇅
                  - columnheader "Requested By ⇅" [ref=e269] [cursor=pointer]:
                    - generic [ref=e270]:
                      - text: Requested By
                      - generic [ref=e271]: ⇅
                  - columnheader "⇅" [ref=e272] [cursor=pointer]:
                    - generic [ref=e274]: ⇅
              - rowgroup [ref=e275]:
                - row "Draft PR-2026-1782422636092 — 26/06/2026 00:23 E2E Admin" [ref=e276] [cursor=pointer]:
                  - cell "Draft" [ref=e277]:
                    - generic [ref=e278]: Draft
                  - cell "PR-2026-1782422636092" [ref=e279]
                  - cell "—" [ref=e280]
                  - cell "26/06/2026 00:23" [ref=e281]:
                    - generic [ref=e282]: 26/06/2026 00:23
                  - cell "E2E Admin" [ref=e283]
                  - cell [ref=e284]:
                    - generic [ref=e285]:
                      - button [ref=e286]:
                        - img
                      - button [ref=e287]:
                        - img
                - row "Submitted PR-2026-1782422636094 — 26/06/2026 00:23 E2E Admin" [ref=e288] [cursor=pointer]:
                  - cell "Submitted" [ref=e289]:
                    - generic [ref=e290]: Submitted
                  - cell "PR-2026-1782422636094" [ref=e291]
                  - cell "—" [ref=e292]
                  - cell "26/06/2026 00:23" [ref=e293]:
                    - generic [ref=e294]: 26/06/2026 00:23
                  - cell "E2E Admin" [ref=e295]
                  - cell [ref=e296]:
                    - button [ref=e298]:
                      - img
            - generic [ref=e299]:
              - generic [ref=e300]: Showing 1 to 2 of 2
              - generic [ref=e301]:
                - button "Previous" [disabled]:
                  - img
                - generic [ref=e302]:
                  - generic [ref=e303]: "1"
                  - generic [ref=e304]: /
                  - generic [ref=e305]: "1"
                - button "Next" [disabled]:
                  - img
  - region "Notifications alt+T"
```

# Test source

```ts
  6   |  *
  7   |  * Test structure:
  8   |  *  1. PR Lifecycle — Create, Submit, Approve, Convert to PO
  9   |  *  2. PO Lifecycle — Submit, Approve
  10  |  *  3. GRN Lifecycle — Create, Submit (Receive), Post to Ledger
  11  |  *  4. Negative Tests — Status machine violations, Idempotency, Optimistic Lock
  12  |  *
  13  |  * Strategy: API mock pattern — each test sets up its own route intercepts
  14  |  * before navigation, ensuring full isolation.
  15  |  */
  16  | 
  17  | import { test, expect } from '@playwright/test';
  18  | import {
  19  |   injectAuthSession,
  20  |   clearAuthSession,
  21  |   DEFAULT_ADMIN_SESSION,
  22  |   type AuthSession,
  23  | } from '../helpers/auth';
  24  | import {
  25  |   makePR,
  26  |   makePO,
  27  |   makeGRN,
  28  |   mockPRById,
  29  |   mockPOById,
  30  |   mockGRNById,
  31  |   mockGRNPost403,
  32  | } from '../helpers/mocks';
  33  | import { PurchaseRequestPage } from '../pages/PurchaseRequestPage';
  34  | 
  35  | // ─── Role sessions ──────────────────────────────────────────────────────────
  36  | 
  37  | const PROC_OFFICER_SESSION: AuthSession = {
  38  |   token: 'e2e-proc-officer-proc-token',
  39  |   userId: 'e2e-proc-officer-2',
  40  |   name: 'E2E Proc Officer',
  41  |   email: 'proc.officer2@logirest-staging.com',
  42  |   role: 'PROC_OFFICER',
  43  |   warehouseId: 'warehouse-a',
  44  | };
  45  | 
  46  | const PROC_MGR_SESSION: AuthSession = {
  47  |   token: 'e2e-proc-mgr-proc-token',
  48  |   userId: 'e2e-proc-mgr-2',
  49  |   name: 'E2E Proc Manager',
  50  |   email: 'proc.mgr2@logirest-staging.com',
  51  |   role: 'PROC_MGR',
  52  |   warehouseId: 'warehouse-a',
  53  | };
  54  | 
  55  | const INV_MGR_SESSION: AuthSession = {
  56  |   token: 'e2e-inv-mgr-proc-token',
  57  |   userId: 'e2e-inv-mgr-2',
  58  |   name: 'E2E Inventory Manager',
  59  |   email: 'inv.mgr2@logirest-staging.com',
  60  |   role: 'INV_MGR',
  61  |   warehouseId: 'warehouse-a',
  62  | };
  63  | 
  64  | const CORS = {
  65  |   'Access-Control-Allow-Origin': 'http://localhost:3000',
  66  |   'Access-Control-Allow-Credentials': 'true',
  67  |   'Access-Control-Allow-Headers':
  68  |     'Content-Type, Authorization, x-branch-id, x-warehouse-id, x-xsrf-token, x-idempotency-key',
  69  |   'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
  70  | };
  71  | 
  72  | // ─── Test suite ────────────────────────────────────────────────────────────
  73  | 
  74  | test.describe('Procurement — Full Procure-to-Pay Workflow', () => {
  75  |   test.beforeEach(async ({ page }) => {
  76  |     page.on('console', (msg) => console.log(`[BROWSER ${msg.type()}] ${msg.text()}`));
  77  |     page.on('pageerror', (err) => console.log(`[BROWSER EXCEPTION] ${err.message}`));
  78  |   });
  79  | 
  80  |   test.afterEach(async ({ page }) => {
  81  |     await clearAuthSession(page);
  82  |   });
  83  | 
  84  |   // ─── 1. PR List — PROC_OFFICER sees PR list ───────────────────────────
  85  | 
  86  |   test('PR-01 | PROC_OFFICER can view the Purchase Request list', async ({ page }) => {
  87  |     const prA = makePR({ documentNumber: `PR-2026-${Date.now()}`, status: 'DRAFT' });
  88  |     const prB = makePR({ documentNumber: `PR-2026-${Date.now() + 1}`, status: 'SUBMITTED' });
  89  | 
  90  |     await injectAuthSession(page, PROC_OFFICER_SESSION);
  91  | 
  92  |     await page.route('**/api/v1/procurement/purchase-requests*', (route) => {
  93  |       if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
  94  |       return route.fulfill({
  95  |         status: 200,
  96  |         contentType: 'application/json',
  97  |         headers: CORS,
  98  |         body: JSON.stringify({ data: [prA, prB], meta: { total: 2, page: 1, pageSize: 20, totalPages: 1 } }),
  99  |       });
  100 |     });
  101 | 
  102 |     const prPage = new PurchaseRequestPage(page);
  103 |     await prPage.gotoPRList();
  104 | 
  105 |     // Both PRs should render in the list
> 106 |     await expect(page.getByText(prA.documentNumber as string)).toBeVisible({ timeout: 8000 });
      |                                                                ^ Error: expect(locator).toBeVisible() failed
  107 |     await expect(page.getByText(prB.documentNumber as string)).toBeVisible({ timeout: 8000 });
  108 |   });
  109 | 
  110 |   // ─── 2. PR Lifecycle: DRAFT → SUBMITTED ──────────────────────────────
  111 | 
  112 |   test('PR-02 | PR status transitions: DRAFT → SUBMITTED on submit action', async ({ page }) => {
  113 |     const prId = crypto.randomUUID();
  114 |     const pr = makePR({ id: prId, documentNumber: 'PR-2026-0002', status: 'DRAFT' });
  115 | 
  116 |     await injectAuthSession(page, PROC_OFFICER_SESSION);
  117 | 
  118 |     // GET returns DRAFT; POST /submit returns SUBMITTED
  119 |     await page.route(`**/api/v1/procurement/purchase-requests/${prId}**`, (route) => {
  120 |       if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
  121 |       if (route.request().method() === 'POST') {
  122 |         return route.fulfill({
  123 |           status: 200,
  124 |           contentType: 'application/json',
  125 |           headers: CORS,
  126 |           body: JSON.stringify({ data: { ...pr, status: 'SUBMITTED', version: 2 } }),
  127 |         });
  128 |       }
  129 |       return route.fulfill({
  130 |         status: 200, contentType: 'application/json', headers: CORS,
  131 |         body: JSON.stringify({ data: pr }),
  132 |       });
  133 |     });
  134 | 
  135 |     const prPage = new PurchaseRequestPage(page);
  136 |     await prPage.gotoPRDetail(prId);
  137 | 
  138 |     // PR is in DRAFT — submit button must be visible
  139 |     await prPage.expectStatus('DRAFT');
  140 |     await expect(prPage.submitButton).toBeVisible({ timeout: 5000 });
  141 | 
  142 |     // Click submit
  143 |     await prPage.clickSubmit();
  144 | 
  145 |     // After submit response, status should update to SUBMITTED
  146 |     // Re-mock GET to return SUBMITTED
  147 |     await page.route(`**/api/v1/procurement/purchase-requests/${prId}`, (route) => {
  148 |       return route.fulfill({
  149 |         status: 200, contentType: 'application/json', headers: CORS,
  150 |         body: JSON.stringify({ data: { ...pr, status: 'SUBMITTED', version: 2 } }),
  151 |       });
  152 |     });
  153 | 
  154 |     // Navigate back to detail to confirm state
  155 |     await prPage.gotoPRDetail(prId);
  156 |     await prPage.expectStatus('SUBMITTED');
  157 |   });
  158 | 
  159 |   // ─── 3. PR Approval: SUBMITTED → APPROVED (PROC_MGR role) ─────────────
  160 | 
  161 |   test('PR-03 | PROC_MGR can approve a submitted PR', async ({ page }) => {
  162 |     const prId = crypto.randomUUID();
  163 |     const pr = makePR({ id: prId, documentNumber: 'PR-2026-0003', status: 'SUBMITTED' });
  164 | 
  165 |     await injectAuthSession(page, PROC_MGR_SESSION);
  166 | 
  167 |     let currentStatus = 'SUBMITTED';
  168 |     await page.route(`**/api/v1/procurement/purchase-requests/${prId}**`, (route) => {
  169 |       if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
  170 |       if (route.request().method() === 'POST') {
  171 |         currentStatus = 'APPROVED';
  172 |         return route.fulfill({
  173 |           status: 200, contentType: 'application/json', headers: CORS,
  174 |           body: JSON.stringify({ data: { ...pr, status: 'APPROVED', version: 3 } }),
  175 |         });
  176 |       }
  177 |       return route.fulfill({
  178 |         status: 200, contentType: 'application/json', headers: CORS,
  179 |         body: JSON.stringify({ data: { ...pr, status: currentStatus } }),
  180 |       });
  181 |     });
  182 | 
  183 |     const prPage = new PurchaseRequestPage(page);
  184 |     await prPage.gotoPRDetail(prId);
  185 | 
  186 |     // Approve button should be visible for PROC_MGR on a SUBMITTED PR
  187 |     await expect(prPage.approveButton).toBeVisible({ timeout: 5000 });
  188 |     await prPage.clickApprove();
  189 | 
  190 |     // Re-load detail and verify APPROVED status
  191 |     await prPage.gotoPRDetail(prId);
  192 |     await prPage.expectStatus('APPROVED');
  193 |   });
  194 | 
  195 |   // ─── 4. Convert Approved PR to PO ─────────────────────────────────────
  196 | 
  197 |   test('PR-04 | Convert APPROVED PR to PO creates a new Purchase Order', async ({ page }) => {
  198 |     const prId = crypto.randomUUID();
  199 |     const newPoId = crypto.randomUUID();
  200 | 
  201 |     await injectAuthSession(page, PROC_MGR_SESSION);
  202 | 
  203 |     // Mock PR detail (APPROVED)
  204 |     await page.route(`**/api/v1/procurement/purchase-requests/${prId}**`, (route) => {
  205 |       if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
  206 |       if (route.request().method() === 'POST' && route.request().url().includes('/convert-to-po')) {
```