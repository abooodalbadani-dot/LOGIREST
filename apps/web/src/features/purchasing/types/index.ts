import { PRStatus, POStatus, GRNStatus } from '@logirest/shared-types';

export interface PurchaseRequestLineItem {
 id: string;
 item: {
   id: string;
   code: string;
   name_ar: string;
   name_en: string;
   primary_uom: {
     id: string;
     code: string;
   };
 };
 req_qty: number;
 uom_id: string;
}

export interface PurchaseRequest {
 id: string;
 document_number: string;
 status: PRStatus;
 department_id: string;
 expected_date: string;
 notes?: string | null;
 created_at?: string;
 created_by?: string;
 lines: PurchaseRequestLineItem[];
}

export interface CreatePurchaseRequestDTO {
 department_id: string;
 expected_date: string;
 lines: Array<{
   item_id: string;
   req_qty: number;
   uom_id: string;
 }>;
 notes?: string;
}



export interface PurchaseOrderLineItem {
 id: string;
 item: {
   id: string;
   code: string;
   name_ar: string;
   name_en: string;
   primary_uom: {
     id: string;
     code: string;
   };
 };
 quantity: number;
 unit_price: number;
 uom_id: string;
 notes?: string;
}

export interface PurchaseOrder {
 id: string;
 document_number: string;
 pr_id?: string;
 supplier_id: string;
 currency_code: string;
 exchange_rate: number;
 expected_date: string;
 status: POStatus;
 lines: PurchaseOrderLineItem[];
 supplier_total_amount: number;
 base_total_amount: number;
 notes?: string | null;
 created_at?: string;
 created_by?: string;
 updated_at?: string;
}

export interface CreatePurchaseOrderDTO {
 pr_id?: string;
 supplier_id: string;
 currency_code: string;
 exchange_rate: number;
 expected_date: string;
 lines: Array<{
   item_id: string;
   quantity: number;
   unit_price: number;
   uom_id: string;
   notes?: string;
 }>;
 notes?: string;
}



export interface GoodsReceiptLineItem {
 id?: string;
 poLineItemId: string;
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
 poId: string;
 warehouseId: string;
 supplierId: string;
 status: GRNStatus;
 items: GoodsReceiptLineItem[];
 
 supplierCurrency: string;
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