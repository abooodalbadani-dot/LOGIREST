'use client';
import { useAuth } from '@/providers/AuthProvider';
import { PERMISSION_MATRIX, type ResourceType, type ActionType } from '@/types/rbac';

export function usePermission(action: ActionType, resource: ResourceType): boolean {
  const { user } = useAuth();
  if (!user) return false;
  
  // Normalize role to lowercase to match matrix keys (e.g., 'ADMIN' -> 'admin')
  const roleKey = user.role.toLowerCase() as keyof typeof PERMISSION_MATRIX;
  const allowed = PERMISSION_MATRIX[roleKey]?.[resource] ?? [];
  
  return allowed.includes(action);
}
