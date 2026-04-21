import { purchasingMocks } from './purchasing';
import { operationsMocks } from './operations';
import { masterDataMocks } from './master-data';
import { inventoryMocks } from './inventory';
import { notificationsMocks } from './notifications';
import { adminMocks } from './admin';

type MockDb = Record<string, unknown>;
const db: MockDb = { ...purchasingMocks, ...operationsMocks, ...masterDataMocks, ...inventoryMocks, ...notificationsMocks, ...adminMocks };

export function getMockResponse(method: string, path: string): unknown {
  const key = `${method.toUpperCase()} ${path.split('?')[0]}`;
  return db[key];
}
