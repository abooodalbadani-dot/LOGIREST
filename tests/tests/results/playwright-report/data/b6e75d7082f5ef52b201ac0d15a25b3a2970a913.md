# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: specs\procurement.spec.ts >> Procurement — Full Procure-to-Pay Workflow >> GRN-NEG-01 | WH_KEEPER: Post button absent on GRN in RECEIVED state
- Location: tests\e2e\specs\procurement.spec.ts:320:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('[data-slot="page-header"]')
Expected: visible
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 15000ms
  - waiting for locator('[data-slot="page-header"]')

```

```yaml
- alert
- banner:
  - img "Otantik Corporate Identity"
  - button "Switch Context Test Branch /Test Warehouse"
  - link "Search":
    - /url: /en/search
  - button "Notifications"
  - button "Toggle Theme"
  - button "Arabic"
  - link "User Profile":
    - /url: /en/profile
    - text: E2E WH Keeper GRN WH_KEEPER E
  - button "Logout"
- complementary:
  - navigation:
    - text: Dashboard
    - link "Dashboard Overview":
      - /url: /en/dashboard
    - text: Inventory Management
    - link "Inventory Balance":
      - /url: /en/inventory/balance
    - link "Lots":
      - /url: /en/inventory/lots
    - link "Stock Movements":
      - /url: /en/inventory/movements
    - link "Goods Received":
      - /url: /en/goods-received
    - link "Issues":
      - /url: /en/issues
    - link "Transfers":
      - /url: /en/transfers
    - link "Stocktake":
      - /url: /en/stocktake
    - link "Adjustments":
      - /url: /en/adjustments
    - link "Operational Requisitions":
      - /url: /en/kitchen-requests
    - link "Scan Mode":
      - /url: /en/inventory/scan-mode
    - link "Expired Overrides":
      - /url: /en/inventory/expired-override
    - link "Stocktake Archive":
      - /url: /en/stocktake/archive
    - link "Transfer Hub":
      - /url: /en/transfers/hub
    - text: Communications
    - link "Notifications":
      - /url: /en/communications/notifications
- main:
  - heading "Goods Received Note" [level=1]
  - text: Read-Only View • GRN-2026-4237 Received
  - button "Export"
  - button "Inspect Scan Registers"
  - paragraph: Supplier
  - paragraph: supplier...
  - paragraph: Order Currency
  - paragraph: currency...
  - paragraph: Reference Document
  - text: PO-2026-0001
  - paragraph: Warehouse
  - paragraph: warehous...
  - paragraph: Notes
  - text: No Notes
  - table:
    - rowgroup:
      - row "Name Lot Expiry Qty UoM Received Qty Lot Allocation":
        - columnheader "Name"
        - columnheader "Lot"
        - columnheader "Expiry"
        - columnheader "Qty"
        - columnheader "UoM"
        - columnheader "Received Qty"
        - columnheader "Lot Allocation"
    - rowgroup:
      - row "No items added.":
        - cell "No items added.":
          - paragraph: No items added.
  - paragraph: Finalized Posting Rate
  - paragraph: 1 USD = 1 SAR
  - paragraph: Receipt Total (USD)
  - paragraph: $0.00
  - paragraph: Base Value (SAR)
  - paragraph: SAR 0.00
  - heading "Audit Trail / History" [level=3]
  - paragraph: Received
  - text: 22/06/2026 05:35:04 System
  - button "Back"
