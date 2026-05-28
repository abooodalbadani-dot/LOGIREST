'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { apiClient } from '@/lib/api/client';
import { z } from 'zod';

export type RoleAction = 'view' | 'create' | 'edit' | 'approve' | 'post';

export interface Permission {
  module: string;
  actions: {
    view: boolean;
    create: boolean;
    edit: boolean;
    approve: boolean;
    post: boolean;
  };
}

export interface AdminRole {
  id: string;
  name: string;
  description: string;
  users_count: number;
  permissions: Permission[];
}

const PermissionSchema = z.object({
  module: z.string(),
  actions: z.object({
    view: z.boolean(),
    create: z.boolean(),
    edit: z.boolean(),
    approve: z.boolean(),
    post: z.boolean(),
  }),
});

const RoleDescriptorSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  description: z.string(),
  userCount: z.number(),
  permissions: z.array(PermissionSchema),
});

const RolesResponseSchema = z.array(RoleDescriptorSchema);

export function useAdminRoles() {
  return useQuery({
    queryKey: ['admin/roles'],
    queryFn: async ({ signal }) => {
      const data = await apiClient.get('/admin/roles', RolesResponseSchema, { signal });
      return data.map(role => ({
        id: role.id,
        name: role.displayName,
        description: role.description,
        users_count: role.userCount,
        permissions: role.permissions,
      })) as AdminRole[];
    },
    staleTime: 60_000,
  });
}

export function useAdminRole(id: string | null) {
  return useQuery({
    queryKey: ['admin/roles', id],
    queryFn: async ({ signal }) => {
      if (!id) throw new Error('Role ID is required');
      const data = await apiClient.get('/admin/roles', RolesResponseSchema, { signal });
      const role = data.find(r => r.id === id);
      if (!role) throw new Error('Role not found');
      return {
        id: role.id,
        name: role.displayName,
        description: role.description,
        users_count: role.userCount,
        permissions: role.permissions,
      } as AdminRole;
    },
    enabled: !!id,
  });
}



