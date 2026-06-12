export type { UserRole, UserScope, AuthUser } from '@/providers/AuthProvider';
import { z } from 'zod';

export const WarehouseDetailsSchema = z.object({
  id: z.string(),
  name: z.string(),
  branch: z.object({
    id: z.string(),
    name: z.string(),
  }).nullable().optional(),
}).nullable().optional();

export const UserScopeSchema = z.object({
 branchId: z.string().nullable(),
 warehouseId: z.string().nullable(),
 departmentId: z.string().nullable(),
 warehouse: WarehouseDetailsSchema,
 department: z.object({
   id: z.string(),
   name: z.string(),
 }).nullable().optional(),
 branch: z.object({
   id: z.string(),
   name: z.string(),
 }).nullable().optional(),
});

export const NotificationPreferencesSchema = z.object({
  lowStock: z.boolean().default(true),
  expiry: z.boolean().default(true),
  pendingApproval: z.boolean().default(true),
  poFinalized: z.boolean().default(false),
  security: z.boolean().default(true),
});

export const AuthUserSchema = z.object({ 
 id: z.string(), 
 name: z.string(), 
 email: z.string().email(), 
 role: z.enum(['ADMIN','GM','INV_MGR','WH_KEEPER','PROC_OFFICER','APPROVER','AUDITOR','VIEWER','KITCHEN_CHIEF','STORE_MGR','BRANCH_MGR','PROC_MGR']), 
 scopes: z.array(UserScopeSchema), 
 locale: z.enum(['ar','en']).optional(),
 status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
 language: z.enum(['ar', 'en']).default('en'),
 createdAt: z.string().optional(),
 avatarUrl: z.string().optional().nullable(),
 phone: z.string().optional().nullable(),
 notificationPreferences: NotificationPreferencesSchema.optional(),
});

export const ForgotPasswordSchema = z.object({
 email: z.string().email('Invalid email address'),
});

export const ResetPasswordSchema = z.object({
 token: z.string().min(1, 'Token is required'),
 password: z.string().min(8, 'Password must be at least 8 characters'),
 confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
 message: "Passwords don't match",
 path: ["confirmPassword"],
});

export const AuthSuccessResponseSchema = z.object({
 message: z.string(),
});

export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;
