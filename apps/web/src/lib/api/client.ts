import { ZodSchema } from 'zod';
import type { ApiError } from '@/types/api';
import { ConflictError } from './ConflictError';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

async function request<T>(method: string, path: string, schema: ZodSchema<T>, body?: unknown, options?: RequestOptions): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('logirest_token') : null;
  const locale = typeof document !== 'undefined' ? document.documentElement.lang : 'ar';
  const signal = options?.signal;
  const customHeaders = options?.headers;
  
  const useMocks = process.env.NEXT_PUBLIC_USE_MOCKS === 'true' || 
    (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_USE_MOCKS !== 'false');
  if (useMocks) {
    const { getMockResponse } = await import('@/infrastructure/mock/mock-api.adapter');
    const mockData = await getMockResponse(method, path, body);
    if (mockData !== undefined) {
      console.log(`[Mock API] ${method} ${path}`, mockData);
      // Detect mock error responses and throw them as API errors
      if (mockData && typeof mockData === 'object' && 'error' in mockData) {
        const errorObj = (mockData as { error: Record<string, unknown> }).error;
        // Handle mock 409 or version conflicts
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
        }
        throw errorObj;
      }
      return schema.parse(mockData);
    }
  }

  console.log(`[API Request] ${method} ${BASE}${path}`, { body });

  try {
    const res = await fetch(`${BASE}${path}`, {
      method,
      signal,
      headers: {
        'Content-Type': 'application/json',
        'Accept-Language': locale,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...customHeaders,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    
    console.log(`[API Response] ${method} ${path} - Status: ${res.status}`);
    
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
      // Re-throw so callers (like TanStack Query) know it was cancelled
      throw error; 
    }
    throw error;
  }
}

export interface RequestOptions {
  signal?: AbortSignal;
  headers?: Record<string, string>;
}

export const apiClient = {
  get: <T>(path: string, schema: ZodSchema<T>, options?: RequestOptions) => request<T>('GET', path, schema, undefined, options),
  post: <T>(path: string, schema: ZodSchema<T>, body?: unknown, options?: RequestOptions) => request<T>('POST', path, schema, body, options),
  put: <T>(path: string, schema: ZodSchema<T>, body?: unknown, options?: RequestOptions) => request<T>('PUT', path, schema, body, options),
  patch: <T>(path: string, schema: ZodSchema<T>, body?: unknown, options?: RequestOptions) => request<T>('PATCH', path, schema, body, options),
  del: <T>(path: string, schema: ZodSchema<T>, options?: RequestOptions) => request<T>('DELETE', path, schema, undefined, options),
};
