import { z } from 'zod';

export const UpdateKitchenRequestItemSchema = z.object({
  itemId: z.string(),
  quantityRequested: z.number().positive(),
});

export const UpdateKitchenRequestDtoSchema = z.object({
  departmentId: z.string().optional(),
  warehouseId: z.string().optional(),
  version: z.number().int().nonnegative(),
  items: z.array(UpdateKitchenRequestItemSchema).optional(),
});

export type UpdateKitchenRequestDto = z.infer<typeof UpdateKitchenRequestDtoSchema>;
