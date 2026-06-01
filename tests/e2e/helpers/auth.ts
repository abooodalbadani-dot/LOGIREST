import { Page } from '@playwright/test';

export interface AuthSession {
  token: string;
  userId: string;
  name: string;
  email: string;
  role: string;
  warehouseId: string | null;
}

const DEFAULT_ADMIN_SESSION: AuthSession = {
  token: 'e2e-test-admin-token',
  userId: 'e2e-admin-user',
  name: 'E2E Admin',
  email: 'admin@logirest-staging.com',
  role: 'ADMIN',
  warehouseId: null,
};

const DEFAULT_SCOPED_SESSION: AuthSession = {
  token: 'e2e-test-scoped-token',
  userId: 'e2e-scoped-user',
  name: 'E2E Scoped User',
  email: 'scoped@logirest-staging.com',
  role: 'WH_KEEPER',
  warehouseId: 'warehouse-a',
};

export async function injectAuthSession(
  page: Page,
  session: AuthSession = DEFAULT_ADMIN_SESSION,
): Promise<void> {
  await page.goto('/');
  await page.evaluate((s) => {
    localStorage.setItem('logirest_token', s.token);
    localStorage.setItem('logirest_user', JSON.stringify({
      id: s.userId,
      name: s.name,
      email: s.email,
      role: s.role,
      scopes: s.warehouseId
        ? [{ warehouse_id: s.warehouseId, warehouse: { name: 'Test Warehouse' } }]
        : [],
    }));
  }, session);
}

export async function clearAuthSession(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.removeItem('logirest_token');
    localStorage.removeItem('logirest_user');
  });
}

export function createMockCookieHeader(token: string): string {
  return `logirest_token=${token}`;
}

export { DEFAULT_ADMIN_SESSION, DEFAULT_SCOPED_SESSION };
