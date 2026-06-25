import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * LoginPage — encapsulates the login form interactions.
 * Route: /[locale]/login
 */
export class LoginPage extends BasePage {
  constructor(page: Page, locale = 'en') {
    super(page, locale);
  }

  async goto(): Promise<void> {
    await this.page.goto(this.url('/login'));
    await expect(this.page.locator('input#email')).toBeVisible({ timeout: 10000 });
  }

  async fillEmail(email: string): Promise<void> {
    await this.page.locator('input#email').fill(email);
  }

  async fillPassword(password: string): Promise<void> {
    await this.page.locator('input#password').fill(password);
  }

  async submit(): Promise<void> {
    await this.page.locator('button[type="submit"]').click();
  }

  /**
   * Perform a full login sequence and wait for redirect to dashboard.
   */
  async loginAs(email: string, password: string): Promise<void> {
    await this.goto();
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.submit();
    // Wait for redirect away from login
    await this.page.waitForURL(new RegExp(`/${this.locale}/(dashboard|context-selector)`), { timeout: 15000 });
  }

  /** Assert that the login page shows a credential error */
  async expectLoginError(): Promise<void> {
    const error = this.page.locator('[data-testid="login-error"], .text-destructive, [role="alert"]').first();
    await expect(error).toBeVisible({ timeout: 8000 });
  }

  /** Assert the forgot-password link is visible */
  async expectForgotPasswordLink(): Promise<void> {
    await expect(this.page.getByRole('link', { name: /forgot/i })).toBeVisible();
  }

  /** Assert card title is visible (smoke check) */
  async expectCardTitle(): Promise<void> {
    await expect(this.page.locator('[data-slot="card-title"]')).toBeVisible();
  }
}
