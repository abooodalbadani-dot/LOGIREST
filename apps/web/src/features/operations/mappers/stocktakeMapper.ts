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
    createdAt: string;
    userName?: string | null;
    comment?: string | null;
  }>;
}

export function mapToItemVM(item: StocktakeItem): StocktakeItemVM {
  return {
    id: item.id,
    itemId: item.itemId,
    itemName: item.itemName,
    barcode: item.barcode,
    uom: item.uom,
    snapshotQty: item.snapshotQty,
    countedQty: item.countedQty,
    variance: item.variance,
    varianceReason: item.varianceReason,
    lotNumber: item.lotNumber,
    expiryDate: item.expiryDate,
    unitCost: item.unitCost,
  };
}

export function mapToSessionVM(session: StocktakeSession): StocktakeSessionVM {
  return {
    id: session.id,
    sessionNumber: session.sessionNumber,
    sessionName: session.sessionName,
    warehouseId: session.warehouseId,
    warehouseName: session.warehouseName,
    status: session.status,
    snapshotAt: session.snapshotAt,
    startedBy: session.startedBy,
    postedAt: session.postedAt,
    postedBy: session.postedBy,
    items: (session.items || []).map(mapToItemVM),
    version: session.version,
    description: session.description,
    approverComment: session.approverComment,
    approvedAt: session.approvedAt,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    auditLog: session.auditLog,
  };
}
