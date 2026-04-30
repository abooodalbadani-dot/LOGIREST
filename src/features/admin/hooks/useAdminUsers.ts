'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { paginatedSchema, PaginatedResponse } from '@/types/api';
import { z } from 'zod';
import { AuthUserSchema } from '@/types/auth';
import { useAuth } from '@/providers/AuthProvider';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

export type AdminUserRow = z.infer<typeof AuthUserSchema>;

export const UserFormSchema = z.object({
  name: z.string().min(3, 'name_min_length'),
  email: z.string().email('invalid_email'),
  role: z.string(),
  status: z.enum(['ACTIVE', 'INACTIVE']),
  language: z.enum(['en', 'ar']),
  branch_ids: z.array(z.string()),
  warehouse_ids: z.array(z.string()),
  department_ids: z.array(z.string()),
});

export type UserFormValues = z.infer<typeof UserFormSchema>;

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

export function useAdminUserMutations() {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const t = useTranslations('admin.users');

  const checkEmailUnique = (email: string, excludeId?: string) => {
    const allUsers = queryClient.getQueryData<PaginatedResponse<AdminUserRow>>(['admin/users', { page: 1 }])?.data || [];
    return !allUsers.some(u => u.email.toLowerCase() === email.toLowerCase() && u.id !== excludeId);
  };

  const isLastActiveAdmin = (targetId: string) => {
    const allUsers = queryClient.getQueryData<PaginatedResponse<AdminUserRow>>(['admin/users', { page: 1 }])?.data || [];
    const activeAdmins = allUsers.filter(u => u.role === 'ADMIN' && u.status === 'ACTIVE');
    const targetUser = allUsers.find(u => u.id === targetId) || queryClient.getQueryData<AdminUserRow>(['admin/users', targetId]);
    
    if (targetUser?.role === 'ADMIN' && targetUser?.status === 'ACTIVE') {
      return activeAdmins.length === 1 && activeAdmins[0].id === targetId;
    }
    return false;
  };

  const createUser = useMutation({
    mutationFn: async (userData: UserFormValues) => {
      if (!checkEmailUnique(userData.email)) {
        throw new Error(t('email_already_exists'));
      }
      // Simulate API call
      return { 
        ...userData, 
        id: Math.random().toString(36).substr(2, 9), 
        created_at: new Date().toISOString(),
        scopes: [
          ...userData.branch_ids.map(id => ({ branch_id: id })),
          ...userData.warehouse_ids.map(id => ({ warehouse_id: id })),
          ...userData.department_ids.map(id => ({ department_id: id })),
        ]
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin/users'] });
      toast.success(t('create_success'));
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateUser = useMutation({
    mutationFn: async ({ id, ...values }: UserFormValues & { id: string }) => {
      // Hard Guards (Mutation Level)
      if (currentUser?.id === id) {
        const originalUser = queryClient.getQueryData<AdminUserRow>(['admin/users', id]);
        if (values.role !== 'ADMIN' || values.status === 'INACTIVE') {
          throw new Error(t('cannot_modify_self'));
        }
      }

      if (!checkEmailUnique(values.email, id)) {
        throw new Error(t('email_already_exists'));
      }

      const originalUser = queryClient.getQueryData<AdminUserRow>(['admin/users', id]);
      const isCurrentlyAdmin = originalUser?.role === 'ADMIN';
      const isCurrentlyActive = originalUser?.status === 'ACTIVE';
      
      const isDemoting = isCurrentlyAdmin && values.role !== 'ADMIN';
      const isDeactivating = isCurrentlyActive && values.status === 'INACTIVE';

      if ((isDemoting || isDeactivating) && isLastActiveAdmin(id)) {
        throw new Error(t('cannot_deactivate_last_admin'));
      }

      return { ...values, id };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['admin/users', data.id] });
      toast.success(t('update_success'));
    },
    onError: (err: any) => toast.error(err.message),
  });

  const toggleStatus = useMutation({
    mutationFn: async ({ id, status, role }: { id: string; status: 'ACTIVE' | 'INACTIVE', role: string }) => {
      if (currentUser?.id === id && status === 'INACTIVE') {
        throw new Error(t('cannot_deactivate_self'));
      }

      if (status === 'INACTIVE' && isLastActiveAdmin(id)) {
        throw new Error(t('cannot_deactivate_last_admin'));
      }

      return { id, status };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['admin/users', data.id] });
      toast.success(t('update_success'));
    },
    onError: (err: any) => toast.error(err.message),
  });

  return { createUser, updateUser, toggleStatus, isLastActiveAdmin };
}