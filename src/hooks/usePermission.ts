'use client';
import { useAuth } from '@/providers/AuthProvider';
import { PERMISSION_MATRIX, type ResourceType, type ActionType } from '@/types/rbac';

export function usePermission(action: ActionType, resource: ResourceType): boolean {
  const { user } = useAuth();
  if (!user) return false;
  const allowed = PERMISSION_MATRIX[user.role]?.[resource] ?? [];
  return allowed.includes(action);
}
