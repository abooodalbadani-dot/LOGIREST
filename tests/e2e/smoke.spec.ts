import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
  await page.goto('/');
  // The app redirects to /ar/login or similar if not authenticated
  await expect(page).toHaveURL(/.*login/);
});

test('login page has basic elements', async ({ page }) => {
  await page.goto('/ar/login');
  // Check for the card title instead of h1
  await expect(page.locator('[data-slot="card-title"]')).toBeVisible();
  await expect(page.locator('input#email')).toBeVisible();
  await expect(page.locator('input#password')).toBeVisible();
  await expect(page.locator('button[type="submit"]')).toBeVisible();
});