- region "Notifications alt+T"
```

# Test source

```ts
  1  | import { Page, Locator, expect } from '@playwright/test';
  2  | 
  3  | /**
  4  |  * BasePage — common selectors and interactions shared across all page objects.
  5  |  * Uses `data-slot` attributes and Playwright's web-first assertions.
  6  |  */
  7  | export class BasePage {
  8  |   readonly page: Page;
  9  |   readonly locale: string;
  10 | 
  11 |   // Layout
  12 |   readonly pageHeader: Locator;
  13 |   readonly sidebar: Locator;
  14 |   readonly toastContainer: Locator;
  15 | 
  16 |   constructor(page: Page, locale = 'en') {
  17 |     this.page = page;
  18 |     this.locale = locale;
  19 | 
  20 |     this.pageHeader = page.locator('[data-slot="page-header"]');
  21 |     this.sidebar = page.locator('nav[data-slot="sidebar"], aside[data-slot="sidebar"], nav');
  22 |     this.toastContainer = page.locator('[data-slot="toast"], [role="status"], [data-sonner-toast]');
  23 |   }
  24 | 
  25 |   /** Build a localized URL path */
  26 |   url(path: string): string {
  27 |     return `/${this.locale}${path.startsWith('/') ? path : `/${path}`}`;
  28 |   }
  29 | 
  30 |   /** Assert a success toast is visible */
  31 |   async expectSuccessToast(messageText?: string): Promise<void> {
  32 |     const toast = this.page.locator('[data-slot="toast"][data-type="success"], [data-sonner-toast][data-type="success"], .toast-success, [role="status"]').first();
  33 |     await expect(toast).toBeVisible({ timeout: 8000 });
  34 |     if (messageText) {
  35 |       await expect(toast).toContainText(messageText);
  36 |     }
  37 |   }
  38 | 
  39 |   /** Assert an error toast containing a given message */
  40 |   async expectErrorToast(messageText?: string): Promise<void> {
  41 |     const toast = this.page.locator('[data-type="error"], .toast-error, [data-sonner-toast]').first();
  42 |     await expect(toast).toBeVisible({ timeout: 8000 });
  43 |     if (messageText) {
  44 |       await expect(toast).toContainText(messageText);
  45 |     }
  46 |   }
  47 | 
  48 |   /** Wait for the page header to be visible (page is hydrated) */
  49 |   async waitForPageLoad(): Promise<void> {
> 50 |     await expect(this.pageHeader).toBeVisible({ timeout: 15000 });
     |                                   ^ Error: expect(locator).toBeVisible() failed
  51 |   }
  52 | 
  53 |   /** Click a button by its visible text label */
  54 |   async clickButton(label: string): Promise<void> {
  55 |     await this.page.getByRole('button', { name: label }).click();
  56 |   }
  57 | 
  58 |   /** Select an option from a shadcn Select/Combobox component */
  59 |   async selectOption(triggerTestId: string, optionText: string): Promise<void> {
  60 |     await this.page.locator(`[data-testid="${triggerTestId}"]`).click();
  61 |     await this.page.getByRole('option', { name: optionText }).click();
  62 |   }
  63 | 
  64 |   /** Assert a badge/status chip with the given text is visible */
  65 |   async expectStatusBadge(status: string): Promise<void> {
  66 |     const badge = this.page.locator('[data-slot="badge"], .badge, [data-testid="status-badge"]').filter({ hasText: status });
  67 |     await expect(badge).toBeVisible({ timeout: 8000 });
  68 |   }
  69 | 
  70 |   /** Navigate using the sidebar link */
  71 |   async navigateTo(hrefPattern: string): Promise<void> {
  72 |     const link = this.page.locator(`a[href*="${hrefPattern}"]`).first();
  73 |     await expect(link).toBeVisible({ timeout: 5000 });
  74 |     await link.click();
  75 |   }
  76 | 
  77 |   /** Confirm a modal dialog (clicks primary confirm button) */
  78 |   async confirmModal(confirmButtonLabel = 'Confirm'): Promise<void> {
  79 |     const modal = this.page.locator('[role="dialog"], [data-slot="dialog"]');
  80 |     await expect(modal).toBeVisible({ timeout: 5000 });
  81 |     await modal.getByRole('button', { name: confirmButtonLabel }).click();
  82 |   }
  83 | }
  84 | 
```