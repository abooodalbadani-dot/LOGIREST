import { purchasingMocks } from './purchasing';
import { operationsMocks } from './operations';
import { masterDataMocks } from './master-data';
import { inventoryMocks } from './inventory';

type MockDb = Record<string, unknown>;
const db: MockDb = { ...purchasingMocks, ...operationsMocks, ...masterDataMocks, ...inventoryMocks };

export function getMockResponse(method: string, path: string): unknown {
  const key = `${method.toUpperCase()} ${path.split('?')[0]}`;
  return db[key];
}
