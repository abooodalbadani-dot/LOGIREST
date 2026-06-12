import { z } from 'zod';
import { ROLES, Role } from '../schemas/enums';

export const CreateUserSchema = z.object({
  name: z.string().min(3, 'name_min_length'),
  email: z.string().email('invalid_email'),
  role: z.enum(ROLES as unknown as [Role, ...Role[]]),
  status: z.enum(['ACTIVE', 'INACTIVE']),
  language: z.enum(['en', 'ar']),
  branchIds: z.array(z.string()),
  warehouseIds: z.array(z.string()),
  departmentIds: z.array(z.string()),
});

export type CreateUserInput = z.infer<typeof CreateUserSchema>;

export const UpdateUserSchema = z.object({
  name: z.string().min(3, 'name_min_length'),
  email: z.string().email('invalid_email'),
  role: z.enum(ROLES as unknown as [Role, ...Role[]]),
  status: z.enum(['ACTIVE', 'INACTIVE']),
  language: z.enum(['en', 'ar']),
  branchIds: z.array(z.string()),
  warehouseIds: z.array(z.string()),
  departmentIds: z.array(z.string()),
});

export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;
