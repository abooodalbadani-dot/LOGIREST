'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { NotificationLogSchema, type NotificationLog } from '@/types/notifications';
import { z } from 'zod';

export function useNotifications() {
 return useQuery<NotificationLog[]>({
  queryKey: ['notifications'],
  queryFn: async () => {
   try {
    return await apiClient.get('/notifications', NotificationLogSchema.array(), { skipAutoToast: true });
   } catch (err) {
    console.warn('Silent degradation: Failed to fetch notifications in background:', err);
    return [];
   }
  },
  refetchInterval: 60000, // Poll every 60 seconds
  staleTime: 30000, // Prevent tab-switching from triggering instant re-fetches
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
