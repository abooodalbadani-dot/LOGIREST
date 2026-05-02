'use client';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { paginatedSchema } from '@/types/api';
import { z } from 'zod';
import { AuditLogEntrySchema } from '@/types/notifications';

export type AuditLogRow = z.infer<typeof AuditLogEntrySchema>;

export function useAuditLogs(filters: { page?: number } = {}) {
 const params = new URLSearchParams();
 params.set('page', String(filters.page ?? 1));
 return useQuery({
 queryKey: ['admin/audit-logs', filters],
 queryFn: () => apiClient.get(`/admin/audit-logs?${params.toString()}`, paginatedSchema(AuditLogEntrySchema)),
 staleTime: 60_000,
 });
}