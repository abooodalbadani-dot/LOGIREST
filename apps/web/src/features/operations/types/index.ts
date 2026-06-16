import { IssueStatus } from '@logirest/shared-types';

export interface IssueLot {
 lotNumber: string;
 expiryDate: string;
 allocatedQty: number;
 isExpired?: boolean;
}

export interface IssueLineItem {
 id?: string;
 itemId: string;
 requestedQty: number;
 qty: number; // Represents allocated quantity in frontend context
 issuedQty?: number;
 lotAllocations: IssueLot[]; // FEFO-allocated lots
 notes?: string;
}

export interface Issue {
 id: string;
 documentNumber: string;
 warehouseId: string;
 destinationDeptId: string;
 requestedBy: string;
 status: IssueStatus;
 lines: IssueLineItem[];
 notes?: string;
 createdAt: string;
 updatedAt: string;
 postedAt?: string;
 postedBy?: string;
}

export interface CreateIssueDTO {
 warehouse_id: string;
 destination_dept_id: string;
 lines: (Omit<IssueLineItem, 'id' | 'lotAllocations' | 'qty' | 'issuedQty'> & {
  lot_allocations: { lot_number: string; allocated_qty: number }[];
 })[];
 notes?: string;
}
