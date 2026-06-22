import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * TransferPage — encapsulates the Inter-Warehouse Transfer lifecycle screens.
 * Routes:
 *  - /[locale]/transfers
 *  - /[locale]/transfers/[id]
 *  - /[locale]/transfers/[id]/ship
 *  - /[locale]/transfers/[id]/receive
 *  - /[locale]/transfers/[id]/dispute
 */
export class TransferPage extends BasePage {
  // List locators
  readonly createNewButton: Locator;

  // Detail locators
  readonly statusBadge: Locator;
  readonly shipButton: Locator;
  readonly receiveButton: Locator;
  readonly postButton: Locator;
  readonly cancelButton: Locator;
  readonly disputeButton: Locator;

  constructor(page: Page, locale = 'en') {
    super(page, locale);

    this.createNewButton = page.getByRole('link', { name: /new|create/i }).first();

    this.statusBadge = page.locator('[data-slot="badge"], [data-testid="status-badge"]').first();
    this.shipButton = page.getByRole('button', { name: /^ship/i }).first();
    this.receiveButton = page.getByRole('button', { name: /^receive/i }).first();
    this.postButton = page.getByRole('button', { name: /^post$/i }).first();
    this.cancelButton = page.getByRole('button', { name: /cancel/i }).first();
    this.disputeButton = page.getByRole('button', { name: /dispute/i }).first();
  }

  // ── Navigation ─────────────────────────────────────────────────

  async gotoList(): Promise<void> {
    await this.page.goto(this.url('/transfers'));
    await this.waitForPageLoad();
  }

  async gotoDetail(id: string): Promise<void> {
    await this.page.goto(this.url(`/transfers/${id}`));
    await this.waitForPageLoad();
  }

  // ── Assertions ─────────────────────────────────────────────────

  async expectStatus(status: string): Promise<void> {
    await expect(
      this.page.locator('[data-slot="badge"], [data-testid="status-badge"]').filter({ hasText: status })
    ).toBeVisible({ timeout: 8000 });
  }

  async expectShipButtonVisible(): Promise<void> {
    await expect(this.shipButton).toBeVisible({ timeout: 5000 });
  }

  async expectShipButtonNotPresent(): Promise<void> {
    await expect(this.shipButton).not.toBeVisible({ timeout: 3000 });
  }

  async expectReceiveButtonVisible(): Promise<void> {
    await expect(this.receiveButton).toBeVisible({ timeout: 5000 });
  }

  async expectReceiveButtonNotPresent(): Promise<void> {
    await expect(this.receiveButton).not.toBeVisible({ timeout: 3000 });
  }

  async expectPostButtonVisible(): Promise<void> {
    await expect(this.postButton).toBeVisible({ timeout: 5000 });
  }

  async expectPostButtonNotPresent(): Promise<void> {
    await expect(this.postButton).not.toBeVisible({ timeout: 3000 });
  }

  async expectDisputeButtonVisible(): Promise<void> {
    await expect(this.disputeButton).toBeVisible({ timeout: 5000 });
  }

  // ── Actions ────────────────────────────────────────────────────

  async clickShip(): Promise<void> {
    await this.shipButton.click();
    await this.maybeDismissConfirmModal();
  }

  async clickReceive(): Promise<void> {
    await this.receiveButton.click();
    await this.maybeDismissConfirmModal();
  }

  async clickPost(): Promise<void> {
    await this.postButton.click();
    await this.maybeDismissConfirmModal();
  }

  async clickDispute(): Promise<void> {
    await this.disputeButton.click();
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
