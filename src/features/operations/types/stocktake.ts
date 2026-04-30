export type StocktakeStatus =
  | 'DRAFT'
  | 'STARTED'
  | 'COUNTING_COMPLETED'
  | 'VarianceSubmitted'
  | 'APPROVED'
  | 'REJECTED'
  | 'POSTED';

/**
 * Safely normalizes incoming status strings from legacy or external sources.
 * 'VARIANCE' -> 'VarianceSubmitted'
 * 'COUNTING' -> 'STARTED'
 */
export function normalizeStocktakeStatus(status: string): StocktakeStatus {
  if (status === 'VARIANCE') return 'VarianceSubmitted';
  if (status === 'COUNTING') return 'STARTED';
  return status as StocktakeStatus;
}

export interface StocktakeItem {
  id: string;
  itemId: string;
  itemName: string;
  barcode?: string;
  uom: string;
  snapshotQty: number;       // System qty at lock time (hidden during COUNTING)
  countedQty?: number;       // Entered by WH keeper
  variance?: number;         // countedQty - snapshotQty (computed)
  varianceReason?: string;   // Required when variance !== 0
  lotNumber?: string;
  expiryDate?: string;
  unitCost: number;          // Added for financial impact calculation
}

export interface Stocktake {
  id: string;
  sessionName: string;
  warehouseId: string;
  warehouseName?: string;    // Added for UI display
  status: StocktakeStatus;
  items: StocktakeItem[];
  description?: string;
  approverComment?: string;
  approvedBy?: string;
  approvedAt?: string;
  postedBy?: string;
  postedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateStocktakeDTO {
  sessionName: string;
  warehouseId: string;
  description?: string;
}

export interface SubmitCountDTO {
  stocktakeId: string;
  counts: { itemId: string; countedQty: number; varianceReason?: string }[];
}
