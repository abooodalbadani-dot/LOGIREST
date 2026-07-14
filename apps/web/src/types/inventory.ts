import { z } from 'zod';

export const StockBalanceItemSchema = z.object({
  itemId: z.string(),
  itemCode: z.string(),
  itemName: z.string(),
  warehouseId: z.string(),
  warehouseName: z.string(),
  qtyOnHand: z.number(),
  qtyReserved: z.number(),
  qtyAvailable: z.number(),
  reorderPoint: z.number(),
  uomCode: z.string().optional(),
  wac: z.number().optional(),
  image: z.string().optional().nullable(),
});

export type StockBalanceItem = z.infer<typeof StockBalanceItemSchema>;

export const InventoryLotSchema = z.object({
 id: z.string(),
 itemId: z.string(),
 itemCode: z.string(),
 itemName: z.string(),
 lotNumber: z.string(),
 expiryDate: z.string().nullable(),
 qtyAvailable: z.number(),
 isExpired: z.boolean(),
 isNearExpiry: z.boolean(),
 status: z.string().optional(),
 uomCode: z.string().optional().nullable(),
 image: z.string().optional().nullable(),
});

export type InventoryLot = z.infer<typeof InventoryLotSchema>;

export const InventoryMovementSchema = z.object({
  id: z.string(),
  timestamp: z.string().or(z.date()).transform(val => new Date(val).toISOString()),
  itemId: z.string(),
  itemCode: z.string().optional().nullable(),
  itemName: z.string(),
  transactionType: z.string(),
  documentReference: z.string(),
  documentId: z.string().optional().nullable(),
  quantity: z.number(),
  balanceAfter: z.number(),
  performedByUserName: z.string().nullable().optional(),
});

export type InventoryMovement = z.infer<typeof InventoryMovementSchema>;
export const DashboardKPISchema = z.object({
 totalStockValue: z.number(),
 baseCurrency: z.string(),
 pendingPRs: z.number(),
 activeStocktakes: z.number(),
 lowStockItems: z.number(),
});
