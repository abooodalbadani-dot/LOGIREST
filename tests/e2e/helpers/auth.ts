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
  warehouseId: 'warehouse-a',
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
  console.log(`[TEST MOCK TRACE] injectAuthSession called for user: ${session.email}`);

  // Mock the /auth/me API call to return the logged-in user details matching the session
  await page.route('**/api/v1/auth/me', (route) => {
    const method = route.request().method();
    const url = route.request().url();
    const origin = route.request().headers()['origin'] || 'http://localhost:3000';
    console.log(`[TEST MOCK /auth/me] Match: ${method} ${url} | Origin: ${origin}`);

    if (method === 'OPTIONS') {
      return route.fulfill({
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-branch-id, x-warehouse-id, x-xsrf-token, x-idempotency-key',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
        },
      });
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Credentials': 'true',
      },
      body: JSON.stringify({
        id: session.userId,
        name: session.name,
        email: session.email,
        role: session.role,
        scopes: session.warehouseId
          ? [
              {
                branchId: 'BR-001',
                warehouseId: session.warehouseId,
                departmentId: null,
                warehouse: {
                  id: session.warehouseId,
                  name: 'Test Warehouse',
                  branch: {
                    id: 'BR-001',
                    name: 'Test Branch',
                  },
                },
              },
            ]
          : [],
      }),
    });
  });

  // Catch-all API mock to prevent unmocked requests (e.g. notifications) from getting 401/403 and triggering redirects
  await page.route('**/api/**', async (route) => {
    const method = route.request().method();
    const url = route.request().url();
    const origin = route.request().headers()['origin'] || 'http://localhost:3000';
    console.log(`[TEST MOCK CATCH-ALL] Match: ${method} ${url} | Origin: ${origin}`);

    if (method === 'OPTIONS') {
      return route.fulfill({
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-branch-id, x-warehouse-id, x-xsrf-token, x-idempotency-key',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
        },
      });
    }

    if (url.includes('/auth/me')) {
      console.log(`[TEST MOCK CATCH-ALL] /auth/me detected in catch-all, falling back...`);
      return route.fallback();
    }

    if (url.includes('/auth/refresh')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Credentials': 'true',
        },
        body: JSON.stringify({
          success: true,
          accessToken: 'new-mock-token',
        }),
      });
    }

    if (url.includes('/lock')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Credentials': 'true',
        },
        body: JSON.stringify({
          isLocked: false,
          sessionId: null,
          sessionNumber: null,
          lockStartedAt: null,
        }),
      });
    }

    if (url.includes('/settings/currency')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Credentials': 'true',
        },
        body: JSON.stringify({
          baseCurrency: 'SAR',
          symbol: 'SR',
        }),
      });
    }

    if (url.includes('/notifications')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Credentials': 'true',
        },
        body: JSON.stringify([]),
      });
    }

    if (url.includes('/branches/BR-001')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Credentials': 'true',
        },
        body: JSON.stringify({
          id: 'BR-001',
          code: 'BR-001',
          name: 'Test Branch',
          isActive: true,
        }),
      });
    }

    if (url.includes('/branches')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Credentials': 'true',
        },
        body: JSON.stringify({
          data: [
            {
              id: 'BR-001',
              name: 'Test Branch',
              code: 'BR-001',
              isActive: true,
            },
          ],
          meta: {
            total: 1,
            page: 1,
            pageSize: 100,
            totalPages: 1,
          },
        }),
      });
    }

    if (url.includes('/warehouses/warehouse-a')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Credentials': 'true',
        },
        body: JSON.stringify({
          id: 'warehouse-a',
          branchId: 'BR-001',
          code: 'WH-A',
          name: 'Test Warehouse',
          isActive: true,
        }),
      });
    }

    if (url.includes('/warehouses')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Credentials': 'true',
        },
        body: JSON.stringify({
          data: [
            {
              id: 'warehouse-a',
              name: 'Test Warehouse',
              code: 'WH-A',
              branchId: 'BR-001',
              isActive: true,
            },
          ],
          meta: {
            total: 1,
            page: 1,
            pageSize: 100,
            totalPages: 1,
          },
        }),
      });
    }

    if (url.includes('/departments')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Credentials': 'true',
        },
        body: JSON.stringify({
          data: [
            {
              id: 'dept-1',
              branchId: 'BR-001',
              warehouseId: 'warehouse-a',
              code: 'DEPT-1',
              name: 'Test Department',
              isActive: true,
            },
          ],
          meta: {
            total: 1,
            page: 1,
            pageSize: 100,
            totalPages: 1,
          },
        }),
      });
    }

    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Credentials': 'true',
      },
      body: JSON.stringify({
        data: [],
        meta: { total: 0, page: 1, pageSize: 10, totalPages: 0 },
      }),
    });
  });

  // Inject cookies directly into the context before navigation
  await page.context().addCookies([
    {
      name: 'logirest_token',
      value: session.token,
      url: 'http://localhost:3000',
    },
  ]);

  // Inject localStorage keys via Init Script to guarantee they exist before React starts rendering
  await page.addInitScript((s: AuthSession) => {
    window.localStorage.setItem('logirest_token', s.token);
    window.localStorage.setItem('logirest_user', JSON.stringify({
      id: s.userId,
      name: s.name,
      email: s.email,
      role: s.role,
      scopes: s.warehouseId
        ? [{ warehouseId: s.warehouseId, warehouse: { name: 'Test Warehouse' } }]
        : [],
    }));
    window.localStorage.setItem('logirest_active_scope', JSON.stringify({
      branchId: 'BR-001',
      warehouseId: s.warehouseId || 'warehouse-a',
      departmentId: null
    }));
  }, session);
}

export async function clearAuthSession(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.removeItem('logirest_token');
    localStorage.removeItem('logirest_user');
    // Clear cookie
    document.cookie = 'logirest_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
  });
}

export function createMockCookieHeader(token: string): string {
  return `logirest_token=${token}`;
}

export { DEFAULT_ADMIN_SESSION, DEFAULT_SCOPED_SESSION };

