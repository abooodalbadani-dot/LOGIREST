import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * PurchaseRequestPage — encapsulates all PR + PO + GRN screens.
 * Routes:
 *  - /[locale]/purchase-requests
 *  - /[locale]/purchase-requests/[id]
 *  - /[locale]/purchase-orders/[id]
 *  - /[locale]/goods-received/[id]
 */
export class PurchaseRequestPage extends BasePage {
  // List page locators
  readonly createNewButton: Locator;
  readonly searchInput: Locator;

  // Document detail locators
  readonly documentNumberHeading: Locator;
  readonly statusBadge: Locator;
  readonly submitButton: Locator;
  readonly approveButton: Locator;
  readonly rejectButton: Locator;
  readonly cancelButton: Locator;
  readonly convertToPOButton: Locator;
  readonly postButton: Locator;
  readonly voidButton: Locator;
  readonly sendEmailButton: Locator;

  constructor(page: Page, locale = 'en') {
    super(page, locale);

    this.createNewButton = page.getByRole('link', { name: /new|create|add/i }).first();
    this.searchInput = page.locator('input[placeholder*="search" i], input[type="search"]').first();

    this.documentNumberHeading = page.locator('h1, [data-testid="doc-number"]').first();
    this.statusBadge = page.locator('[data-slot="badge"], [data-testid="status-badge"]').first();

    this.submitButton = page.getByRole('button', { name: /submit/i }).first();
    this.approveButton = page.getByRole('button', { name: /approve/i }).first();
    this.rejectButton = page.getByRole('button', { name: /reject/i }).first();
    this.cancelButton = page.getByRole('button', { name: /cancel/i }).first();
    this.convertToPOButton = page.getByRole('button', { name: /convert.*(po|purchase order)/i }).first();
    this.postButton = page.getByRole('button', { name: /^post$/i }).first();
    this.voidButton = page.getByRole('button', { name: /void/i }).first();
    this.sendEmailButton = page.getByRole('button', { name: /send.*email|email.*supplier/i }).first();
  }

  // ── Navigation ─────────────────────────────────────────────────

  async gotoPRList(): Promise<void> {
    await this.page.goto(this.url('/purchase-requests'));
    await this.waitForPageLoad();
  }

  async gotoPRDetail(id: string): Promise<void> {
    await this.page.goto(this.url(`/purchase-requests/${id}`));
    await this.waitForPageLoad();
  }

  async gotoPODetail(id: string): Promise<void> {
    await this.page.goto(this.url(`/purchase-orders/${id}`));
    await this.waitForPageLoad();
  }

  async gotoGRNDetail(id: string): Promise<void> {
    await this.page.goto(this.url(`/goods-received/${id}`));
    await this.waitForPageLoad();
  }

  // ── Assertions ─────────────────────────────────────────────────

  async expectStatus(status: string): Promise<void> {
    await expect(
      this.page.locator('[data-slot="badge"], [data-testid="status-badge"]').filter({ hasText: status })
    ).toBeVisible({ timeout: 8000 });
  }

  async expectDocumentNumber(pattern: RegExp | string): Promise<void> {
    await expect(this.page.getByText(pattern)).toBeVisible({ timeout: 8000 });
  }

  async expectSubmitButtonVisible(): Promise<void> {
    await expect(this.submitButton).toBeVisible({ timeout: 5000 });
  }

  async expectApproveButtonVisible(): Promise<void> {
    await expect(this.approveButton).toBeVisible({ timeout: 5000 });
  }

  async expectApproveButtonNotPresent(): Promise<void> {
    await expect(this.approveButton).not.toBeVisible({ timeout: 3000 });
  }

  async expectConvertToPOButtonVisible(): Promise<void> {
    await expect(this.convertToPOButton).toBeVisible({ timeout: 5000 });
  }

  async expectConvertToPOButtonNotPresent(): Promise<void> {
    await expect(this.convertToPOButton).not.toBeVisible({ timeout: 3000 });
  }

  async expectPostButtonVisible(): Promise<void> {
    await expect(this.postButton).toBeVisible({ timeout: 5000 });
  }

  async expectPostButtonNotPresent(): Promise<void> {
    await expect(this.postButton).not.toBeVisible({ timeout: 3000 });
  }

  async expectVoidButtonNotPresent(): Promise<void> {
    await expect(this.voidButton).not.toBeVisible({ timeout: 3000 });
  }

  // ── Actions ────────────────────────────────────────────────────

  async clickSubmit(): Promise<void> {
    await this.submitButton.click();
    // Some actions open a confirm modal
    await this.maybeDismissConfirmModal();
  }

  async clickApprove(): Promise<void> {
    await this.approveButton.click();
    await this.maybeDismissConfirmModal();
  }

  async clickReject(): Promise<void> {
    await this.rejectButton.click();
    await this.maybeDismissConfirmModal();
  }

  async clickPost(): Promise<void> {
    await this.postButton.click();
    await this.maybeDismissConfirmModal();
  }

  async clickConvertToPO(): Promise<void> {
    await this.convertToPOButton.click();
  }

  /** If a confirm/alert dialog appears, click the primary confirm button */
  private async maybeDismissConfirmModal(): Promise<void> {
    const modal = this.page.locator('[role="dialog"]');
    const isVisible = await modal.isVisible().catch(() => false);
    if (isVisible) {
      const confirmBtn = modal.getByRole('button', { name: /confirm|yes|approve|ok/i }).first();
      if (await confirmBtn.isVisible().catch(() => false)) {
        await confirmBtn.click();
      }
    }
  }
}
