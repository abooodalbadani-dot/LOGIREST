/**
 * API Contracts: Authentication & Security Module
 * 
 * Target Prefix: /api/v1/auth
 */

import { z } from 'zod';

/**
 * 1. User Login Contract
 * Route: POST /api/v1/auth/login
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
 * 2. Token Refresh Contract
 * Route: POST /api/v1/auth/refresh
 * Request Header: Cookie containing `refresh_token`
 */
export const RefreshResponseSchema = z.object({
  success: z.boolean(),
  accessToken: z.string(),
});

export type RefreshResponse = z.infer<typeof RefreshResponseSchema>;

/**
 * 3. Secure Scope Headers (Global validation requirements)
 * Required for all warehouse/branch-scoped operation endpoints:
 */
export const ScopeHeadersSchema = z.object({
  'x-warehouse-id': z.string().uuid('x-warehouse-id header must be a valid UUID'),
  'x-branch-id': z.string().uuid('x-branch-id header must be a valid UUID'),
});

export type ScopeHeaders = z.infer<typeof ScopeHeadersSchema>;

/**
 * 4. Get Current User Profile
 * Route: GET /api/v1/auth/me
 * Headers: Authorization: Bearer <accessToken>
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
