export type { UserRole, UserScope, AuthUser } from '@/providers/AuthProvider';
import { z } from 'zod';
export const AuthUserSchema = z.object({ id: z.string(), name: z.string(), email: z.string().email(), role: z.enum(['ADMIN','INV_MGR','WH_KEEPER','PROC_OFFICER','AUDITOR']), scopes: z.array(z.object({ branch_id: z.string().nullable(), warehouse_id: z.string().nullable(), department_id: z.string().nullable() })), locale: z.enum(['ar','en']) });
