import { MockFactory } from '../mock-factory';
import { ISSUE_STATUS, STOCKTAKE_STATUS } from '@logirest/shared-types';
import { StockIssue, Transfer, Adjustment } from '@/types/documents';
import { StocktakeSession } from '@/features/operations/types/stocktake';
import { KitchenRequestDetail } from '@/features/operations/types/kitchen-request';

export const initialIssues: StockIssue[] = [
  MockFactory.createIssue({ id: 'iss-1', document_number: 'ISS-2026-001', status: ISSUE_STATUS.DRAFT, destination_dept_id: 'dep-1', requested_by: 'Barakat Amin' }),
  MockFactory.createIssue({ id: 'iss-2', document_number: 'ISS-2026-002', status: ISSUE_STATUS.POSTED, destination_dept_id: 'dep-2', requested_by: 'Sara Hassan', posted_at: '2026-04-17T11:00:00Z', posted_by: 'user-2' }),
  MockFactory.createIssue({ id: 'iss-3', document_number: 'ISS-2026-003', status: ISSUE_STATUS.DRAFT, destination_dept_id: 'dep-1', requested_by: 'Khalid Nasser', notes: 'Urgent' })
];

export const initialStocktakeSessions: StocktakeSession[] = [
  MockFactory.createStocktakeSession({
    id: 'stk-001', 
    session_number: 'ST-2026-001', 
    session_name: 'Monthly Kitchen Audit',
    warehouse_id: 'wh-2', 
    status: STOCKTAKE_STATUS.DRAFT, 
    snapshot_at: '2026-04-20T08:00:00Z', 
    created_at: '2026-04-20T08:00:00Z',
    updated_at: '2026-04-20T08:00:00Z',
    items: [
      { id: 'cnt-1', item_id: 'item-1', item_name: 'Beef', uom: 'KG', snapshot_qty: 150, counted_qty: null, variance: null, variance_reason: null, unit_cost: 45.0 },
      { id: 'cnt-2', item_id: 'item-2', item_name: 'Chicken', uom: 'CTN', snapshot_qty: 80, counted_qty: null, variance: null, variance_reason: null, unit_cost: 18.0 }
    ]
  }),
  MockFactory.createStocktakeSession({
    id: 'stk-002', 
    session_number: 'ST-2026-002', 
    session_name: 'Yearly Warehouse Scan',
    warehouse_id: 'wh-1', 
    status: STOCKTAKE_STATUS.POSTED, 
    snapshot_at: '2026-04-10T09:00:00Z', 
    created_at: '2026-04-10T09:00:00Z',
    updated_at: '2026-04-10T09:00:00Z',
    started_by: 'user-2', 
    posted_at: '2026-04-10T17:00:00Z', 
    posted_by: 'user-2'
  })
];

export const initialTransfers: Transfer[] = [];
export const initialAdjustments: Adjustment[] = [];
export const initialKitchenRequests: KitchenRequestDetail[] = [];
