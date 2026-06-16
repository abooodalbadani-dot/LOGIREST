'use client';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { paginatedSchema } from '@/types/api';
import { NotificationTemplateSchema, ParameterRegistrySchema, TriggerEventSchema } from '@/types/notifications';

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
  enabled: !!id && id !== 'undefined' && id !== 'null',
 });
}

export function useTriggerEvents() {
 return useQuery({
  queryKey: ['notifications/trigger-events'],
  queryFn: ({ signal }) => apiClient.get('/notifications/trigger-events', TriggerEventSchema.array(), { signal }),
  staleTime: 300_000,
 });
}

export function useParameterRegistry() {
 return useQuery({
  queryKey: ['notifications/parameter-registry'],
  queryFn: ({ signal }) => apiClient.get('/notifications/parameter-registry', ParameterRegistrySchema, { signal }),
  staleTime: 300_000,
 });
}
