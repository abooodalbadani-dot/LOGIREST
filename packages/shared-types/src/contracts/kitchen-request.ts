import { z } from 'zod';

export const UpdateKitchenRequestItemSchema = z.object({
  itemId: z.string(),
  quantityRequested: z.number().positive(),
  notes: z.string().optional().nullable(),
});

export const UpdateKitchenRequestDtoSchema = z.object({
  departmentId: z.string().optional(),
  warehouseId: z.string().optional(),
  version: z.number().int().nonnegative(),
  notes: z.string().optional().nullable(),
  items: z.array(UpdateKitchenRequestItemSchema).optional(),
});

export type UpdateKitchenRequestDto = z.infer<typeof UpdateKitchenRequestDtoSchema>;
