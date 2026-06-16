'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { NotificationLogSchema, type NotificationLog } from '@/types/notifications';
import { z } from 'zod';

export function useNotifications() {
 return useQuery<NotificationLog[]>({
  queryKey: ['notifications'],
  queryFn: () => apiClient.get('/notifications', NotificationLogSchema.array()),
  refetchInterval: 30000, // Poll every 30 seconds
 });
}

export function useMarkNotificationRead() {
 const queryClient = useQueryClient();
 return useMutation({
  mutationFn: (id: string) =>
   apiClient.patch(`/notifications/${id}/read`, z.object({ id: z.string(), isRead: z.boolean() }), {}),
  onSuccess: () => {
   queryClient.invalidateQueries({ queryKey: ['notifications'] });
  },
 });
}

export function useMarkAllNotificationsRead() {
 const queryClient = useQueryClient();
 return useMutation({
  mutationFn: () =>
   apiClient.post('/notifications/read-all', z.object({ success: z.boolean(), markedReadCount: z.number() }), {}),
  onSuccess: () => {
   queryClient.invalidateQueries({ queryKey: ['notifications'] });
  },
 });
}
