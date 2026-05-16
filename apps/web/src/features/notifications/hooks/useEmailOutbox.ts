'use client';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { paginatedSchema } from '@/types/api';
import { z } from 'zod';

const EmailOutboxEntrySchema = z.object({
 id: z.string(),
 template_id: z.string(),
 recipient_email: z.string(),
 subject: z.string(),
 sent_at: z.string().nullable(),
 status: z.enum(['PENDING', 'SENT', 'FAILED']),
 error_message: z.string().nullable(),
});

export type EmailOutboxRow = z.infer<typeof EmailOutboxEntrySchema>;

export function useEmailOutbox(filters: { status?: string; page?: number } = {}) {
 const params = new URLSearchParams();
 if (filters.status) params.set('status', filters.status);
 params.set('page', String(filters.page ?? 1));
  return useQuery({
    queryKey: ['notifications/outbox', filters],
    queryFn: ({ signal }) => apiClient.get(`/notifications/outbox?${params.toString()}`, paginatedSchema(EmailOutboxEntrySchema), { signal }),
    staleTime: 60_000,
  });
}
