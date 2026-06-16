'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { paginatedSchema, PaginatedResponse } from '@/types/api';
import { z } from 'zod';
import { AuthUserSchema } from '@/types/auth';
import { useAuth } from '@/providers/AuthProvider';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { CreateUserSchema, type CreateUserInput } from '@logirest/shared-types';

export type UserFormValues = CreateUserInput;
export type AdminUserRow = z.infer<typeof AuthUserSchema>;

export const UserFormSchema = CreateUserSchema;

export function useAdminUsers(filters: { page?: number } = {}) {
 const params = new URLSearchParams();
 params.set('page', String(filters.page ?? 1));
 return useQuery({
  queryKey: ['admin/users', filters],
  queryFn: ({ signal }) => apiClient.get(`/admin/users?${params.toString()}`, paginatedSchema(AuthUserSchema), { signal }),
  staleTime: 60_000,
 });
}

export function useAdminUser(id: string | null) {
 return useQuery({
  queryKey: ['admin/users', id],
  queryFn: ({ signal }) => apiClient.get(`/admin/users/${id}`, AuthUserSchema, { signal }),
  enabled: !!id && id !== 'undefined' && id !== 'null',
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
   return apiClient.post('/admin/users', AuthUserSchema, userData);
  },
  onSuccess: () => {
   queryClient.invalidateQueries({ queryKey: ['admin/users'] });
   toast.success(t('create_success'));
  },
  onError: (err: Error) => toast.error(err.message),
 });

 const updateUser = useMutation({
  mutationFn: async ({ id, ...values }: UserFormValues & { id: string }) => {
   if (currentUser?.id === id) {
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

   return apiClient.put(`/admin/users/${id}`, AuthUserSchema, values);
  },
  onSuccess: (data) => {
   queryClient.invalidateQueries({ queryKey: ['admin/users'] });
   queryClient.invalidateQueries({ queryKey: ['admin/users', data.id] });
   toast.success(t('update_success'));
  },
  onError: (err: Error) => toast.error(err.message),
 });

 const toggleStatus = useMutation({
  mutationFn: async ({ id, status }: { id: string; status: 'ACTIVE' | 'INACTIVE', role: string }) => {
   if (currentUser?.id === id && status === 'INACTIVE') {
    throw new Error(t('cannot_deactivate_self'));
   }

   if (status === 'INACTIVE' && isLastActiveAdmin(id)) {
    throw new Error(t('cannot_deactivate_last_admin'));
   }

   const originalUser = queryClient.getQueryData<AdminUserRow>(['admin/users', id]) || 
              await queryClient.fetchQuery({
               queryKey: ['admin/users', id],
               queryFn: ({ signal }) => apiClient.get(`/admin/users/${id}`, AuthUserSchema, { signal })
              });

   if (!originalUser) {
    throw new Error('User not found');
   }

   const values: UserFormValues = {
    name: originalUser.name,
    email: originalUser.email,
    role: originalUser.role,
    status: status,
    language: (originalUser.language as 'en' | 'ar') || 'en',
    branchIds: originalUser.scopes.filter(s => s.branchId).map(s => s.branchId!),
    warehouseIds: originalUser.scopes.filter(s => s.warehouseId).map(s => s.warehouseId!),
    departmentIds: originalUser.scopes.filter(s => s.departmentId).map(s => s.departmentId!),
   };

   return apiClient.put(`/admin/users/${id}`, AuthUserSchema, values);
  },
  onSuccess: (data) => {
   queryClient.invalidateQueries({ queryKey: ['admin/users'] });
   queryClient.invalidateQueries({ queryKey: ['admin/users', data.id] });
   toast.success(t('update_success'));
  },
  onError: (err: Error) => toast.error(err.message),
 });

 return { createUser, updateUser, toggleStatus, isLastActiveAdmin };
}
