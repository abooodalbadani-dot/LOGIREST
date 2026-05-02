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

export const KitchenRequestDetailSchema = z.object({
 id: z.string(),
 request_number: z.string(),
 department_id: z.string(),
 department_name: z.string().optional(),
 warehouse_id: z.string(),
 warehouse_name: z.string().optional(),
 status: z.enum(['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'FULFILLED', 'PARTIAL']),
 items: z.array(z.object({
 id: z.string(),
 item_id: z.string(),
 item_name: z.string(),
 uom: z.string(),
 quantity: z.number(),
 notes: z.string().optional(),
 fulfilled_quantity: z.number().optional(),
 })),
 notes: z.string().optional(),
 requested_by: z.string(),
 requested_at: z.string(),
 approved_by: z.string().optional(),
 approved_at: z.string().optional(),
 rejected_by: z.string().optional(),
 rejected_at: z.string().optional(),
 rejection_reason: z.string().optional(),
 fulfilled_by: z.string().optional(),
 fulfilled_at: z.string().optional(),
 created_at: z.string(),
 updated_at: z.string(),
});

export type KitchenRequestDetail = z.infer<typeof KitchenRequestDetailSchema>;
