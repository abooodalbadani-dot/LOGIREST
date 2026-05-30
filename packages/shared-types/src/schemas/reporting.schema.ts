import { z } from 'zod';

export const InventoryBalanceQuerySchema = z.object({
  itemId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type InventoryBalanceQuery = z.infer<typeof InventoryBalanceQuerySchema>;

export const InventoryLotsQuerySchema = z.object({
  itemId: z.string().uuid().optional(),
  status: z.enum(['ACTIVE', 'HOLD', 'EXPIRED', 'QUARANTINE']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type InventoryLotsQuery = z.infer<typeof InventoryLotsQuerySchema>;

export const InventoryMovementsQuerySchema = z.object({
  itemId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export type InventoryMovementsQuery = z.infer<typeof InventoryMovementsQuerySchema>;

export const BarcodeScanQuerySchema = z.object({
  barcode: z.string().min(1, 'Barcode cannot be empty'),
});

export type BarcodeScanQuery = z.infer<typeof BarcodeScanQuerySchema>;

export const AuditLogsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  userId: z.string().uuid().optional(),
});

export type AuditLogsQuery = z.infer<typeof AuditLogsQuerySchema>;
