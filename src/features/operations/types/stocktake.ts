export type StocktakeStatus =
  | 'DRAFT'
  | 'STARTED'
  | 'COUNTING'
  | 'VARIANCE'
  | 'APPROVED'
  | 'POSTED';

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
}

export interface Stocktake {
  id: string;
  sessionName: string;
  warehouseId: string;
  status: StocktakeStatus;
  items: StocktakeItem[];
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
}

export interface SubmitCountDTO {
  stocktakeId: string;
  counts: { itemId: string; countedQty: number; varianceReason?: string }[];
}
