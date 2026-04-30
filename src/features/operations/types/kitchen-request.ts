import { z } from 'zod';

export type KitchenRequestStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'FULFILLED'
  | 'PARTIAL';

export interface KitchenRequestItem {
  id: string;
  item_id: string;
  item_name: string;
  uom: string;
  quantity: number;
  notes?: string;
  fulfilled_quantity?: number;
}

export interface KitchenRequest {
  id: string;
  request_number: string;
  department_id: string;
  department_name?: string;
  warehouse_id: string;
  warehouse_name?: string;
  status: KitchenRequestStatus;
  items: KitchenRequestItem[];
  notes?: string;
  requested_by: string;
  requested_at: string;
  approved_by?: string;
  approved_at?: string;
  rejected_by?: string;
  rejected_at?: string;
  rejection_reason?: string;
  fulfilled_by?: string;
  fulfilled_at?: string;
  created_at: string;
  updated_at: string;
}

export const KitchenRequestItemSchema = z.object({
  itemId: z.string().min(1, 'required'),
  quantity: z.number().positive('must_be_positive'),
  notes: z.string().optional(),
});

export const KitchenRequestSchema = z.object({
  departmentId: z.string().min(1, 'required'),
  warehouseId: z.string().min(1, 'required'),
  notes: z.string().optional(),
  items: z.array(KitchenRequestItemSchema).min(1, 'min_one_item'),
});

export type CreateKitchenRequestDTO = z.infer<typeof KitchenRequestSchema>;
