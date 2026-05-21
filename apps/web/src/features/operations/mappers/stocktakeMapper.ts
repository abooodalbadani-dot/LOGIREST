import { StocktakeSession, StocktakeItem } from '../types/stocktake';
import { DocumentStatus } from '@logirest/shared-types';

export interface StocktakeItemVM {
  id: string;
  itemId: string;
  itemName: string;
  barcode?: string;
  uom: string;
  snapshotQty: number | null;
  countedQty: number | null;
  variance: number | null;
  varianceReason: string | null;
  lotNumber?: string;
  expiryDate?: string;
  unitCost: number;
}

export interface StocktakeSessionVM {
  id: string;
  sessionNumber: string;
  sessionName: string;
  warehouseId: string;
  warehouseName?: string;
  status: DocumentStatus;
  snapshotAt: string;
  startedBy: string;
  postedAt: string | null;
  postedBy: string | null;
  items: StocktakeItemVM[];
  version: number;
  description?: string;
  approverComment?: string;
  approvedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  auditLog?: Array<{
    status: string;
    created_at: string;
    user_name?: string | null;
    comment?: string | null;
  }>;
}

export function mapToItemVM(item: StocktakeItem): StocktakeItemVM {
  return {
    id: item.id,
    itemId: item.item_id,
    itemName: item.item_name,
    barcode: item.barcode,
    uom: item.uom,
    snapshotQty: item.snapshot_qty,
    countedQty: item.counted_qty,
    variance: item.variance,
    varianceReason: item.variance_reason,
    lotNumber: item.lot_number,
    expiryDate: item.expiry_date,
    unitCost: item.unit_cost,
  };
}

export function mapToSessionVM(session: StocktakeSession): StocktakeSessionVM {
  return {
    id: session.id,
    sessionNumber: session.session_number,
    sessionName: session.session_name,
    warehouseId: session.warehouse_id,
    warehouseName: session.warehouse_name,
    status: session.status,
    snapshotAt: session.snapshot_at,
    startedBy: session.started_by,
    postedAt: session.posted_at,
    postedBy: session.posted_by,
    items: (session.items || []).map(mapToItemVM),
    version: session.version,
    description: session.description,
    approverComment: session.approver_comment,
    approvedAt: session.approved_at,
    createdAt: session.created_at,
    updatedAt: session.updated_at,
    auditLog: session.audit_log,
  };
}
