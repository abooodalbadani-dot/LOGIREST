import { ZodSchema } from 'zod';
import type { ApiError } from '@/types/api';
import { ConflictError } from './ConflictError';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

async function request<T>(method: string, path: string, schema: ZodSchema<T>, body?: unknown, signal?: AbortSignal): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('logirest_token') : null;
  const locale = typeof document !== 'undefined' ? document.documentElement.lang : 'ar';
  
  if (process.env.NEXT_PUBLIC_USE_MOCKS === 'true') {
    const { getMockResponse } = await import('./mocks/index');
    const mockData = await getMockResponse(method, path, body);
    if (mockData !== undefined) {
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

  try {
    const res = await fetch(`${BASE}${path}`, {
      method,
      signal,
      headers: {
        'Content-Type': 'application/json',
        'Accept-Language': locale,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    
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
      const err: ApiError = await res.json().catch(() => ({ code: 'NETWORK_ERROR', message: 'errors.network', field_errors: null }));
      throw err;
    }
    
    const data = await res.json();
    return schema.parse(data);
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      // Silent skip for aborted requests
      return new Promise(() => {}); 
    }
    throw error;
  }
}

export const apiClient = {
  get: <T>(path: string, schema: ZodSchema<T>, signal?: AbortSignal) => request<T>('GET', path, schema, undefined, signal),
  post: <T>(path: string, schema: ZodSchema<T>, body?: unknown, signal?: AbortSignal) => request<T>('POST', path, schema, body, signal),
  put: <T>(path: string, schema: ZodSchema<T>, body?: unknown, signal?: AbortSignal) => request<T>('PUT', path, schema, body, signal),
  del: <T>(path: string, schema: ZodSchema<T>, signal?: AbortSignal) => request<T>('DELETE', path, schema, undefined, signal),
};
