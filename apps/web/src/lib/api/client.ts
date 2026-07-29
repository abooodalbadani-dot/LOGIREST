import { z } from 'zod';
import type { ApiError } from '@/types/api';
import { ConflictError } from './ConflictError';
import { getTokenCookie, setTokenCookie, deleteTokenCookie } from './cookies';
import { toast } from 'sonner';

const INFRASTRUCTURE_ERRORS = {
  unauthorized: {
    en: 'Session expired. Please log in again.',
    ar: 'انتهت صلاحية الجلسة. يرجى تسجيل الدخول مرة أخرى.'
  },
  forbidden: {
    en: 'Access denied. You do not have the required permissions.',
    ar: 'تم رفض الوصول. لا تملك الصلاحيات الكافية.'
  },
  server: {
    en: 'An unexpected server error occurred. Please try again later.',
    ar: 'حدث خطأ غير متوقع في الخادم. يرجى المحاولة لاحقاً.'
  },
  network: {
    en: 'Network connection failure. Please check your internet.',
    ar: 'فشل الاتصال بالشبكة. يرجى التحقق من اتصالك بالإنترنت.'
  }
};

function translateApiErrorMessage(message: string, lang: string): string {
  if (!message || typeof message !== 'string') return message;

  const isAr = lang === 'ar';

  // 1. FX Rate Error: "No active FX rate found for YER to CNY"
  const fxRateRegex = /No active FX rate found for (\w+) to (\w+)/i;
  const fxMatch = message.match(fxRateRegex);
  if (fxMatch) {
    const [, fromCurrency, toCurrency] = fxMatch;
    return isAr
      ? `لم يتم العثور على سعر صرف نشط للتحويل من ${fromCurrency} إلى ${toCurrency}. يرجى تهيئة أسعار الصرف أولاً في إعدادات العملات.`
      : `No active exchange rate found from ${fromCurrency} to ${toCurrency}. Please configure the exchange rate in currency settings.`;
  }

  // 2. PO status: "Cannot create a GRN against a Purchase Order that is not APPROVED. (Current status: ...)"
  const poStatusRegex = /Cannot create a GRN against a Purchase Order that is not APPROVED\.\s*\(Current status:\s*(\w+)\)/i;
  const poMatch = message.match(poStatusRegex);
  if (poMatch) {
    const [, status] = poMatch;
    return isAr
      ? `لا يمكن إنشاء إشعار استلام بضائع (GRN) لأمر شراء غير معتمد. (الحالة الحالية: ${status})`
      : `Cannot create a Goods Received Note (GRN) against a Purchase Order that is not APPROVED. (Current status: ${status})`;
  }

  // 3. Lot number duplication: "Lot number ... is already registered to another item."
  const lotNumberRegex = /Lot number ([\w-]+) is already registered to another item\./i;
  const lotMatch = message.match(lotNumberRegex);
  if (lotMatch) {
    const [, lotNum] = lotMatch;
    return isAr
      ? `رقم الدفعة (${lotNum}) مسجل بالفعل لصنف آخر.`
      : `Lot number (${lotNum}) is already registered to another item.`;
  }

  // 4. Concurrency conflict: "Concurrency conflict: The document was modified by another user."
  if (message.includes('Concurrency conflict: The document was modified by another user')) {
    return isAr
      ? 'حدث تعارض: تم تعديل هذا المستند بواسطة مستخدم آخر. يرجى تحديث الصفحة وإعادة المحاولة.'
      : 'Concurrency conflict: This document was modified by another user. Please refresh and try again.';
  }

  // 5. Database connectivity / server errors stubs
  if (message.includes('Database connection lost') || message.includes('Database connection')) {
    return isAr
      ? 'فقد الاتصال بقاعدة البيانات. يرجى التحقق من الخادم والمحاولة مرة أخرى.'
      : 'Database connection lost. Please verify server status and try again.';
  }

  // 6. Insufficient stock
  if (message.includes('INSUFFICIENT_STOCK')) {
    return isAr
      ? 'الرصيد غير كافٍ لإتمام هذه العملية.'
      : 'Insufficient stock available to complete this operation.';
  }

  return message;
}

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

