import { z } from 'zod';
export declare const InventoryBalanceQuerySchema: z.ZodObject<{
    itemId: z.ZodOptional<z.ZodString>;
    categoryId: z.ZodOptional<z.ZodString>;
    search: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type InventoryBalanceQuery = z.infer<typeof InventoryBalanceQuerySchema>;
export declare const InventoryLotsQuerySchema: z.ZodObject<{
    itemId: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<{
        ACTIVE: "ACTIVE";
        HOLD: "HOLD";
        EXPIRED: "EXPIRED";
        QUARANTINE: "QUARANTINE";
    }>>;
}, z.core.$strip>;
export type InventoryLotsQuery = z.infer<typeof InventoryLotsQuerySchema>;
export declare const InventoryMovementsQuerySchema: z.ZodObject<{
    itemId: z.ZodOptional<z.ZodString>;
    page: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    limit: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    startDate: z.ZodOptional<z.ZodString>;
    endDate: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type InventoryMovementsQuery = z.infer<typeof InventoryMovementsQuerySchema>;
export declare const BarcodeScanQuerySchema: z.ZodObject<{
    barcode: z.ZodString;
}, z.core.$strip>;
export type BarcodeScanQuery = z.infer<typeof BarcodeScanQuerySchema>;
export declare const AuditLogsQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    limit: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    userId: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type AuditLogsQuery = z.infer<typeof AuditLogsQuerySchema>;
