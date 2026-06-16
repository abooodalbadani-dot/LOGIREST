'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSafeMutation, type AxiosLikeError } from '@/core/concurrency/useSafeMutation';
import { apiClient } from '@/lib/api/client';
import { paginatedSchema } from '@/types/api';
import { z } from 'zod';
import { toast } from 'sonner';
import { BadgeStatusSchema } from '@/components/shared/StatusBadge';
import { 
 KitchenRequestDetailSchema,
 CreateKitchenRequestDTO 
} from '../types/kitchen-request';


const UpdateKitchenRequestStatusInputSchema = z.object({
 id: z.string().min(1, { message: 'ID required' }),
 status: z.enum(['SUBMITTED', 'CANCELLED'], {
  errorMap: () => ({ message: 'إجراء غير صالح لهذه الوثيقة / Invalid action for this document' })
 }),
 reason: z.string().optional(),
 version: z.number().min(0, { message: 'Version required' }),
 headers: z.record(z.string()).optional(),
 signal: z.instanceof(AbortSignal).optional(),
}).refine(data => {
 if (data.status === 'CANCELLED') {
  return (data.reason?.trim() ?? '').length >= 15;
 }
 return true;
}, {
 message: 'الرجاء إدخال سبب الإلغاء (15 حرفاً على الأقل) / Cancellation reason must be at least 15 characters',
 path: ['reason']
});

const KitchenRequestSummarySchema = z.object({
 id: z.string(),
 requestNumber: z.string(),
 status: BadgeStatusSchema,
 departmentId: z.string(),
 departmentName: z.string().optional().nullable(),
 warehouseId: z.string(),
 warehouseName: z.string().optional().nullable(),
 requestedBy: z.string(),
 requestedAt: z.string(),
 createdAt: z.string(),
});

export type KitchenRequestSummary = z.infer<typeof KitchenRequestSummarySchema>;

export function useKitchenRequestList(filters: { status?: string; department_id?: string; page?: number } = {}) {
 const params = new URLSearchParams();
 if (filters.status) params.set('status', filters.status);
 if (filters.department_id) params.set('department_id', filters.department_id);
 params.set('page', String(filters.page ?? 1));

 return useQuery({
  queryKey: ['kitchen-requests', filters],
  queryFn: ({ signal }) => apiClient.get(`/operations/kitchen-requests?${params.toString()}`, paginatedSchema(KitchenRequestSummarySchema), { signal }),
  staleTime: 60_000,
  refetchInterval: 15000,
 });
}

export function useKitchenRequest(id: string) {
 return useQuery({
  queryKey: ['kitchen-requests', id],
  queryFn: ({ signal }) => apiClient.get(`/operations/kitchen-requests/${id}`, z.object({ data: KitchenRequestDetailSchema }), { signal }).then(r => r.data),
  enabled: !!id,
 });
}

export function useCreateKitchenRequest(options?: { onConflict?: () => void }) {
 const queryClient = useQueryClient();
 return useSafeMutation({
  onConflict: options?.onConflict,
  mutationFn: ({ data, signal }: { data: CreateKitchenRequestDTO & { isDraft?: boolean }; signal?: AbortSignal }) => {
   const payload = {
    departmentId: data.departmentId,
    warehouseId: data.warehouseId,
    notes: data.notes,
    isDraft: data.isDraft,
    items: data.items.map(item => ({
     itemId: item.itemId,
     quantityRequested: item.quantity,
    }))
   };
   return apiClient.post('/operations/kitchen-requests', z.object({ data: KitchenRequestDetailSchema }), payload, { signal }).then(r => r.data);
  },
  onSuccess: () => {
   queryClient.invalidateQueries({ queryKey: ['kitchen-requests'] });
  },
  onError: (error) => {
   console.error('Failed to create kitchen request:', error);
   const message = error instanceof Error ? error.message : 'Failed to create kitchen request';
   toast.error(message);
  },
 });
}

export function useUpdateKitchenRequestStatus(options?: { onConflict?: () => void }) {
 const queryClient = useQueryClient();
 return useSafeMutation({
  onConflict: () => {
   toast.error('تم تعديل هذا الطلب بواسطة مستخدم آخر. يتم الآن تحديث البيانات / This request was modified by another user. Refreshing data...');
   queryClient.invalidateQueries({ queryKey: ['kitchen-requests'] });
   if (options?.onConflict) {
    options.onConflict();
   }
  },
  mutationFn: async (variables: { id: string; status: string; reason?: string; version: number; headers?: Record<string, string>; signal?: AbortSignal }) => {
   const parsed = UpdateKitchenRequestStatusInputSchema.safeParse(variables);
   if (!parsed.success) {
    const statusIssue = parsed.error.issues.find(issue => issue.path.includes('status'));
    if (statusIssue) {
     throw new Error('إجراء غير صالح لهذه الوثيقة / Invalid action for this document');
    }
    throw new Error(parsed.error.issues[0]?.message || 'Invalid status payload');
   }

   const { id, status, reason, version, headers, signal } = parsed.data;

   const endpoint = status === 'SUBMITTED'
    ? `/operations/kitchen-requests/${id}/submit`
    : `/operations/kitchen-requests/${id}/cancel`;

   return apiClient.post(
    endpoint,
    z.object({ data: KitchenRequestDetailSchema }),
    { comments: reason, version },
    { headers, signal }
   ).then(r => r.data);
  },
  onSuccess: (_, variables) => {
   queryClient.invalidateQueries({ queryKey: ['kitchen-requests'] });
   queryClient.invalidateQueries({ queryKey: ['kitchen-requests', variables.id] });
  },
  onError: (error) => {
   console.error('Failed to update kitchen request status:', error);
  },
 });
}

export function useFulfillKitchenRequest(options?: { onConflict?: () => void }) {
 const queryClient = useQueryClient();
  return useSafeMutation({
   onConflict: options?.onConflict,
   skipAutoToast: true,
   mutationFn: ({ id, fulfillments, version, headers, signal }: { id: string; fulfillments: { itemId: string; fulfilledQty: number }[]; version: number; headers?: Record<string, string>; signal?: AbortSignal }) => {
    if (fulfillments.some(f => f.fulfilledQty <= 0)) {
     throw new Error("Fulfilled quantity must be greater than zero");
    }
    return apiClient.post(`/operations/kitchen-requests/${id}/fulfill`, z.object({ data: KitchenRequestDetailSchema }), { fulfillments, version }, { headers, signal }).then(r => r.data);
   },
 onSuccess: (_, variables) => {
 queryClient.invalidateQueries({ queryKey: ['kitchen-requests'] });
 queryClient.invalidateQueries({ queryKey: ['kitchen-requests', variables.id] });
 queryClient.invalidateQueries({ queryKey: ['inventory/balance'] });
 },
 onError: (error: AxiosLikeError) => {
  console.error('Failed to fulfill kitchen request:', error);
  const errorMsg = error.message || error.response?.data?.message || '';
  if (errorMsg.includes('Insufficient stock')) {
   const match = /Requested:\s*([\d.]+),\s*Available\s*\(net\s*of\s*allocations\):\s*([\d.]+)/i.exec(errorMsg);
   if (match) {
    const requested = match[1];
    const available = match[2];
    toast.error(`الرصيد غير كافٍ! الكمية المطلوبة: ${requested}، بينما المتاح الفعلي هو: ${available}`);
   } else {
    toast.error('الرصيد غير كافٍ لإتمام عملية الصرف!');
   }
  } else {
   toast.error('فشلت عملية الصرف! يرجى التحقق من المدخلات وإعادة المحاولة.');
  }
 },
 });
}
