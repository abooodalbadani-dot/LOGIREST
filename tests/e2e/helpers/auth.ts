import { Page } from '@playwright/test';

export interface AuthSession {
  token: string;
  userId: string;
  name: string;
  email: string;
  role: string;
  warehouseId: string | null;
}

export function generateMockJWT(
  role: string,
  userId: string,
  email: string,
  warehouseId: string | null = 'warehouse-a',
): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      role,
      userId,
      email,
      sub: userId,
      user: {
        id: userId,
        name: role === 'ADMIN' ? 'E2E Admin' : `E2E ${role}`,
        email,
        role,
        scopes: warehouseId
          ? [
              {
                branchId: 'BR-001',
                warehouseId,
                departmentId: null,
                warehouse: {
                  id: warehouseId,
                  name: 'Test Warehouse',
                  branch: {
                    id: 'BR-001',
                    name: 'Test Branch',
                  },
                },
              },
            ]
          : [],
      },
    })
  ).toString('base64url');
  return `${header}.${payload}.mock-signature`;
}

const DEFAULT_ADMIN_SESSION: AuthSession = {
  token: generateMockJWT('ADMIN', 'e2e-admin-user', 'admin@logirest-staging.com', 'warehouse-a'),
  userId: 'e2e-admin-user',
  name: 'E2E Admin',
  email: 'admin@logirest-staging.com',
  role: 'ADMIN',
  warehouseId: 'warehouse-a',
};

const DEFAULT_SCOPED_SESSION: AuthSession = {
  token: generateMockJWT('WH_KEEPER', 'e2e-scoped-user', 'scoped@logirest-staging.com', 'warehouse-a'),
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

  // Generate a valid mock JWT if the session token is a simple string mock
  if (!session.token.includes('.')) {
    session.token = generateMockJWT(session.role, session.userId, session.email, session.warehouseId);
  }

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

    if (url.includes('/admin/settings')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Credentials': 'true',
        },
        body: JSON.stringify({
          id: 'system_settings',
          systemName: 'LogiRest System',
          baseCurrency: 'SAR',
          branchId: 'BR-001',
          timezone: 'Asia/Riyadh',
          localeDefault: 'en',
          senderName: 'LogiRest System',
          replyToEmail: 'no-reply@logirest-staging.com',
          hasTransactions: false,
          mailProvider: 'smtp',
          smtpHost: 'smtp.mailtrap.io',
          smtpPort: 587,
          smtpUser: 'user',
          smtpPassword: 'password',
          smtpEncryption: 'tls',
          version: 1,
          updatedAt: new Date().toISOString(),
        }),
      });
    }

    if (url.includes('/settings/print')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Credentials': 'true',
        },
        body: JSON.stringify({
          defaultPaperSize: 'A4',
          thermalShowLogo: true,
          autoPrintOnFulfill: false,
        }),
      });
    }

    if (url.includes('/dashboard/stats')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Credentials': 'true',
        },
        body: JSON.stringify({
          currency: 'SAR',
          currencySymbol: 'SR',
          totalValue: 0,
          pendingFulfillment: 0,
          shortages: 0,
          warehouseCapacity: 0,
          pendingPrs: 0,
          activeStocktakes: 0,
          lowStockItems: 0,
          systemHealth: 100,
          activeUsers: 0,
          nearExpiryCount: 0,
          todayConsumption: 0,
          stockHealth: 100,
          activePos: 0,
          pendingGrns: 0,
          totalProcurementSpend: 0,
          recentRequests: [],
          activityLog: [],
          expiringLots: [],
          fulfillmentQueue: [],
          pendingApprovals: [],
          topVendors: [],
          efficiencyMetrics: {
            poConversionRate: 0,
            fulfillmentCycleDays: 0,
            throughputWeek: 0,
            conversionChart: [],
            velocityChart: [],
          },
          systemAuditLogs: [],
        }),
      });
    }

    if (url.includes('/operations/transfers/summary')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Credentials': 'true',
        },
        body: JSON.stringify({
          total: 0,
          inTransit: 0,
          overdueCount: 0,
        }),
      });
    }

    if (url.includes('/reports/available-inventory')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Credentials': 'true',
        },
        body: JSON.stringify({
          total: 0,
          page: 1,
          limit: 100,
          data: [],
        }),
      });
    }

    if (url.includes('/reports/count')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Credentials': 'true',
        },
        body: JSON.stringify({
          count: 2,
          limit: 50000,
          isExportable: true,
        }),
      });
    }

    if (url.includes('/reports/movements')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Credentials': 'true',
        },
        body: JSON.stringify({
          total: 0,
          page: 1,
          limit: 100,
          data: [],
        }),
      });
    }

    if (
      url.includes('/reports/expiry') ||
      url.includes('/reports/stocktake-variance') ||
      url.includes('/reports/procurement-status') ||
      url.includes('/reports/currency-summaries') ||
      url.includes('/reports/wac-history') ||
      url.includes('/reports/lot-trace')
    ) {
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

    if (url.includes('/warehouses/')) {
      const parts = url.split('/warehouses/');
      const warehouseId = parts[1]?.split('?')[0] || 'warehouse-a';
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Credentials': 'true',
        },
        body: JSON.stringify({
          id: warehouseId,
          branchId: 'BR-001',
          code: warehouseId === 'warehouse-b' ? 'WH-B' : 'WH-A',
          name: warehouseId === 'warehouse-b' ? 'Warehouse B' : 'Test Warehouse',
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
    try {
      localStorage.removeItem('logirest_token');
      localStorage.removeItem('logirest_user');
    } catch (e) {
      console.warn('Failed to clear localStorage, likely due to opaque origin:', e);
    }
    // Clear cookie
    try {
      document.cookie = 'logirest_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
    } catch (e) {
      console.warn('Failed to clear cookie:', e);
    }
  });
}

export function createMockCookieHeader(token: string): string {
  return `logirest_token=${token}`;
}

export { DEFAULT_ADMIN_SESSION, DEFAULT_SCOPED_SESSION };

