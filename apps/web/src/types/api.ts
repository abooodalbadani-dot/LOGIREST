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

import { paginatedSchema as sharedPaginatedSchema } from '@logirest/shared-types';

export const paginatedSchema = sharedPaginatedSchema;
export const successSchema = z.object({
 success: z.boolean().optional(),
 message: z.string().optional(),
});
