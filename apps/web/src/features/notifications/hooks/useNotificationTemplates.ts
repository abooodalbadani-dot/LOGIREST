'use client';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { paginatedSchema } from '@/types/api';
import { z } from 'zod';

export const TemplateParameterSchema = z.object({
  name: z.string(),
  label_ar: z.string(),
  label_en: z.string(),
  sample_value: z.string(),
});

export type TemplateParameter = z.infer<typeof TemplateParameterSchema>;

export const NotificationTemplateSchema = z.object({
  id: z.string(),
  code: z.string(),
  subject_ar: z.string(),
  subject_en: z.string(),
  body_ar: z.string(),
  body_en: z.string(),
  trigger_event: z.string(),
  is_active: z.boolean(),
  allowed_parameters: z.array(TemplateParameterSchema).default([]),
});

export type NotificationTemplateRow = z.infer<typeof NotificationTemplateSchema>;

export function useNotificationTemplates(filters: { page?: number } = {}) {
 const params = new URLSearchParams();
 params.set('page', String(filters.page ?? 1));
  return useQuery({
    queryKey: ['notifications/templates', filters],
    queryFn: ({ signal }) => apiClient.get(`/notifications/templates?${params.toString()}`, paginatedSchema(NotificationTemplateSchema), { signal }),
    staleTime: 60_000,
  });
}

export function useNotificationTemplate(id: string | null) {
  return useQuery({
    queryKey: ['notifications/templates', id],
    queryFn: ({ signal }) => apiClient.get(`/notifications/templates/${id}`, NotificationTemplateSchema, { signal }),
    enabled: !!id,
  });
}
