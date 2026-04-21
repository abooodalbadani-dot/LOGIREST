'use client';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { paginatedSchema } from '@/types/api';
import { z } from 'zod';

const AdminUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  role: z.string(),
  scopes: z.array(z.object({ branch_id: z.string().nullable(), warehouse_id: z.string().nullable(), department_id: z.string().nullable() })),
});

export type AdminUserRow = z.infer<typeof AdminUserSchema>;

export function useAdminUsers(filters: { page?: number } = {}) {
  const params = new URLSearchParams();
  params.set('page', String(filters.page ?? 1));
  return useQuery({
    queryKey: ['admin/users', filters],
    queryFn: () => apiClient.get(`/admin/users?${params.toString()}`, paginatedSchema(AdminUserSchema)),
    staleTime: 60_000,
  });
}

export function useAdminUser(id: string | null) {
  return useQuery({
    queryKey: ['admin/users', id],
    queryFn: () => apiClient.get(`/admin/users/${id}`, AdminUserSchema),
    enabled: !!id,
  });
}