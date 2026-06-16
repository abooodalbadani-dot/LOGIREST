import { z } from 'zod';
import { ALL_DOCUMENT_STATUSES, DocumentStatus } from '@/types/DocumentStatus';

export type KitchenRequestStatus = DocumentStatus;

export interface KitchenRequestItem {
 id: string;
 itemId: string;
 itemName: string;
 uom: string;
 quantity: number;
 notes?: string;
 fulfilledQuantity?: number;
}

export interface KitchenRequest {
 id: string;
 requestNumber: string;
 departmentId: string;
 departmentName?: string;
 warehouseId: string;
 warehouseName?: string;
 status: KitchenRequestStatus;
 items: KitchenRequestItem[];
 notes?: string;
 requestedBy: string;
 requestedAt: string;
 approvedBy?: string;
 approvedAt?: string;
 rejectedBy?: string;
 rejectedAt?: string;
 rejectionReason?: string;
 fulfilledBy?: string;
 fulfilledAt?: string;
 createdAt: string;
 updatedAt: string;
 version: number;
}

export const KitchenRequestItemSchema = z.object({
 itemId: z.string().min(1, 'required'),
 quantity: z.number().positive('must_be_positive'),
 notes: z.string().optional().or(z.literal('')),
});

export const KitchenRequestSchema = z.object({
 departmentId: z.string().min(1, 'required'),
 warehouseId: z.string().min(1, 'required'),
 notes: z.string().optional().or(z.literal('')),
 items: z.array(KitchenRequestItemSchema).min(1, 'min_one_item'),
});

export type CreateKitchenRequestDTO = z.infer<typeof KitchenRequestSchema>;

export const KitchenRequestDetailSchema = z.object({
 id: z.string(),
 requestNumber: z.string(),
 departmentId: z.string(),
 departmentName: z.string().optional(),
 warehouseId: z.string(),
 warehouseName: z.string().optional(),
 status: z.enum(ALL_DOCUMENT_STATUSES),
 items: z.array(z.object({
  id: z.string(),
  itemId: z.string(),
  itemName: z.string(),
  uom: z.string(),
  quantity: z.number(),
  notes: z.string().optional(),
  fulfilledQuantity: z.number().optional(),
 })),
 notes: z.string().optional(),
 requestedBy: z.string(),
 requestedAt: z.string(),
 approvedBy: z.string().optional(),
 approvedAt: z.string().optional(),
 rejectedBy: z.string().optional(),
 rejectedAt: z.string().optional(),
 rejectionReason: z.string().optional(),
 fulfilledBy: z.string().optional(),
 fulfilledAt: z.string().optional(),
 createdAt: z.string().default(() => new Date().toISOString()),
 updatedAt: z.string().default(() => new Date().toISOString()),
 version: z.number().default(1),
});

export type KitchenRequestDetail = z.infer<typeof KitchenRequestDetailSchema>;
