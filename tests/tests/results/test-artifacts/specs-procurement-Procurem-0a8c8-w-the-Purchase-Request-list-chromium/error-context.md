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

Locator: getByText('PR-2026-1782422636248')
Expected: visible
Error: strict mode violation: getByText('PR-2026-1782422636248') resolved to 2 elements:
    1) <span dir="ltr" class="font-mono text-cyan-500 font-bold drop-shadow-[0_0_8px_rgba(6,182,212,0.4)]">PR-2026-1782422636248</span> aka getByRole('table').getByText('PR-2026-1782422636248')
    2) <span class="text-sm font-black text-[#0B1220] dark:text-white uppercase tracking-tight">PR-2026-1782422636248</span> aka getByText('PR-2026-').nth(2)

Call log:
  - Expect "toBeVisible" with timeout 8000ms
  - waiting for getByText('PR-2026-1782422636248')

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - button "Open Next.js Dev Tools" [ref=e7] [cursor=pointer]:
    - img [ref=e8]
  - alert [ref=e11]
  - generic [ref=e13]:
    - banner [ref=e15]:
      - generic [ref=e16]:
        - img "Otantik Corporate Identity" [ref=e19] [cursor=pointer]
        - button "Switch Context Test Branch /Test Warehouse" [ref=e20]:
          - img [ref=e23]
          - generic [ref=e26]:
            - generic [ref=e27]: Switch Context
            - generic [ref=e29]: Test Branch /Test Warehouse
          - img [ref=e30]
      - generic [ref=e32]:
        - link "Search" [ref=e33] [cursor=pointer]:
          - /url: /en/search
          - img [ref=e34]
        - generic [ref=e37]:
          - button "Notifications" [ref=e39]:
            - img [ref=e40]
          - button "Toggle Theme" [ref=e44]:
            - img [ref=e46]
          - button "Arabic" [ref=e49]:
            - generic [ref=e50]: Arabic
        - link "User Profile" [ref=e51] [cursor=pointer]:
          - /url: /en/profile
          - generic [ref=e52]:
            - generic [ref=e53]: E2E Proc Officer
            - generic [ref=e54]: PROC_OFFICER
          - generic [ref=e55]: E
        - button "Logout" [ref=e56]:
          - img [ref=e57]
    - generic [ref=e60]:
      - complementary [ref=e62]:
        - navigation [ref=e65]:
          - generic [ref=e66]:
            - generic [ref=e67]: Dashboard
            - link "Dashboard Overview" [ref=e69] [cursor=pointer]:
              - /url: /en/dashboard
              - img [ref=e70]
              - generic [ref=e75]: Dashboard Overview
          - generic [ref=e76]:
            - generic [ref=e77]: Supply Chain
            - generic [ref=e78]:
              - link "Purchase Requests" [ref=e79] [cursor=pointer]:
                - /url: /en/purchase-requests
                - img [ref=e81]
                - generic [ref=e84]: Purchase Requests
              - link "Purchase Orders" [ref=e86] [cursor=pointer]:
                - /url: /en/purchase-orders
                - img [ref=e87]
                - generic [ref=e91]: Purchase Orders
          - generic [ref=e92]:
            - generic [ref=e93]: Master Data Hub
            - generic [ref=e94]:
              - link "Items Registry" [ref=e95] [cursor=pointer]:
                - /url: /en/master-data/items
                - img [ref=e96]
                - generic [ref=e100]: Items Registry
              - link "Warehouse Nodes" [ref=e101] [cursor=pointer]:
                - /url: /en/master-data/warehouses
                - img [ref=e102]
                - generic [ref=e105]: Warehouse Nodes
              - link "Units of Measure" [ref=e106] [cursor=pointer]:
                - /url: /en/master-data/units-of-measure
                - img [ref=e107]
                - generic [ref=e113]: Units of Measure
              - link "Suppliers" [ref=e114] [cursor=pointer]:
                - /url: /en/master-data/suppliers
                - img [ref=e115]
                - generic [ref=e119]: Suppliers
              - link "Barcode Registry" [ref=e120] [cursor=pointer]:
                - /url: /en/master-data/barcodes
                - img [ref=e121]
                - generic [ref=e122]: Barcode Registry
              - link "Currency Registry" [ref=e123] [cursor=pointer]:
                - /url: /en/master-data/currencies
                - img [ref=e124]
                - generic [ref=e129]: Currency Registry
              - link "FX Rates" [ref=e130] [cursor=pointer]:
                - /url: /en/master-data/fx-rates
                - img [ref=e131]
                - generic [ref=e134]: FX Rates
              - link "Branch Locations" [ref=e135] [cursor=pointer]:
                - /url: /en/master-data/branches
                - img [ref=e136]
                - generic [ref=e140]: Branch Locations
              - link "Data Import" [ref=e141] [cursor=pointer]:
                - /url: /en/master-data/import
                - img [ref=e142]
                - generic [ref=e146]: Data Import
          - generic [ref=e147]:
            - generic [ref=e148]: Reports
            - generic [ref=e149]:
              - link "Reports & Analytics" [ref=e150] [cursor=pointer]:
                - /url: /en/reports
                - img [ref=e151]
                - generic [ref=e153]: Reports & Analytics
              - link "Available Inventory" [ref=e154] [cursor=pointer]:
                - /url: /en/reports/available-inventory
                - img [ref=e155]
                - generic [ref=e158]: Available Inventory
              - link "Currency Summaries" [ref=e159] [cursor=pointer]:
                - /url: /en/reports/currency-summaries
                - img [ref=e160]
                - generic [ref=e163]: Currency Summaries
              - link "Expiry Report" [ref=e164] [cursor=pointer]:
                - /url: /en/reports/expiry
                - img [ref=e165]
                - generic [ref=e168]: Expiry Report
              - link "Stock Movements" [ref=e169] [cursor=pointer]:
                - /url: /en/reports/movements
                - img [ref=e170]
                - generic [ref=e173]: Stock Movements
              - link "Procurement Status" [ref=e174] [cursor=pointer]:
                - /url: /en/reports/procurement-status
                - img [ref=e175]
                - generic [ref=e178]: Procurement Status
              - link "WAC History" [ref=e179] [cursor=pointer]:
                - /url: /en/reports/wac-history
                - img [ref=e180]
                - generic [ref=e183]: WAC History
              - link "Stocktake Variance" [ref=e184] [cursor=pointer]:
                - /url: /en/reports/stocktake-variance
                - img [ref=e185]
                - generic [ref=e188]: Stocktake Variance
      - main [ref=e189]:
        - generic [ref=e190]:
          - generic [ref=e191]:
            - navigation [ref=e192]:
              - generic [ref=e193]:
                - link "Dashboard Overview" [ref=e194] [cursor=pointer]:
                  - /url: /en/dashboard
                - img [ref=e196]
              - generic [ref=e199]: Purchase Requests
            - generic [ref=e200]:
              - generic [ref=e201]:
                - heading "Purchase Requests" [level=1] [ref=e203]
                - generic [ref=e204]: Internal procurement requests and approval workflow
              - link "Create New PR" [ref=e206] [cursor=pointer]:
                - /url: /en/purchase-requests/new
                - button "Create New PR" [ref=e207]:
                  - img
                  - text: Create New PR
          - generic [ref=e208]:
            - generic [ref=e209]:
              - generic:
                - img
              - generic [ref=e210]:
                - generic [ref=e211]: Total Requests
                - generic [ref=e212]: "2"
              - img [ref=e214]
            - generic [ref=e217]:
              - generic:
                - img
              - generic [ref=e218]:
                - generic [ref=e219]: Approved PRs
                - generic [ref=e220]: "0"
              - img [ref=e222]
            - generic [ref=e225]:
              - generic:
                - img
              - generic [ref=e226]:
                - generic [ref=e227]: Pending Review
                - generic [ref=e228]: "2"
              - img [ref=e230]
          - generic [ref=e235]:
            - generic [ref=e236]:
              - generic [ref=e237]:
                - generic [ref=e239]:
                  - img
                  - textbox "Search" [ref=e240]
                - button "All Statuses" [ref=e243]:
                  - generic [ref=e245]: All Statuses
                  - img [ref=e246]
              - button "Export / Print" [ref=e249]:
                - img
                - generic [ref=e250]: Export / Print
                - img
            - table [ref=e252]:
              - rowgroup [ref=e253]:
                - row "Status ⇅ Document No ⇅ Warehouse ⇅ Created At ⇅ Requested By ⇅ ⇅" [ref=e254]:
                  - columnheader "Status ⇅" [ref=e255] [cursor=pointer]:
                    - generic [ref=e256]:
                      - text: Status
                      - generic [ref=e257]: ⇅
                  - columnheader "Document No ⇅" [ref=e258] [cursor=pointer]:
                    - generic [ref=e259]:
                      - text: Document No
                      - generic [ref=e260]: ⇅
                  - columnheader "Warehouse ⇅" [ref=e261] [cursor=pointer]:
                    - generic [ref=e262]:
                      - text: Warehouse
                      - generic [ref=e263]: ⇅
                  - columnheader "Created At ⇅" [ref=e264] [cursor=pointer]:
                    - generic [ref=e265]:
                      - text: Created At
                      - generic [ref=e266]: ⇅
                  - columnheader "Requested By ⇅" [ref=e267] [cursor=pointer]:
                    - generic [ref=e268]:
                      - text: Requested By
                      - generic [ref=e269]: ⇅
                  - columnheader "⇅" [ref=e270] [cursor=pointer]:
                    - generic [ref=e272]: ⇅
              - rowgroup [ref=e273]:
                - row "Draft PR-2026-1782422636248 — 26/06/2026 00:23 E2E Admin" [ref=e274] [cursor=pointer]:
                  - cell "Draft" [ref=e275]:
                    - generic [ref=e276]: Draft
                  - cell "PR-2026-1782422636248" [ref=e277]
                  - cell "—" [ref=e278]
                  - cell "26/06/2026 00:23" [ref=e279]:
                    - generic [ref=e280]: 26/06/2026 00:23
                  - cell "E2E Admin" [ref=e281]
                  - cell [ref=e282]:
                    - generic [ref=e283]:
                      - button [ref=e284]:
                        - img
                      - button [ref=e285]:
                        - img
                - row "Submitted PR-2026-1782422636249 — 26/06/2026 00:23 E2E Admin" [ref=e286] [cursor=pointer]:
                  - cell "Submitted" [ref=e287]:
                    - generic [ref=e288]: Submitted
                  - cell "PR-2026-1782422636249" [ref=e289]
                  - cell "—" [ref=e290]
                  - cell "26/06/2026 00:23" [ref=e291]:
                    - generic [ref=e292]: 26/06/2026 00:23
                  - cell "E2E Admin" [ref=e293]
                  - cell [ref=e294]:
                    - button [ref=e296]:
                      - img
            - generic [ref=e297]:
              - generic [ref=e298]: Showing 1 to 2 of 2
              - generic [ref=e299]:
                - button "Previous" [disabled]:
                  - img
                - generic [ref=e300]:
                  - generic [ref=e301]: "1"
                  - generic [ref=e302]: /
                  - generic [ref=e303]: "1"
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