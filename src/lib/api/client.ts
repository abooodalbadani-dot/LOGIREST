import { ZodSchema } from 'zod';
import type { ApiError } from '@/types/api';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

async function request<T>(method: string, path: string, schema: ZodSchema<T>, body?: unknown): Promise<T> {
 const token = typeof window !== 'undefined' ? localStorage.getItem('logirest_token') : null;
 const locale = typeof document !== 'undefined' ? document.documentElement.lang : 'ar';
 
  if (process.env.NEXT_PUBLIC_USE_MOCKS === 'true') {
    const { getMockResponse } = await import('./mocks/index');
    const mockData = await getMockResponse(method, path, body);
    if (mockData !== undefined) {
      // Detect mock error responses and throw them as API errors
      if (mockData && typeof mockData === 'object' && 'error' in (mockData as any)) {
        throw (mockData as any).error;
      }
      return schema.parse(mockData);
    }
  }

 const res = await fetch(`${BASE}${path}`, {
 method,
 headers: {
 'Content-Type': 'application/json',
 'Accept-Language': locale,
 ...(token ? { Authorization: `Bearer ${token}` } : {}),
 },
 body: body ? JSON.stringify(body) : undefined,
 });
 
 if (!res.ok) {
 const err: ApiError = await res.json().catch(() => ({ code: 'NETWORK_ERROR', message: 'errors.network', field_errors: null }));
 throw err;
 }
 
 const data = await res.json();
 return schema.parse(data);
}

export const apiClient = {
 get: <T>(path: string, schema: ZodSchema<T>) => request<T>('GET', path, schema),
 post: <T>(path: string, schema: ZodSchema<T>, body?: unknown) => request<T>('POST', path, schema, body),
 put: <T>(path: string, schema: ZodSchema<T>, body?: unknown) => request<T>('PUT', path, schema, body),
 del: <T>(path: string, schema: ZodSchema<T>) => request<T>('DELETE', path, schema),
};
