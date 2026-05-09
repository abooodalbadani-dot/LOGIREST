import { getMockResponse as getAdapterResponse } from '@/infrastructure/mock/mock-api.adapter';
import { inventoryMocks } from './inventory';
import { notificationsMocks } from './notifications';
import { adminMocks } from './admin';
import { authMocks } from './auth';
import { reportsMocks } from './reports';

type MockDb = Record<string, unknown>;
const db: MockDb = { 
  ...inventoryMocks, 
  ...notificationsMocks, 
  ...adminMocks,
  ...authMocks,
  ...reportsMocks
};

export async function getMockResponse(method: string, path: string, body?: any): Promise<unknown> {
  // 1. Try new Repository-based Mock Adapter first
  const adapterResponse = await getAdapterResponse(method, path, body);
  if (adapterResponse !== undefined) return adapterResponse;

  // 2. Fallback to legacy static mocks
  const normalizedPath = path.split('?')[0];
  const key = `${method.toUpperCase()} ${normalizedPath}`;

  // Try exact match
  if (db[key]) {
    const mock = db[key];
    return typeof mock === 'function' ? mock(body, normalizedPath) : mock;
  }

  // Try pattern matching
  for (const dbKey in db) {
    if (dbKey.includes(':')) {
      const pattern = dbKey.replace(/:[a-zA-Z]+/g, '[^/]+');
      const regex = new RegExp(`^${pattern}$`);
      if (regex.test(key)) {
        const mock = db[dbKey];
        return typeof mock === 'function' ? mock(body, normalizedPath) : mock;
      }
    }
  }

  return undefined;
}
