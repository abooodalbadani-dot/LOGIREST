import { z } from 'zod';

/**
 * POST /api/v1/auth/login
 */
export const LoginRequestSchema = z.object({
  email: z.string().email('Invalid email address format'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
});

export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const LoginResponseSchema = z.object({
  success: z.boolean(),
  accessToken: z.string(),
  user: z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    name: z.string(),
    role: z.enum([
      'ADMIN', 'GM', 'INV_MGR', 'WH_KEEPER', 'PROC_OFFICER',
      'APPROVER', 'AUDITOR', 'VIEWER', 'KITCHEN_CHIEF', 'STORE_MGR'
    ]),
  }),
});

export type LoginResponse = z.infer<typeof LoginResponseSchema>;

/**
 * POST /api/v1/auth/refresh
 */
export const RefreshResponseSchema = z.object({
  success: z.boolean(),
  accessToken: z.string(),
});

export type RefreshResponse = z.infer<typeof RefreshResponseSchema>;

/**
 * Required headers for warehouse/branch-scoped operations
 */
export const ScopeHeadersSchema = z.object({
  'x-warehouse-id': z.string().uuid('x-warehouse-id header must be a valid UUID'),
  'x-branch-id': z.string().uuid('x-branch-id header must be a valid UUID'),
});

export type ScopeHeaders = z.infer<typeof ScopeHeadersSchema>;

/**
 * GET /api/v1/auth/me
 */
export const MeResponseSchema = z.object({
  success: z.boolean(),
  user: z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    name: z.string(),
    role: z.enum([
      'ADMIN', 'GM', 'INV_MGR', 'WH_KEEPER', 'PROC_OFFICER',
      'APPROVER', 'AUDITOR', 'VIEWER', 'KITCHEN_CHIEF', 'STORE_MGR'
    ]),
    isActive: z.boolean(),
    authorizedWarehouses: z.array(z.string().uuid()),
  }),
});

export type MeResponse = z.infer<typeof MeResponseSchema>;
