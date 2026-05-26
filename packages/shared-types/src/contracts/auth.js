"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MeResponseSchema = exports.ScopeHeadersSchema = exports.RefreshResponseSchema = exports.LoginResponseSchema = exports.LoginRequestSchema = void 0;
const zod_1 = require("zod");
exports.LoginRequestSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email address format'),
    password: zod_1.z.string().min(8, 'Password must be at least 8 characters long'),
});
exports.LoginResponseSchema = zod_1.z.object({
    success: zod_1.z.boolean(),
    accessToken: zod_1.z.string(),
    user: zod_1.z.object({
        id: zod_1.z.string().uuid(),
        email: zod_1.z.string().email(),
        name: zod_1.z.string(),
        role: zod_1.z.enum([
            'ADMIN', 'GM', 'INV_MGR', 'WH_KEEPER', 'PROC_OFFICER',
            'APPROVER', 'AUDITOR', 'VIEWER', 'KITCHEN_CHIEF', 'STORE_MGR'
        ]),
    }),
});
exports.RefreshResponseSchema = zod_1.z.object({
    success: zod_1.z.boolean(),
    accessToken: zod_1.z.string(),
});
exports.ScopeHeadersSchema = zod_1.z.object({
    'x-warehouse-id': zod_1.z.string().uuid('x-warehouse-id header must be a valid UUID'),
    'x-branch-id': zod_1.z.string().uuid('x-branch-id header must be a valid UUID'),
});
exports.MeResponseSchema = zod_1.z.object({
    success: zod_1.z.boolean(),
    user: zod_1.z.object({
        id: zod_1.z.string().uuid(),
        email: zod_1.z.string().email(),
        name: zod_1.z.string(),
        role: zod_1.z.enum([
            'ADMIN', 'GM', 'INV_MGR', 'WH_KEEPER', 'PROC_OFFICER',
            'APPROVER', 'AUDITOR', 'VIEWER', 'KITCHEN_CHIEF', 'STORE_MGR'
        ]),
        isActive: zod_1.z.boolean(),
        authorizedWarehouses: zod_1.z.array(zod_1.z.string().uuid()),
    }),
});
//# sourceMappingURL=auth.js.map