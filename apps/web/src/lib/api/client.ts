import { ZodSchema } from 'zod';
import type { ApiError } from '@/types/api';
import { ConflictError } from './ConflictError';
import { getTokenCookie, setTokenCookie } from './cookies';

const BASE = (typeof window === 'undefined' ? process.env.API_URL : null) ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

let refreshPromise: Promise<boolean> | null = null;

function dispatchExpiredEvent(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('auth:expired'));
}

async function attemptRefresh(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    try {
      const res = await fetch(`${BASE}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.success && data.accessToken) {
          setTokenCookie(data.accessToken);
          return true;
        }
      }
      return false;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  if (match) return decodeURIComponent(match[2]);
  return null;
}

async function request<T>(method: string, path: string, schema: ZodSchema<T>, body?: unknown, options?: RequestOptions): Promise<T> {
  const token = typeof window !== 'undefined' ? getTokenCookie() : null;
  const locale = typeof document !== 'undefined' ? document.documentElement.lang : 'ar';
  const signal = options?.signal;
  const customHeaders = options?.headers;

  async function handleAuthError(): Promise<void> {
    if (path === '/auth/login' || path === '/auth/refresh') return;
    const refreshed = await attemptRefresh();
    if (!refreshed) {
      dispatchExpiredEvent();
    }
  }

  const isAuthError = (e: Record<string, unknown>) =>
    e.status === 401 || e.code === 'UNAUTHORIZED' || e.code === 'SESSION_EXPIRED';

  const useMocks = process.env.NEXT_PUBLIC_USE_MOCKS === 'true' ||
    (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_USE_MOCKS !== 'false');
  if (useMocks) {
    const { getMockResponse } = await import('@/infrastructure/mock/mock-api.adapter');
    const mockData = await getMockResponse(method, path, body);
    if (mockData !== undefined) {
      if (mockData && typeof mockData === 'object' && 'error' in mockData) {
        const errorObj = (mockData as { error: Record<string, unknown> }).error;
        if (errorObj && typeof errorObj === 'object') {
          const e = errorObj as Record<string, unknown>;
          if (e.status === 409 || e.code === 'VERSION_CONFLICT') {
            throw new ConflictError({
              message: (e.message as string) || 'Conflict detected',
              code: (e.code as string) || 'VERSION_CONFLICT',
              currentVersion: e.current_version as number,
              updatedBy: e.updated_by as string,
              updatedAt: e.updated_at as string,
            });
          }
          if (isAuthError(e)) {
            await handleAuthError();
            if (path !== '/auth/login' && path !== '/auth/refresh') {
              return request(method, path, schema, body, options);
            }
          }
        }
        throw errorObj;
      }
      return schema.parse(mockData);
    }
  }

  const csrfToken = getCookie('XSRF-TOKEN');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept-Language': locale,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(csrfToken ? { 'X-XSRF-TOKEN': csrfToken } : {}),
    ...customHeaders,
  };

  // Auto-inject active scope headers if not already provided (client-side only)
  if (typeof window !== 'undefined') {
    try {
      const storedScope = localStorage.getItem('logirest_active_scope');
      if (storedScope) {
        const scope = JSON.parse(storedScope);
        if (scope.branchId && !headers['x-branch-id']) {
          headers['x-branch-id'] = scope.branchId;
        }
        if (scope.warehouseId && !headers['x-warehouse-id']) {
          headers['x-warehouse-id'] = scope.warehouseId;
        }
      }
    } catch (e) {
      console.error('Failed to parse active scope from localStorage:', e);
    }
  }

  try {
    const res = await fetch(`${BASE}${path}`, {
      method,
      signal,
      credentials: 'include',
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (res.status === 400 || res.status === 403) {
      const clonedRes = res.clone();
      const errData = await clonedRes.json().catch(() => ({}));
      const isMissingScope = errData.message && typeof errData.message === 'string' && (
        errData.message.includes('active scope headers') ||
        errData.message.includes('Scope not authorized')
      );

      if (isMissingScope && typeof window !== 'undefined') {
        localStorage.removeItem('logirest_active_scope');
        const storedToken = getTokenCookie();
        let resolved = false;

        if (storedToken) {
          try {
            const b64 = storedToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
            const payloadStr = decodeURIComponent(escape(atob(b64)));
            const payload = JSON.parse(payloadStr);
            const user = payload.user;

            if (user && Array.isArray(user.scopes) && user.scopes.length > 0) {
              const validScope = user.scopes.find((s: any) => s.branch_id && s.warehouse_id);
              const targetScope = validScope || user.scopes[0];
              if (targetScope) {
                const newScope = {
                  branchId: targetScope.branch_id || '',
                  warehouseId: targetScope.warehouse_id || '',
                  departmentId: targetScope.department_id || null
                };
                if (newScope.branchId && newScope.warehouseId) {
                  localStorage.setItem('logirest_active_scope', JSON.stringify(newScope));
                  resolved = true;

                  // Notify AuthProvider to update its React state
                  window.dispatchEvent(new CustomEvent('auth:scope-resolved', { detail: newScope }));

                  // Retry the request once
                  if (!options?.isRetry) {
                    return request(method, path, schema, body, { ...options, isRetry: true });
                  }
                }
              }
            }
          } catch (e) {
            console.error('Failed to auto-resolve scope from token:', e);
          }
        }

        if (!resolved) {
          // Redirect the user to a fallback login or Select Branch UI by dispatching auth:expired
          window.dispatchEvent(new CustomEvent('auth:expired'));
        }
      }
    }

    if (res.status === 401 || res.status === 403) {
      if (path !== '/auth/login' && path !== '/auth/refresh') {
        if (!options?.isRetry) {
          await handleAuthError();
          return request(method, path, schema, body, { ...options, isRetry: true });
        }
      }
      const err: ApiError = {
        code: res.status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN',
        message: res.status === 401 ? 'errors.unauthorized' : 'errors.forbidden',
        field_errors: null
      };
      throw err;
    }

    if (res.status === 409) {
      const data = await res.json().catch(() => ({}));
      throw new ConflictError({
        message: data.message || 'Conflict detected',
        code: data.code || 'VERSION_CONFLICT',
        currentVersion: data.current_version,
        updatedBy: data.updated_by,
        updatedAt: data.updated_at,
      });
    }

    if (!res.ok) {
      const err: ApiError = await res.json().catch(() => {
        console.error(`[API Error] Failed to parse error response for ${path}`);
        return { code: 'NETWORK_ERROR', message: 'errors.network', field_errors: null };
      });
      console.error(`[API Error] ${method} ${path}`, err);
      throw err;
    }

    const data = await res.json();
    return schema.parse(data);
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw error;
    }
    throw error;
  }
}

export interface RequestOptions {
  signal?: AbortSignal;
  headers?: Record<string, string>;
  isRetry?: boolean;
}

export const apiClient = {
  get: <T>(path: string, schema: ZodSchema<T>, options?: RequestOptions) => request<T>('GET', path, schema, undefined, options),
  post: <T>(path: string, schema: ZodSchema<T>, body?: unknown, options?: RequestOptions) => request<T>('POST', path, schema, body, options),
  put: <T>(path: string, schema: ZodSchema<T>, body?: unknown, options?: RequestOptions) => request<T>('PUT', path, schema, body, options),
  patch: <T>(path: string, schema: ZodSchema<T>, body?: unknown, options?: RequestOptions) => request<T>('PATCH', path, schema, body, options),
  del: <T>(path: string, schema: ZodSchema<T>, options?: RequestOptions) => request<T>('DELETE', path, schema, undefined, options),
};
