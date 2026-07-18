import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { z } from 'zod';
import { useRouter } from '@/i18n/navigation';
import { invalidatePRQueries, invalidatePOQueries } from '@/lib/react-query/invalidation';

interface ConvertToPOPayload {
  supplierId: string;
  currencyId: string;
  lines: Array<{ itemId: string; unitPrice: number }>;
  version: number;
}

const ConvertToPoResponseSchema = z.object({
  data: z.object({
    id: z.string(),
  }).optional(),
}).optional();

export function useConvertToPO(prId: string) {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (payload: ConvertToPOPayload) =>
      apiClient.post(`/procurement/purchase-requests/${prId}/convert-to-po`, ConvertToPoResponseSchema, payload),
    onSuccess: (responseData) => {
      invalidatePRQueries(queryClient, prId);
      invalidatePOQueries(queryClient);
      // Navigate to the newly created PO
      if (responseData?.data?.id) {
        router.push(`/purchase-orders/${responseData.data.id}`);
      }
    },
  });
}
