'use client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSafeMutation } from '@/core/concurrency/useSafeMutation';
import { apiClient } from '@/lib/api/client';
import { z } from 'zod';
import { paginatedSchema, successSchema } from '@/types/api';
import { toast } from 'sonner';

const AllocationMethodEnum = z.enum(['VALUE', 'QUANTITY', 'WEIGHT', 'VOLUME']);

const LandedCostLineSchema = z.object({
 id: z.string(),
 landedCostVoucherId: z.string(),
 grnLineId: z.string(),
 allocatedCost: z.number(),
 adjustedUnitCost: z.number(),
});

const GRNSummarySchema = z.object({
 id: z.string(),
 grnNumber: z.string(),
});

const GRNRelationSchema = z.object({
 id: z.string(),
 grnId: z.string(),
 grn: GRNSummarySchema,
});

const CreatorSchema = z.object({
 id: z.string(),
 name: z.string(),
});

const LandedCostVoucherSchema = z.object({
 id: z.string(),
 voucherNumber: z.string(),
 allocationMethod: AllocationMethodEnum,
 totalAllocatedCost: z.number(),
 status: z.enum(['DRAFT', 'PROCESSING', 'POSTED']),
 currencyId: z.string(),
 exchangeRate: z.number(),
 transactionDate: z.string(),
 createdAt: z.string(),
 updatedAt: z.string(),
 version: z.number(),
 createdById: z.string(),
 lines: z.array(LandedCostLineSchema).optional(),
 grnRelations: z.array(GRNRelationSchema).optional(),
 createdBy: CreatorSchema.optional(),
});

export type LandedCostVoucher = z.infer<typeof LandedCostVoucherSchema>;

const LandedCostListSchema = z.object({
 data: z.array(LandedCostVoucherSchema),
 meta: z.object({
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  totalPages: z.number(),
 }),
});

const SingleVoucherResponseSchema = z.object({
 data: LandedCostVoucherSchema,
});

const CreateLandedCostPayloadSchema = z.object({
 allocationMethod: AllocationMethodEnum,
 totalAllocatedCost: z.number().positive(),
 currencyId: z.string().uuid(),
 exchangeRate: z.number().positive().default(1.0),
 transactionDate: z.string().datetime(),
 grnIds: z.array(z.string().uuid()).min(1),
});

export type CreateLandedCostPayload = z.infer<typeof CreateLandedCostPayloadSchema>;

const UpdateLandedCostPayloadSchema = z.object({
 version: z.number().int().positive(),
 allocationMethod: AllocationMethodEnum.optional(),
 totalAllocatedCost: z.number().positive().optional(),
 grnIds: z.array(z.string().uuid()).min(1).optional(),
});

export type UpdateLandedCostPayload = z.infer<typeof UpdateLandedCostPayloadSchema>;

export function useLandedCostVouchers(page = 1, limit = 10) {
 return useQuery({
  queryKey: ['landed-cost-vouchers', page, limit],
  queryFn: ({ signal }) =>
   apiClient.get(
    `/procurement/landed-cost?page=${page}&limit=${limit}`,
    LandedCostListSchema,
    { signal },
   ),
  staleTime: 30_000,
 });
}

export function useLandedCostVoucher(id: string | null) {
 return useQuery({
  queryKey: ['landed-cost-voucher', id],
  queryFn: ({ signal }) =>
   apiClient.get(`/procurement/landed-cost/${id}`, SingleVoucherResponseSchema, { signal }).then((r) => r.data),
  enabled: !!id && id !== 'new',
  staleTime: 60_000,
 });
}

export function useCreateLandedCost(options?: { onSuccess?: (data: LandedCostVoucher) => void }) {
 const queryClient = useQueryClient();

 return useSafeMutation({
  mutationFn: ({ payload, signal }: { payload: CreateLandedCostPayload; signal?: AbortSignal }) =>
   apiClient.post('/procurement/landed-cost', SingleVoucherResponseSchema, CreateLandedCostPayloadSchema.parse(payload), { signal }).then((r) => r.data),
  onSuccess: (data) => {
   queryClient.invalidateQueries({ queryKey: ['landed-cost-vouchers'] });
   if (options?.onSuccess) options.onSuccess(data);
  },
  onError: (error: unknown) => {
   const msg = error instanceof Error ? error.message : 'Failed to create voucher';
   toast.error(msg);
  },
 });
}

export function useUpdateLandedCost(options?: { onSuccess?: (data: LandedCostVoucher) => void }) {
 const queryClient = useQueryClient();

 return useSafeMutation({
  mutationFn: ({ id, payload, signal }: { id: string; payload: UpdateLandedCostPayload; signal?: AbortSignal }) =>
   apiClient.put(`/procurement/landed-cost/${id}`, SingleVoucherResponseSchema, UpdateLandedCostPayloadSchema.parse(payload), { signal }).then((r) => r.data),
  onSuccess: (data) => {
   queryClient.invalidateQueries({ queryKey: ['landed-cost-vouchers'] });
   queryClient.invalidateQueries({ queryKey: ['landed-cost-voucher', data.id] });
   if (options?.onSuccess) options.onSuccess(data);
  },
  onError: (error: unknown) => {
   const msg = error instanceof Error ? error.message : 'Failed to update voucher';
   toast.error(msg);
  },
 });
}

export function usePostLandedCost(options?: { onConflict?: () => void }) {
 const queryClient = useQueryClient();

 return useSafeMutation({
  onConflict: options?.onConflict,
  mutationFn: ({ signal, id, version }: { id: string; version: number; signal?: AbortSignal }) =>
   apiClient.post(`/procurement/landed-cost/${id}/post`, SingleVoucherResponseSchema, { version }, { signal }),
  onSuccess: (_, { id }) => {
   queryClient.invalidateQueries({ queryKey: ['landed-cost-vouchers'] });
   queryClient.invalidateQueries({ queryKey: ['landed-cost-voucher', id] });
   toast.success('Voucher posted successfully');
  },
  onError: (error: unknown) => {
   const msg = error instanceof Error ? error.message : 'Failed to post voucher';
   toast.error(msg);
  },
 });
}