export function sanitizePayload(obj: unknown): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizePayload);
  }

  if (obj instanceof Date) {
    return obj;
  }

  if (typeof obj === 'object') {
    if (
      (typeof FormData !== 'undefined' && obj instanceof FormData) ||
      (typeof Blob !== 'undefined' && obj instanceof Blob) ||
      (typeof File !== 'undefined' && obj instanceof File)
    ) {
      return obj;
    }
    const result = {} as Record<string, unknown>;
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (value === '') {
        result[key] = null;
      } else {
        result[key] = sanitizePayload(value);
      }
    }
    return result;
  }

  return obj;
}

const BASE = (typeof window === 'undefined' ? process.env.API_URL : null) ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

let refreshPromise: Promise<boolean> | null = null;

function dispatchExpiredEvent(): void {
  if (typeof window === 'undefined') return;
  deleteTokenCookie();
  window.dispatchEvent(new CustomEvent('auth:expired'));
}

export async function attemptRefresh(): Promise<boolean> {
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

function generateIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

interface NestValidationMessage {
  success: boolean;
  errors: { field: string; message: string }[];
}

function isNestValidationMessage(value: unknown): value is NestValidationMessage {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  if (typeof obj.success !== 'boolean') return false;
  const errors = obj.errors;
  if (!Array.isArray(errors)) return false;
  for (const err of errors) {
    if (!err || typeof err !== 'object') return false;
    const errObj = err as Record<string, unknown>;
    if (typeof errObj.field !== 'string' || typeof errObj.message !== 'string') {
      return false;
    }
  }
  return true;
}

async function request<T, D extends z.ZodTypeDef = z.ZodTypeDef, I = unknown>(method: string, path: string, schema: z.ZodType<T, D, I>, body?: unknown, options?: RequestOptions): Promise<T> {
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

  const csrfToken = getCookie('XSRF-TOKEN');

  const methodUpper = method.toUpperCase();
  const isGetRequest = methodUpper === 'GET';
  const isModifying = methodUpper === 'POST' || methodUpper === 'PUT' || methodUpper === 'PATCH';
  const hasIdempotencyKey = customHeaders && Object.keys(customHeaders).some(
    k => k.toLowerCase() === 'x-idempotency-key'
  );

  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;

  const headers: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    'Accept-Language': locale,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(csrfToken ? { 'X-XSRF-TOKEN': csrfToken } : {}),
    ...(isModifying && !hasIdempotencyKey ? { 'x-idempotency-key': generateIdempotencyKey() } : {}),
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
        if (scope.departmentId && !headers['x-department-id']) {
          headers['x-department-id'] = scope.departmentId;
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
      body: body
        ? (isFormData ? (body as BodyInit) : JSON.stringify(sanitizePayload(body)))
        : undefined,
    });

    if (res.status === 400 || res.status === 403) {
      const clonedRes = res.clone();
      const errData = await clonedRes.json().catch(() => ({}));
      const isMissingScope = errData.message && typeof errData.message === 'string' && (
        errData.message.includes('active scope headers') ||
        errData.message.includes('Scope not authorized') ||
        errData.message.includes('Warehouse ID is required')
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
                const isKitchenStaff = user.role === 'KITCHEN_CHIEF' || (user.role as string) === 'KITCHEN_MANAGER';
                const newScope = {
                  branchId: targetScope.branchId || '',
                  warehouseId: targetScope.warehouseId || '',
                  departmentId: isKitchenStaff ? (targetScope.departmentId || null) : null
                };
                if (newScope.branchId && newScope.warehouseId) {
                  localStorage.setItem('logirest_active_scope', JSON.stringify(newScope));
                  resolved = true;

                  // Notify AuthProvider to update its React state
                  window.dispatchEvent(new CustomEvent('auth:scope-resolved', { detail: newScope }));

                  // Retry the request once
                  if (!options?.isRetry) {
                    return request<T, D, I>(method, path, schema, body, { ...options, isRetry: true });
                  }
                }
              }
            }
          } catch (e) {
            console.error('Failed to auto-resolve scope from token:', e);
          }
        }

        if (!resolved) {
          // The scope could not be auto-resolved from the JWT.
          // Do NOT dispatch auth:expired — the user IS authenticated; they simply
          // lack a valid scope for this resource. Throw a FORBIDDEN error so the
          // individual component can handle it (e.g. show an "Access Denied" state)
          // without triggering a global logout.
          const scopeError: import('@/types/api').ApiError = {
            code: 'FORBIDDEN',
            message: 'errors.forbidden',
            fieldErrors: null,
          };
          throw scopeError;
        }
      }
    }

    if (res.status === 401 || res.status === 403) {
      if (res.status === 401 && path !== '/auth/login' && path !== '/auth/refresh') {
        if (!options?.isRetry) {
          await handleAuthError();
          return request<T, D, I>(method, path, schema, body, { ...options, isRetry: true });
        }
      }

      const skipAutoToast = !!options?.skipAutoToast || isGetRequest;
      const lang = (typeof document !== 'undefined' ? document.documentElement.lang : 'ar') === 'en' ? 'en' : 'ar';
      let message = res.status === 401
        ? INFRASTRUCTURE_ERRORS.unauthorized[lang]
        : INFRASTRUCTURE_ERRORS.forbidden[lang];

      if (process.env.NODE_ENV === 'development') {
        message += ` [${method} ${path}]`;
      }

      if (typeof window !== 'undefined' && !skipAutoToast) {
        toast.error(message);
      }

      const err: ApiError & { _isToastShown?: boolean; skipAutoToast?: boolean } = {
        code: res.status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN',
        message: res.status === 401 ? 'errors.unauthorized' : 'errors.forbidden',
        fieldErrors: null,
        _isToastShown: !skipAutoToast,
        skipAutoToast
      };
      throw err;
    }

    if (res.status >= 500) {
      const skipAutoToast = !!options?.skipAutoToast || isGetRequest;
      const lang = (typeof document !== 'undefined' ? document.documentElement.lang : 'ar') === 'en' ? 'en' : 'ar';
      let message = INFRASTRUCTURE_ERRORS.server[lang];

      if (process.env.NODE_ENV === 'development') {
        message += ` [${method} ${path}]`;
      }

      if (typeof window !== 'undefined' && !skipAutoToast) {
        toast.error(message);
      }

      const err: ApiError & { _isToastShown?: boolean; skipAutoToast?: boolean } = {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'errors.generic',
        fieldErrors: null,
        _isToastShown: !skipAutoToast,
        skipAutoToast
      };
      throw err;
    }

    if (res.status === 409) {
      const data = await res.json().catch(() => ({}));
      const normalizedData = normalizeKeysToCamelCase(data);
      const isWarehouseLocked = typeof normalizedData.message === 'string' &&
        normalizedData.message.toLowerCase().includes('warehouse is locked');

      if (isWarehouseLocked && typeof window !== 'undefined') {
        const lang = (typeof document !== 'undefined' ? document.documentElement.lang : 'ar') === 'en' ? 'en' : 'ar';
        const toastMessage = lang === 'en'
          ? 'This operation is blocked while a physical inventory audit is in progress.'
          : 'لا يمكن إتمام هذه العملية لأن المستودع مقفل حالياً بسبب جلسة جرد نشطة. يرجى الانتظار حتى انتهاء الجرد.';
        toast.error(toastMessage);
      }

      const conflictErr = new ConflictError({
        message: normalizedData.message || 'Conflict detected',
        code: normalizedData.code || 'VERSION_CONFLICT',
        currentVersion: normalizedData.currentVersion,
        updatedBy: normalizedData.updatedBy,
        updatedAt: normalizedData.updatedAt,
      });
      conflictErr._isToastShown = true;
      throw conflictErr;
    }

    if (!res.ok) {
      const err = await res.json().catch(() => {
        console.error(`[API Error] Failed to parse error response for ${path}`);
        return { code: 'NETWORK_ERROR', message: 'errors.network', fieldErrors: null };
      });
      const normalizedErr = normalizeKeysToCamelCase(err) as ApiError & { _isToastShown?: boolean };
      
      const isWarehouseLocked = typeof normalizedErr.message === 'string' &&
        normalizedErr.message.toLowerCase().includes('warehouse is locked');

      if (isWarehouseLocked && typeof window !== 'undefined') {
        const lang = (typeof document !== 'undefined' ? document.documentElement.lang : 'ar') === 'en' ? 'en' : 'ar';
        const toastMessage = lang === 'en'
          ? 'This operation is blocked while a physical inventory audit is in progress.'
          : 'لا يمكن إتمام هذه العملية لأن المستودع مقفل حالياً بسبب جلسة جرد نشطة. يرجى الانتظار حتى انتهاء الجرد.';
        toast.error(toastMessage);
        normalizedErr._isToastShown = true;
      }

      const isItemFrozen = typeof normalizedErr.message === 'string' &&
        (normalizedErr.message.toLowerCase().includes('frozen/locked') ||
         normalizedErr.message.toLowerCase().includes('is frozen'));

      if (isItemFrozen && typeof window !== 'undefined') {
        const lang = (typeof document !== 'undefined' ? document.documentElement.lang : 'ar') === 'en' ? 'en' : 'ar';
        const match = normalizedErr.message.match(/Item "(.*?)" is frozen\/locked in warehouse "(.*?)"/i);
        let toastMessage = '';
        if (match && match[1] && match[2]) {
          const itemName = match[1];
          const whName = match[2];
          toastMessage = lang === 'en'
            ? `Operation blocked: Item "${itemName}" is frozen/locked in warehouse "${whName}". Please unfreeze the item or complete active inventory reconciliation.`
            : `تعذر إتمام العملية: الصنف "${itemName}" مجمّد/مقفل في مستودع "${whName}". يرجى إلغاء تجميد الصنف أو إنهاء الجرد المخزني القائم.`;
        } else {
          toastMessage = lang === 'en'
            ? `Operation blocked: ${normalizedErr.message}`
            : `تعذر إتمام العملية: ${normalizedErr.message}`;
        }
        toast.error(toastMessage, { duration: 6000 });
        normalizedErr._isToastShown = true;
      }
      
      if (isNestValidationMessage(normalizedErr)) {
        const fieldErrors: Record<string, string[]> = {};
        for (const error of normalizedErr.errors) {
          if (!fieldErrors[error.field]) {
            fieldErrors[error.field] = [];
          }
          fieldErrors[error.field].push(error.message);
        }
        normalizedErr.fieldErrors = fieldErrors;
        normalizedErr.message = normalizedErr.errors[0]?.message || 'errors.validation';
      } else {
        const msgObj = normalizedErr.message as unknown;
        if (Array.isArray(msgObj)) {
          normalizedErr.message = msgObj[0] || 'errors.unknown';
        } else if (isNestValidationMessage(msgObj)) {
          const fieldErrors: Record<string, string[]> = {};
          for (const error of msgObj.errors) {
            if (!fieldErrors[error.field]) {
              fieldErrors[error.field] = [];
            }
            fieldErrors[error.field].push(error.message);
          }
          normalizedErr.fieldErrors = fieldErrors;
          normalizedErr.message = msgObj.errors[0]?.message || 'errors.validation';
        }
      }

      // Translate raw API error messages into user-friendly localized text
      if (normalizedErr.message && typeof normalizedErr.message === 'string') {
        normalizedErr.message = translateApiErrorMessage(normalizedErr.message, locale);
      }
      
      console.error(`[API Error] ${method} ${path} Details: ` + JSON.stringify({
        code: normalizedErr.code,
        message: normalizedErr.message,
        fieldErrors: normalizedErr.fieldErrors,
        rawErrors: 'errors' in (normalizedErr as unknown as Record<string, unknown>) ? (normalizedErr as unknown as { errors: unknown }).errors : undefined
      }));
      throw normalizedErr;
    }

    // Handle 204 No Content or empty body gracefully — parse against schema with empty object
    if (res.status === 204) {
      return schema.parse({});
    }

    const contentLength = res.headers.get('content-length');
    const contentType = res.headers.get('content-type') ?? '';
    if (contentLength === '0' || !contentType.includes('application/json')) {
      // Non-JSON or empty response — try schema.parse({}) as a safe fallback
      return schema.parse({});
    }

    const data = await res.json();
    try {
      const normalizedData = normalizeKeysToCamelCase(data);
      return schema.parse(normalizedData);
    } catch (parseError: unknown) {
      if (parseError instanceof z.ZodError) {
        console.error("Zod Validation Failed on:", parseError.issues);
        console.error(`[Zod Parsing Error] Failed to parse response for ${method} ${path}`, {
          error: JSON.stringify(parseError.issues, null, 2),
          payload: JSON.stringify(data, null, 2)
        });
        throw new Error(`Data validation failed for ${path}: ${parseError.issues[0]?.message || 'Invalid response format'}`);
      }
      throw parseError;
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw error;
    }

    // Check for network connectivity failure
    const isNetworkError = error instanceof TypeError || (error instanceof Error && error.message.includes('fetch'));
    if (isNetworkError) {
      const skipAutoToast = !!options?.skipAutoToast || isGetRequest;
      const lang = (typeof document !== 'undefined' ? document.documentElement.lang : 'ar') === 'en' ? 'en' : 'ar';
      let message = INFRASTRUCTURE_ERRORS.network[lang];

      if (process.env.NODE_ENV === 'development') {
        message += ` [${method} ${path}]`;
      }

      if (typeof window !== 'undefined' && !skipAutoToast) {
        toast.error(message);
      }

      const networkErr: ApiError & { _isToastShown?: boolean; skipAutoToast?: boolean } = {
        code: 'NETWORK_ERROR',
        message: 'errors.network',
        fieldErrors: null,
        _isToastShown: !skipAutoToast,
        skipAutoToast
      };
      throw networkErr;
    }

    throw error;
  }
}

