"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLogsQuerySchema = exports.BarcodeScanQuerySchema = exports.InventoryMovementsQuerySchema = exports.InventoryLotsQuerySchema = exports.InventoryBalanceQuerySchema = void 0;
const zod_1 = require("zod");
exports.InventoryBalanceQuerySchema = zod_1.z.object({
    itemId: zod_1.z.string().uuid().optional(),
    categoryId: zod_1.z.string().uuid().optional(),
    search: zod_1.z.string().optional(),
});
exports.InventoryLotsQuerySchema = zod_1.z.object({
    itemId: zod_1.z.string().uuid().optional(),
    status: zod_1.z.enum(['ACTIVE', 'HOLD', 'EXPIRED', 'QUARANTINE']).optional(),
});
exports.InventoryMovementsQuerySchema = zod_1.z.object({
    itemId: zod_1.z.string().uuid().optional(),
    page: zod_1.z.coerce.number().int().min(1).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(50),
    startDate: zod_1.z.string().datetime().optional(),
    endDate: zod_1.z.string().datetime().optional(),
});
exports.BarcodeScanQuerySchema = zod_1.z.object({
    barcode: zod_1.z.string().min(1, 'Barcode cannot be empty'),
});
exports.AuditLogsQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().min(1).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(50),
    userId: zod_1.z.string().uuid().optional(),
});
//# sourceMappingURL=reporting.schema.js.map