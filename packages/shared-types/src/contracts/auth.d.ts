import { z } from 'zod';
export declare const LoginRequestSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, z.core.$strip>;
export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export declare const LoginResponseSchema: z.ZodObject<{
    success: z.ZodBoolean;
    accessToken: z.ZodString;
    user: z.ZodObject<{
        id: z.ZodString;
        email: z.ZodString;
        name: z.ZodString;
        role: z.ZodEnum<{
            ADMIN: "ADMIN";
            GM: "GM";
            INV_MGR: "INV_MGR";
            WH_KEEPER: "WH_KEEPER";
            PROC_OFFICER: "PROC_OFFICER";
            APPROVER: "APPROVER";
            AUDITOR: "AUDITOR";
            VIEWER: "VIEWER";
            KITCHEN_CHIEF: "KITCHEN_CHIEF";
            STORE_MGR: "STORE_MGR";
        }>;
    }, z.core.$strip>;
}, z.core.$strip>;
export type LoginResponse = z.infer<typeof LoginResponseSchema>;
export declare const RefreshResponseSchema: z.ZodObject<{
    success: z.ZodBoolean;
    accessToken: z.ZodString;
}, z.core.$strip>;
export type RefreshResponse = z.infer<typeof RefreshResponseSchema>;
export declare const ScopeHeadersSchema: z.ZodObject<{
    'x-warehouse-id': z.ZodString;
    'x-branch-id': z.ZodString;
}, z.core.$strip>;
export type ScopeHeaders = z.infer<typeof ScopeHeadersSchema>;
export declare const MeResponseSchema: z.ZodObject<{
    success: z.ZodBoolean;
    user: z.ZodObject<{
        id: z.ZodString;
        email: z.ZodString;
        name: z.ZodString;
        role: z.ZodEnum<{
            ADMIN: "ADMIN";
            GM: "GM";
            INV_MGR: "INV_MGR";
            WH_KEEPER: "WH_KEEPER";
            PROC_OFFICER: "PROC_OFFICER";
            APPROVER: "APPROVER";
            AUDITOR: "AUDITOR";
            VIEWER: "VIEWER";
            KITCHEN_CHIEF: "KITCHEN_CHIEF";
            STORE_MGR: "STORE_MGR";
        }>;
        isActive: z.ZodBoolean;
        authorizedWarehouses: z.ZodArray<z.ZodString>;
    }, z.core.$strip>;
}, z.core.$strip>;
export type MeResponse = z.infer<typeof MeResponseSchema>;
