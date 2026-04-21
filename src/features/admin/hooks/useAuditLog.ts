'use client';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { paginatedSchema } from '@/types/api';
import { z } from 'zod';
import type { AuditLogEntry } from '@/types/notifications';

const AuditLogEntrySchema = z.object({
  id: z.string(),
  entity_type: z.string(),
  entity_id: z.string(),
  action: z.string(),
  user_id: z.string(),
  user_name: z.string(),
  changes: z.array(z.object({ field: z.string(), old_value: z.unknown(), new_value: z.unknown() })),
  created_at: z.string(),
});

export type AuditLogRow = z.infer<typeof AuditLogEntrySchema>;

export function useAuditLog(filters: { page?: number } = {}) {
  const params = new URLSearchParams();
  params.set('page', String(filters.page ?? 1));
  return useQuery({
    queryKey: ['admin/audit-log', filters],
    queryFn: () => apiClient.get(`/admin/audit-log?${params.toString()}`, paginatedSchema(AuditLogEntrySchema)),
    staleTime: 60_000,
  });
}