export type { UserRole, UserScope, AuthUser } from '@/providers/AuthProvider';
import { z } from 'zod';

export const UserScopeSchema = z.object({
 branch_id: z.string().nullable(),
 warehouse_id: z.string().nullable(),
 department_id: z.string().nullable(),
});

export const AuthUserSchema = z.object({ 
 id: z.string(), 
 name: z.string(), 
 email: z.string().email(), 
 role: z.enum(['ADMIN','GM','INV_MGR','WH_KEEPER','PROC_OFFICER','APPROVER','AUDITOR','VIEWER','KITCHEN_CHIEF','STORE_MGR']), 
 scopes: z.array(UserScopeSchema), 
 locale: z.enum(['ar','en']).optional(),
 status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
 language: z.enum(['ar', 'en']).default('en'),
 created_at: z.string().optional(),
 avatar_url: z.string().optional().nullable(),
 phone: z.string().optional().nullable(),
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
