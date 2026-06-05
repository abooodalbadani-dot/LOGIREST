import { ZodSchema, z } from 'zod';
import type { ApiError } from '@/types/api';
import { ConflictError } from './ConflictError';
import { getTokenCookie, setTokenCookie, deleteTokenCookie } from './cookies';

type CamelCase<S extends string> = S extends `${infer T}_${infer U}`
  ? `${T}${Capitalize<CamelCase<U>>}`
  : S;

export type CamelCaseKeys<T> = T extends Date
  ? T
  : T extends Array<infer U>
  ? Array<CamelCaseKeys<U>>
  : T extends object
  ? { [K in keyof T as CamelCase<K & string>]: CamelCaseKeys<T[K]> }
  : T;

function toCamelCase(str: string): string {
  return str.replace(/_([a-z0-9])/g, (_, letter) => letter.toUpperCase());
}

export function normalizeKeysToCamelCase<T>(obj: T): CamelCaseKeys<T> {
  if (obj === null || obj === undefined) {
    return obj as CamelCaseKeys<T>;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => normalizeKeysToCamelCase(item)) as unknown as CamelCaseKeys<T>;
  }

  if (obj instanceof Date) {
    return obj as unknown as CamelCaseKeys<T>;
  }

  if (typeof obj === 'object') {
    const result = {} as Record<string, unknown>;
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      const camelKey = toCamelCase(key);
      result[camelKey] = normalizeKeysToCamelCase(value);
    }
    return result as unknown as CamelCaseKeys<T>;
  }

  return obj as unknown as CamelCaseKeys<T>;
}

const BASE = (typeof window === 'undefined' ? process.env.API_URL : null) ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

let refreshPromise: Promise<boolean> | null = null;

function dispatchExpiredEvent(): void {
  if (typeof window === 'undefined') return;
  deleteTokenCookie();
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
            const normalizedErr = normalizeKeysToCamelCase(e);
            throw new ConflictError({
              message: (normalizedErr.message as string) || 'Conflict detected',
              code: (normalizedErr.code as string) || 'VERSION_CONFLICT',
              currentVersion: normalizedErr.currentVersion as number,
              updatedBy: normalizedErr.updatedBy as string,
              updatedAt: normalizedErr.updatedAt as string,
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
      const normalizedMock = normalizeKeysToCamelCase(mockData);
      return schema.parse(normalizedMock);
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
            const user = normalizeKeysToCamelCase(payload.user);

            if (user && Array.isArray(user.scopes) && user.scopes.length > 0) {
              const validScope = user.scopes.find((s: { branchId?: string; warehouseId?: string; departmentId?: string | null }) => s.branchId && s.warehouseId);
              const targetScope = validScope || user.scopes[0];
              if (targetScope) {
                const newScope = {
                  branchId: targetScope.branchId || '',
                  warehouseId: targetScope.warehouseId || '',
                  departmentId: targetScope.departmentId || null
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
          const isPublicPage = ['/login', '/forgot-password', '/reset-password'].some(
            p => typeof window !== 'undefined' && window.location.pathname.includes(p)
          );
          if (!isPublicPage) {
            // Redirect the user to a fallback login or Select Branch UI by dispatching auth:expired
            window.dispatchEvent(new CustomEvent('auth:expired'));
          }
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
        fieldErrors: null
      };
      throw err;
    }

    if (res.status === 409) {
      const data = await res.json().catch(() => ({}));
      const normalizedData = normalizeKeysToCamelCase(data);
      throw new ConflictError({
        message: normalizedData.message || 'Conflict detected',
        code: normalizedData.code || 'VERSION_CONFLICT',
        currentVersion: normalizedData.currentVersion,
        updatedBy: normalizedData.updatedBy,
        updatedAt: normalizedData.updatedAt,
      });
    }

    if (!res.ok) {
      const err = await res.json().catch(() => {
        console.error(`[API Error] Failed to parse error response for ${path}`);
        return { code: 'NETWORK_ERROR', message: 'errors.network', fieldErrors: null };
      });
      const normalizedErr = normalizeKeysToCamelCase(err) as ApiError;
      console.error(`[API Error] ${method} ${path}`, normalizedErr);
      throw normalizedErr;
    }

    const data = await res.json();
    try {
      const normalizedData = normalizeKeysToCamelCase(data);
      return schema.parse(normalizedData);
    } catch (parseError: unknown) {
      if (parseError instanceof z.ZodError) {
        console.error(`[Zod Parsing Error] Failed to parse response for ${method} ${path}`, {
          error: parseError.issues,
          payload: data
        });
        throw new Error(`Data validation failed for ${path}: ${parseError.issues[0]?.message || 'Invalid response format'}`);
      }
      throw parseError;
    }
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
