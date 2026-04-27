'use client';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { paginatedSchema } from '@/types/api';
import { z } from 'zod';

import { AuthUserSchema } from '@/types/auth';

export type AdminUserRow = z.infer<typeof AuthUserSchema>;

export function useAdminUsers(filters: { page?: number } = {}) {
  const params = new URLSearchParams();
  params.set('page', String(filters.page ?? 1));
  return useQuery({
    queryKey: ['admin/users', filters],
    queryFn: () => apiClient.get(`/admin/users?${params.toString()}`, paginatedSchema(AuthUserSchema)),
    staleTime: 60_000,
  });
}

export function useAdminUser(id: string | null) {
  return useQuery({
    queryKey: ['admin/users', id],
    queryFn: () => apiClient.get(`/admin/users/${id}`, AuthUserSchema),
    enabled: !!id,
  });
}