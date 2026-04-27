import { test as base, Page } from '@playwright/test';
/* eslint-disable react-hooks/rules-of-hooks */

// Declare the types of your fixtures.
type MyFixtures = {
  authenticatedPage: Page; // We would use Page here
};

// Extend base test by providing "authenticatedPage".
// This fixture would logically sign in and provide an authenticated context.
export const testAuth = base.extend<MyFixtures>({
  authenticatedPage: async ({ page }: { page: Page }, use: (r: Page) => Promise<void>) => {
    // In real scenario:
    // await page.goto('/ar/login');
    // await page.fill('input[name="email"]', 'admin@example.com');
    // await page.fill('input[name="password"]', 'password');
    // await page.click('button[type="submit"]');
    // await page.waitForURL('/ar/dashboard');

    // Currently we just mock local storage
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('logirest_token', 'mock_token');
      localStorage.setItem('logirest_user', JSON.stringify({
        id: '1', name: 'Test User', email: 'test@example.com', role: 'ADMIN', scopes: []
      }));
    });
    
    // Now go to a secure route to use the context
    await page.goto('/ar/dashboard');
    await use(page);

    // Clean up
    await page.evaluate(() => {
      localStorage.removeItem('logirest_token');
      localStorage.removeItem('logirest_user');
    });
  },
});

export { expect } from '@playwright/test';
