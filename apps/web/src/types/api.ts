import { z } from 'zod';

export interface PaginatedResponse<T> {
  data: T[];
  meta: { page: number; pageSize: number; total: number; totalPages: number; };
}

export interface ApiError {
  code: string;
  message: string;
  fieldErrors: Record<string, string[]> | null;
}

export const PaginationMetaSchema = z.object({
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  totalPages: z.number().int().nonnegative(),
});

export function paginatedSchema<T>(itemSchema: z.ZodType<T, z.ZodTypeDef, unknown>) {
  return z.object({
    data: z.array(itemSchema),
    meta: PaginationMetaSchema,
  });
}

export const successSchema = z.object({
  success: z.boolean().optional(),
  message: z.string().optional(),
});
