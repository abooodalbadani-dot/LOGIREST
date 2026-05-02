import { describe, it, expect } from 'vitest';
import { paginatedSchema } from '@/types/api';
import { z } from 'zod';

describe('paginatedSchema', () => {
 it('validates a valid paginated response', () => {
 const ItemSchema = z.object({ id: z.string(), name: z.string() });
 const result = paginatedSchema(ItemSchema).parse({
 data: [{ id: '1', name: 'Test' }],
 meta: { page: 1, page_size: 10, total: 1, total_pages: 1 }
 });
 expect(result.data).toHaveLength(1);
 expect(result.data[0].id).toBe('1');
 });

 it('rejects invalid paginated response', () => {
 const ItemSchema = z.object({ id: z.string() });
 expect(() => paginatedSchema(ItemSchema).parse({ data: 'invalid' })).toThrow();
 });
});