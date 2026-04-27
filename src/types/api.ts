import { z } from 'zod';

export interface PaginatedResponse<T> {
  data: T[];
  meta: { page: number; page_size: number; total: number; total_pages: number; };
}

export interface ApiError {
  code: string;
  message: string;
  field_errors: Record<string, string[]> | null;
}

export function paginatedSchema<T>(itemSchema: z.ZodSchema<T>) {
  return z.object({
    data: z.array(itemSchema),
    meta: z.object({ page: z.number(), page_size: z.number(), total: z.number(), total_pages: z.number() }),
  });
}
export const successSchema = z.object({
  success: z.boolean().optional(),
  message: z.string().optional(),
});
