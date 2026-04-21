'use client';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { paginatedSchema } from '@/types/api';
import { z } from 'zod';

export const TransferSummarySchema = z.object({ 
  id: z.string(), 
  document_number: z.string(), 
  transfer_status: z.string(), 
  from_warehouse_id: z.string(), 
  to_warehouse_id: z.string(), 
  shipped_at: z.string().nullable().optional(),
  received_at: z.string().nullable().optional(),
  created_at: z.string(), 
});

export type TransferSummary = z.infer<typeof TransferSummarySchema>;

export function useTransferList(filters: { status?: string; page?: number } = {}) {
  const params = new URLSearchParams();
  if (filters.status) params.set('transfer_status', filters.status);
  params.set('page', String(filters.page ?? 1));
  
  return useQuery({
    queryKey: ['transfers', filters],
    queryFn: () => apiClient.get(`/operations/transfers?${params.toString()}`, paginatedSchema(TransferSummarySchema)),
    staleTime: 60_000,
  });
}
