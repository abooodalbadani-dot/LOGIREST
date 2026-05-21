import { IssueStatus } from '@logirest/shared-types';


export interface IssueLot {
  lot_number: string;
  expiry_date: string;
  allocated_qty: number;
  is_expired?: boolean;
}

export interface IssueLineItem {
  id?: string;
  item_id: string;
  requested_qty: number;
  qty: number; // Represents allocated quantity in frontend context
  issued_qty?: number;
  lot_allocations: IssueLot[]; // FEFO-allocated lots
  notes?: string;
}

export interface Issue {
  id: string;
  document_number: string;
  warehouse_id: string;
  destination_dept_id: string;
  requested_by: string;
  status: IssueStatus;
  lines: IssueLineItem[];
  notes?: string;
  created_at: string;
  updated_at: string;
  posted_at?: string;
  posted_by?: string;
}

export interface CreateIssueDTO {
  warehouse_id: string;
  destination_dept_id: string;
  lines: (Omit<IssueLineItem, 'id' | 'lot_allocations' | 'qty' | 'issued_qty'> & {
    lot_allocations: { lot_number: string; allocated_qty: number }[];
  })[];
  notes?: string;
}
