import { z } from 'zod';
import { ROLES, Role } from '../schemas/enums';

export const AllocationMethodEnum = z.enum(['VALUE', 'QUANTITY', 'WEIGHT', 'VOLUME']);
export type AllocationMethod = z.infer<typeof AllocationMethodEnum>;

export const LandedCostStatusEnum = z.enum(['DRAFT', 'PROCESSING', 'POSTED']);
export type LandedCostStatus = z.infer<typeof LandedCostStatusEnum>;

export const CreateLandedCostVoucherSchema = z.object({
  allocationMethod: AllocationMethodEnum,
  totalAllocatedCost: z.number().positive(),
  currencyId: z.string().uuid(),
  exchangeRate: z.number().positive().default(1.0),
  transactionDate: z.string().datetime(),
  grnIds: z.array(z.string().uuid()).min(1, 'At least one GRN is required'),
});

export type CreateLandedCostVoucher = z.infer<typeof CreateLandedCostVoucherSchema>;

export const UpdateLandedCostVoucherSchema = z.object({
  version: z.number().int().positive(),
  allocationMethod: AllocationMethodEnum.optional(),
  totalAllocatedCost: z.number().positive().optional(),
  grnIds: z.array(z.string().uuid()).min(1).optional(),
});

export type UpdateLandedCostVoucher = z.infer<typeof UpdateLandedCostVoucherSchema>;

export const PostLandedCostVoucherSchema = z.object({
  version: z.number().int().positive(),
});

export type PostLandedCostVoucher = z.infer<typeof PostLandedCostVoucherSchema>;

export const AssignUserRoleSchema = z.object({
  role: z.enum(ROLES as unknown as [Role, ...Role[]]),
});

export type AssignUserRole = z.infer<typeof AssignUserRoleSchema>;
