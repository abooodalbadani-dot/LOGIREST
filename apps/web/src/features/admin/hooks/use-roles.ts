'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api/client';
import { z } from 'zod';

const RolePermissionsActionsSchema = z.object({
  view: z.boolean(),
  create: z.boolean(),
  edit: z.boolean(),
  approve: z.boolean(),
  post: z.boolean(),
});

const RolePermissionSchema = z.object({
  module: z.string(),
  actions: RolePermissionsActionsSchema,
});

const RoleDescriptorSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  description: z.string(),
  userCount: z.number(),
  permissions: z.array(RolePermissionSchema),
});

const RolesResponseSchema = z.array(RoleDescriptorSchema);

export interface RoleDescriptor {
  id: string;
  displayName: string;
  description: string;
  userCount: number;
  permissions: Array<{
    module: string;
    actions: {
      view: boolean;
      create: boolean;
      edit: boolean;
      approve: boolean;
      post: boolean;
    };
  }>;
}

export function useRoles() {
  return useQuery({
    queryKey: ['admin/roles'],
    queryFn: async ({ signal }) => {
      const data = await apiClient.get('/admin/roles', RolesResponseSchema, { signal });
      return data as RoleDescriptor[];
    },
    staleTime: 60_000,
  });
}

const UserRoleSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  role: z.string(),
  status: z.string(),
  created_at: z.string(),
});

const PaginatedUsersResponseSchema = z.object({
  data: z.array(UserRoleSchema),
  meta: z.object({
    page: z.number(),
    page_size: z.number(),
    total: z.number(),
    total_pages: z.number(),
  }),
});

export interface UserSummary {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
}

export interface PaginatedUsers {
  data: UserSummary[];
  meta: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
}

export function useUsers(page: number = 1, limit: number = 20) {
  return useQuery({
    queryKey: ['admin/users', page, limit],
    queryFn: async ({ signal }) => {
      const data = await apiClient.get(
        `/admin/users?page=${page}&limit=${limit}`,
        PaginatedUsersResponseSchema,
        { signal },
      );
      return data as PaginatedUsers;
    },
    staleTime: 30_000,
  });
}

const UpdateRoleResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

export function useUpdateUserRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      role,
    }: {
      userId: string;
      role: string;
    }) => {
      const data = await apiClient.put(
        `/admin/users/${userId}/role`,
        UpdateRoleResponseSchema,
        { role },
      );
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['admin/roles'] });
      toast.success(`User role updated to ${variables.role}`);
    },
    onError: () => {
      toast.error('Failed to update user role');
    },
  });
}
