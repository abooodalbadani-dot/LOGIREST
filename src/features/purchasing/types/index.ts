export type PRStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'CONVERTED_TO_PO';

export interface PurchaseRequestLineItem {
  id?: string;
  itemId: string;
  itemName: string;
  quantity: number;
  estimatedUnitCost: number;
  notes?: string;
}

export interface PurchaseRequest {
  id: string;
  prNumber: string;
  branchId: string;
  requestedBy: string;
  expectedDate: string;
  status: PRStatus;
  items: PurchaseRequestLineItem[];
  totalAmount: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePurchaseRequestDTO {
  branchId: string;
  expectedDate: string;
  items: PurchaseRequestLineItem[];
  notes?: string;
}

export type POStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'PARTIAL_RECEIPT' | 'FULFILLED' | 'CANCELLED';

export interface PurchaseOrderLineItem {
  id?: string;
  itemId: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  notes?: string;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  prId?: string;
  supplierId: string;
  supplierCurrency: string;
  exchangeRate: number;
  expectedDate: string;
  status: POStatus;
  items: PurchaseOrderLineItem[];
  supplierTotalAmount: number;
  baseTotalAmount: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface CreatePurchaseOrderDTO {
  prId?: string;
  supplierId: string;
  supplierCurrency: string;
  exchangeRate: number;
  expectedDate: string;
  items: PurchaseOrderLineItem[];
  notes?: string;
}

export type GRNStatus = 'DRAFT' | 'RECEIVED' | 'POSTED' | 'CANCELLED';

export interface GoodsReceiptLineItem {
  id?: string;
  poLineItemId: string; // the linked PO line item
  itemId: string;
  orderedQuantity: number;
  receivedQuantity: number;
  lotNumber: string;
  expiryDate: string;
  notes?: string;
}

export interface GoodsReceipt {
  id: string;
  grnNumber: string;
  poId: string; // mandatory reference to the PO
  warehouseId: string; // the target warehouse receiving goods
  supplierId: string; // from PO
  status: GRNStatus;
  items: GoodsReceiptLineItem[];
  
  // Stored execution details
  supplierCurrency: string;
  // This rate is verified + locked at 'POSTED' stage
  lockedExchangeRate?: number; 
  baseTotalAmount?: number;
  
  notes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  postedAt?: string;
  postedBy?: string;
}

export interface CreateGoodsReceiptDTO {
  poId: string;
  warehouseId: string;
  supplierId: string;
  items: Omit<GoodsReceiptLineItem, 'id'>[];
  notes?: string;
}
