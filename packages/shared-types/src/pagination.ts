import { z } from 'zod';

export const PaginationMetaSchema = z.object({
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  totalPages: z.number().int().nonnegative(),
});

export function paginatedSchema<T>(itemSchema: z.ZodSchema<T>) {
  return z.object({
    data: z.array(itemSchema),
    meta: PaginationMetaSchema,
  });
}

export type PaginationMeta = z.infer<typeof PaginationMetaSchema>;
