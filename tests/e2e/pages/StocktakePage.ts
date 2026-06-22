import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * StocktakePage — encapsulates the Stocktake session lifecycle screens.
 * Routes:
 *  - /[locale]/stocktake
 *  - /[locale]/stocktake/[id]
 *  - /[locale]/stocktake/[id]/count
 *  - /[locale]/stocktake/[id]/variance
 */
export class StocktakePage extends BasePage {
  // List locators
  readonly newSessionButton: Locator;

  // Session detail locators
  readonly statusBadge: Locator;
  readonly startButton: Locator;
  readonly countButton: Locator;
  readonly submitButton: Locator;
  readonly approveButton: Locator;
  readonly rejectButton: Locator;
  readonly reviewVarianceButton: Locator;
  readonly postButton: Locator;
  readonly cancelButton: Locator;
  readonly recountButton: Locator;

  constructor(page: Page, locale = 'en') {
    super(page, locale);

    this.newSessionButton = page.getByRole('link', { name: /new|create/i }).first();

    this.statusBadge = page.locator('[data-slot="badge"], [data-testid="status-badge"]').first();
    this.startButton = page.getByRole('button', { name: /^start/i }).first();
    this.countButton = page.getByRole('button', { name: /^count/i }).first();
    this.submitButton = page.getByRole('button', { name: /submit/i }).first();
    this.approveButton = page.getByRole('button', { name: /approve/i }).first();
    this.rejectButton = page.getByRole('button', { name: /reject/i }).first();
    this.reviewVarianceButton = page.getByRole('button', { name: /review.variance/i }).first();
    this.postButton = page.getByRole('button', { name: /^post$/i }).first();
    this.cancelButton = page.getByRole('button', { name: /cancel/i }).first();
    this.recountButton = page.getByRole('button', { name: /recount/i }).first();
  }

  // ── Navigation ─────────────────────────────────────────────────

  async gotoList(): Promise<void> {
    await this.page.goto(this.url('/stocktake'));
    await this.waitForPageLoad();
  }

  async gotoDetail(id: string): Promise<void> {
    await this.page.goto(this.url(`/stocktake/${id}`));
    await this.waitForPageLoad();
  }

  async gotoCount(id: string): Promise<void> {
    await this.page.goto(this.url(`/stocktake/${id}/count`));
    await this.waitForPageLoad();
  }

  async gotoVariance(id: string): Promise<void> {
    await this.page.goto(this.url(`/stocktake/${id}/variance`));
    await this.waitForPageLoad();
  }

  // ── Assertions ─────────────────────────────────────────────────

  async expectStatus(status: string): Promise<void> {
    await expect(
      this.page.locator('[data-slot="badge"], [data-testid="status-badge"]').filter({ hasText: status })
    ).toBeVisible({ timeout: 8000 });
  }

  async expectStartButtonVisible(): Promise<void> {
    await expect(this.startButton).toBeVisible({ timeout: 5000 });
  }

  async expectPostButtonVisible(): Promise<void> {
    await expect(this.postButton).toBeVisible({ timeout: 5000 });
  }

  async expectPostButtonNotPresent(): Promise<void> {
    await expect(this.postButton).not.toBeVisible({ timeout: 3000 });
  }

  async expectRecountButtonVisible(): Promise<void> {
    await expect(this.recountButton).toBeVisible({ timeout: 5000 });
  }

  async expectRecountButtonNotPresent(): Promise<void> {
    await expect(this.recountButton).not.toBeVisible({ timeout: 3000 });
  }

  async expectApproveButtonNotPresent(): Promise<void> {
    await expect(this.approveButton).not.toBeVisible({ timeout: 3000 });
  }

  async expectApproveButtonVisible(): Promise<void> {
    await expect(this.approveButton).toBeVisible({ timeout: 5000 });
  }

  // ── Actions ────────────────────────────────────────────────────

  async clickStart(): Promise<void> {
    await this.startButton.click();
    await this.maybeDismissConfirmModal();
  }

  async clickSubmit(): Promise<void> {
    await this.submitButton.click();
    await this.maybeDismissConfirmModal();
  }

  async clickApprove(): Promise<void> {
    await this.approveButton.click();
    await this.maybeDismissConfirmModal();
  }

  async clickPost(): Promise<void> {
    await this.postButton.click();
    await this.maybeDismissConfirmModal();
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
