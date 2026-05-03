import { purchasingMocks } from './purchasing';
import { operationsMocks } from './operations';
import { master_data_mocks } from './master-data';
import { inventoryMocks } from './inventory';
import { notificationsMocks } from './notifications';
import { adminMocks } from './admin';
import { authMocks } from './auth';
import { reportsMocks } from './reports';

type MockDb = Record<string, unknown>;
const db: MockDb = { 
 ...purchasingMocks, 
 ...operationsMocks, 
 ...master_data_mocks, 
 ...inventoryMocks, 
 ...notificationsMocks, 
 ...adminMocks,
 ...authMocks,
 ...reportsMocks
};

export function getMockResponse(method: string, path: string): unknown {
 const key = `${method.toUpperCase()} ${path.split('?')[0]}`;
 return db[key];
}
