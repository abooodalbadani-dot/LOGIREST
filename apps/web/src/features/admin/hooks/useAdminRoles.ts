'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

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

const DEFAULT_MODULES = [
 'Inventory',
 'Procurement',
 'Operations',
 'Admin',
 'Reports',
 'Communications'
];

const MOCK_ROLES: AdminRole[] = [
 {
 id: 'ADMIN',
 name: 'Administrator',
 description: 'Full system access with immutable security protocols',
 users_count: 2,
 permissions: DEFAULT_MODULES.map(module => ({
 module,
 actions: { view: true, create: true, edit: true, approve: true, post: true }
 }))
 },
 {
 id: 'INV_MGR',
 name: 'Inventory Manager',
 description: 'Manages stock levels, adjustments and stocktake workflows',
 users_count: 5,
 permissions: DEFAULT_MODULES.map(module => ({
 module,
 actions: { 
 view: true, 
 create: module === 'Inventory' || module === 'Operations', 
 edit: module === 'Inventory' || module === 'Operations', 
 approve: module === 'Operations', 
 post: module === 'Operations'
 }
 }))
 },
 {
 id: 'WH_KEEPER',
 name: 'Warehouse Keeper',
 description: 'Operational execution of transfers and goods receiving',
 users_count: 12,
 permissions: DEFAULT_MODULES.map(module => ({
 module,
 actions: { 
 view: module !== 'Admin', 
 create: module === 'Inventory', 
 edit: false, 
 approve: false, 
 post: false 
 }
 }))
 },
 {
 id: 'PROC_OFF',
 name: 'Procurement Officer',
 description: 'Handles purchase requests and order cycles',
 users_count: 4,
 permissions: DEFAULT_MODULES.map(module => ({
 module,
 actions: { 
 view: true, 
 create: module === 'Procurement', 
 edit: module === 'Procurement', 
 approve: false, 
 post: false 
 }
 }))
 },
 {
 id: 'APPROVER',
 name: 'Executive Approver',
 description: 'Strategic approval authority for procurement and financial documents',
 users_count: 3,
 permissions: DEFAULT_MODULES.map(module => ({
 module,
 actions: { 
 view: true, 
 create: false, 
 edit: false, 
 approve: true, 
 post: false 
 }
 }))
 },
 {
 id: 'AUDITOR',
 name: 'System Auditor',
 description: 'Read-only access to all modules for compliance tracking',
 users_count: 2,
 permissions: DEFAULT_MODULES.map(module => ({
 module,
 actions: { view: true, create: false, edit: false, approve: false, post: false }
 }))
 }
];

export function useAdminRoles() {
  return useQuery({
    queryKey: ['admin/roles'],
    queryFn: async ({ signal }) => {
      // Simulate network delay
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(resolve, 500);
        signal?.addEventListener('abort', () => {
          clearTimeout(timeout);
          reject(new Error('Aborted'));
        });
      });
      return MOCK_ROLES;
    },
    staleTime: 60_000,
  });
}

export function useAdminRole(id: string | null) {
  return useQuery({
    queryKey: ['admin/roles', id],
    queryFn: async ({ signal }) => {
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(resolve, 300);
        signal?.addEventListener('abort', () => {
          clearTimeout(timeout);
          reject(new Error('Aborted'));
        });
      });
      const role = MOCK_ROLES.find(r => r.id === id);
      if (!role) throw new Error('Role not found');
      return role;
    },
    enabled: !!id,
  });
}

export function useUpdateRolePermissions() {
  const queryClient = useQueryClient();
  const t = useTranslations('admin.roles');

  return useMutation({
    mutationFn: async ({ id, permissions, signal }: { id: string; permissions: Permission[]; signal?: AbortSignal }) => {
      return Promise.race([
        (async () => {
          // Simulate latency
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Enforce: Role must have at least one module visibility
          const hasView = permissions.some(p => p.actions.view);
          if (!hasView) {
            throw new Error('at_least_one_view');
          }

          // Update in cache simulation
          return { id, permissions };
        })(),
        new Promise<never>((_, reject) => 
          signal?.addEventListener('abort', () => reject(new Error('Aborted')))
        )
      ]);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin/roles'] });
      queryClient.invalidateQueries({ queryKey: ['admin/roles', data.id] });
      toast.success(t('permissions_updated'));
    },
    onError: (error: Error) => {
      if (error.message === 'Aborted') return;
      toast.error(t(error.message) || error.message);
    }
  });
}
