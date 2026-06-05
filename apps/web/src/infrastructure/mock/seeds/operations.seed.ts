import { MockFactory } from '../mock-factory';
import { ISSUE_STATUS, STOCKTAKE_STATUS } from '@logirest/shared-types';
import { StockIssue, Transfer, Adjustment } from '@/types/documents';
import { StocktakeSession } from '@/features/operations/types/stocktake';
import { KitchenRequestDetail } from '@/features/operations/types/kitchen-request';

export const initialIssues: StockIssue[] = [
  MockFactory.createIssue({ id: 'iss-1', documentNumber: 'ISS-2026-001', status: ISSUE_STATUS.DRAFT, destinationDeptId: 'dep-1', requestedBy: 'Barakat Amin' }),
  MockFactory.createIssue({ id: 'iss-2', documentNumber: 'ISS-2026-002', status: ISSUE_STATUS.POSTED, destinationDeptId: 'dep-2', requestedBy: 'Sara Hassan', postedAt: '2026-04-17T11:00:00Z', postedBy: 'user-2' }),
  MockFactory.createIssue({ id: 'iss-3', documentNumber: 'ISS-2026-003', status: ISSUE_STATUS.DRAFT, destinationDeptId: 'dep-1', requestedBy: 'Khalid Nasser', notes: 'Urgent' })
];

export const initialStocktakeSessions: StocktakeSession[] = [
  MockFactory.createStocktakeSession({
    id: 'stk-001', 
    sessionNumber: 'ST-2026-001', 
    sessionName: 'Monthly Kitchen Audit',
    warehouseId: 'wh-2', 
    status: STOCKTAKE_STATUS.DRAFT, 
    snapshotAt: '2026-04-20T08:00:00Z', 
    createdAt: '2026-04-20T08:00:00Z',
    updatedAt: '2026-04-20T08:00:00Z',
    items: [
      { id: 'cnt-1', itemId: 'item-1', itemName: 'Beef', uom: 'KG', snapshotQty: 150, countedQty: null, variance: null, varianceReason: null, unitCost: 45.0 },
      { id: 'cnt-2', itemId: 'item-2', itemName: 'Chicken', uom: 'CTN', snapshotQty: 80, countedQty: null, variance: null, varianceReason: null, unitCost: 18.0 }
    ]
  }),
  MockFactory.createStocktakeSession({
    id: 'stk-002', 
    sessionNumber: 'ST-2026-002', 
    sessionName: 'Yearly Warehouse Scan',
    warehouseId: 'wh-1', 
    status: STOCKTAKE_STATUS.POSTED, 
    snapshotAt: '2026-04-10T09:00:00Z', 
    createdAt: '2026-04-10T09:00:00Z',
    updatedAt: '2026-04-10T09:00:00Z',
    startedBy: 'user-2', 
    postedAt: '2026-04-10T17:00:00Z', 
    postedBy: 'user-2'
  })
];

export const initialTransfers: Transfer[] = [];
export const initialAdjustments: Adjustment[] = [];
export const initialKitchenRequests: KitchenRequestDetail[] = [];
