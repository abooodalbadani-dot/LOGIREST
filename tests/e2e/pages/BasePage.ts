import { Page, Locator, expect } from '@playwright/test';

/**
 * BasePage — common selectors and interactions shared across all page objects.
 * Uses `data-slot` attributes and Playwright's web-first assertions.
 */
export class BasePage {
  readonly page: Page;
  readonly locale: string;

  // Layout
  readonly pageHeader: Locator;
  readonly sidebar: Locator;
  readonly toastContainer: Locator;

  constructor(page: Page, locale = 'en') {
    this.page = page;
    this.locale = locale;

    this.pageHeader = page.locator('[data-slot="page-header"]');
    this.sidebar = page.locator('nav[data-slot="sidebar"], aside[data-slot="sidebar"], nav');
    this.toastContainer = page.locator('[data-slot="toast"], [role="status"], [data-sonner-toast]');
  }

  /** Build a localized URL path */
  url(path: string): string {
    return `/${this.locale}${path.startsWith('/') ? path : `/${path}`}`;
  }

  /** Assert a success toast is visible */
  async expectSuccessToast(messageText?: string): Promise<void> {
    const toast = this.page.locator('[data-slot="toast"][data-type="success"], [data-sonner-toast][data-type="success"], .toast-success, [role="status"]').first();
    await expect(toast).toBeVisible({ timeout: 8000 });
    if (messageText) {
      await expect(toast).toContainText(messageText);
    }
  }

  /** Assert an error toast containing a given message */
  async expectErrorToast(messageText?: string): Promise<void> {
    const toast = this.page.locator('[data-type="error"], .toast-error, [data-sonner-toast]').first();
    await expect(toast).toBeVisible({ timeout: 8000 });
    if (messageText) {
      await expect(toast).toContainText(messageText);
    }
  }

  /** Wait for the page header to be visible (page is hydrated) */
  async waitForPageLoad(): Promise<void> {
    await expect(this.pageHeader).toBeVisible({ timeout: 15000 });
  }

  /** Click a button by its visible text label */
  async clickButton(label: string): Promise<void> {
    await this.page.getByRole('button', { name: label }).click();
  }

  /** Select an option from a shadcn Select/Combobox component */
  async selectOption(triggerTestId: string, optionText: string): Promise<void> {
    await this.page.locator(`[data-testid="${triggerTestId}"]`).click();
    await this.page.getByRole('option', { name: optionText }).click();
  }

  /** Assert a badge/status chip with the given text is visible */
  async expectStatusBadge(status: string): Promise<void> {
    const badge = this.page.locator('[data-slot="badge"], .badge, [data-testid="status-badge"]').filter({ hasText: status });
    await expect(badge).toBeVisible({ timeout: 8000 });
  }

  /** Navigate using the sidebar link */
  async navigateTo(hrefPattern: string): Promise<void> {
    const link = this.page.locator(`a[href*="${hrefPattern}"]`).first();
    await expect(link).toBeVisible({ timeout: 5000 });
    await link.click();
  }

  /** Confirm a modal dialog (clicks primary confirm button) */
  async confirmModal(confirmButtonLabel = 'Confirm'): Promise<void> {
    const modal = this.page.locator('[role="dialog"], [data-slot="dialog"]');
    await expect(modal).toBeVisible({ timeout: 5000 });
    await modal.getByRole('button', { name: confirmButtonLabel }).click();
  }
}