export interface RequestOptions {
  signal?: AbortSignal;
  headers?: Record<string, string>;
  isRetry?: boolean;
  skipAutoToast?: boolean;
}

export const apiClient = {
  get: <T, D extends z.ZodTypeDef = z.ZodTypeDef, I = unknown>(path: string, schema: z.ZodType<T, D, I>, options?: RequestOptions) => request<T, D, I>('GET', path, schema, undefined, options),
  post: <T, D extends z.ZodTypeDef = z.ZodTypeDef, I = unknown>(path: string, schema: z.ZodType<T, D, I>, body?: unknown, options?: RequestOptions) => request<T, D, I>('POST', path, schema, body, options),
  put: <T, D extends z.ZodTypeDef = z.ZodTypeDef, I = unknown>(path: string, schema: z.ZodType<T, D, I>, body?: unknown, options?: RequestOptions) => request<T, D, I>('PUT', path, schema, body, options),
  patch: <T, D extends z.ZodTypeDef = z.ZodTypeDef, I = unknown>(path: string, schema: z.ZodType<T, D, I>, body?: unknown, options?: RequestOptions) => request<T, D, I>('PATCH', path, schema, body, options),
  del: <T, D extends z.ZodTypeDef = z.ZodTypeDef, I = unknown>(path: string, schema: z.ZodType<T, D, I>, options?: RequestOptions) => request<T, D, I>('DELETE', path, schema, undefined, options),
};
