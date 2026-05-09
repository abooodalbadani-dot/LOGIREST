'use client';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { paginatedSchema } from '@/types/api';
import { z } from 'zod';

const NotificationTemplateSchema = z.object({
 id: z.string(),
 code: z.string(),
 subject_ar: z.string(),
 subject_en: z.string(),
 body_ar: z.string(),
 body_en: z.string(),
 trigger_event: z.string(),
 is_active: z.boolean(),
});

export type NotificationTemplateRow = z.infer<typeof NotificationTemplateSchema>;

export function useNotificationTemplates(filters: { page?: number } = {}) {
 const params = new URLSearchParams();
 params.set('page', String(filters.page ?? 1));
 return useQuery({
 queryKey: ['notifications/templates', filters],
 queryFn: () => apiClient.get(`/notifications/templates?${params.toString()}`, paginatedSchema(NotificationTemplateSchema)),
 staleTime: 60_000,
 });
}

export function useNotificationTemplate(id: string | null) {
 return useQuery({
 queryKey: ['notifications/templates', id],
 queryFn: () => apiClient.get(`/notifications/templates/${id}`, NotificationTemplateSchema),
 enabled: !!id,
 });
}
