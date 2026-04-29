'use client';
import { useAuth } from '@/providers/AuthProvider';
import { PERMISSION_MATRIX, type ResourceType, type ActionType } from '@/types/rbac';

export function usePermission(action: ActionType, resource: ResourceType): boolean {
  const { user, isLoading } = useAuth();

  // During auth loading, assume no permission to avoid flash
  if (isLoading || !user) return false;

  // PERMISSION_MATRIX keys are uppercase (e.g. 'ADMIN', 'STORE_MGR')
  const roleKey = user.role as keyof typeof PERMISSION_MATRIX;
  const allowed = PERMISSION_MATRIX[roleKey]?.[resource] ?? [];

  return allowed.includes(action);
}
