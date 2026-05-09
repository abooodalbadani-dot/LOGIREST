import { z } from 'zod';

export const StockBalanceItemSchema = z.object({
 item_id: z.string(),
 item_code: z.string(),
 item_name_ar: z.string(),
 item_name_en: z.string(),
 warehouse_id: z.string(),
 warehouse_name_ar: z.string(),
 warehouse_name_en: z.string(),
 qty_on_hand: z.number(),
 qty_reserved: z.number(),
 qty_available: z.number(),
 reorder_point: z.number(),
});

export type StockBalanceItem = z.infer<typeof StockBalanceItemSchema>;

export const InventoryLotSchema = z.object({
 id: z.string(),
 item_id: z.string(),
 item_code: z.string(),
 item_name_ar: z.string(),
 item_name_en: z.string(),
 lot_number: z.string(),
 expiry_date: z.string().nullable(),
 qty_available: z.number(),
 is_expired: z.boolean(),
 is_near_expiry: z.boolean(),
});

export type InventoryLot = z.infer<typeof InventoryLotSchema>;

export const InventoryMovementSchema = z.object({
 id: z.string(),
 posted_at: z.string(),
 document_id: z.string(),
 document_number: z.string(),
 document_type: z.enum(['GRN', 'ISSUE', 'TRANSFER', 'ADJUSTMENT']),
 item_id: z.string(),
 item_code: z.string(),
 item_name_ar: z.string(),
 item_name_en: z.string(),
 lot_number: z.string().nullable(),
 direction: z.enum(['IN', 'OUT']),
 qty: z.number(),
});

export type InventoryMovement = z.infer<typeof InventoryMovementSchema>;
export const DashboardKPISchema = z.object({
 totalStockValue: z.number(),
 baseCurrency: z.string(),
 pendingPRs: z.number(),
 activeStocktakes: z.number(),
 lowStockItems: z.number(),
});
