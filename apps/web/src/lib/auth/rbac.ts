import { UserRole, ResourceType, ActionType } from '@/types/rbac';
import { checkPermission } from '@/hooks/usePermission';

export function hasPermission(role: UserRole, resource: ResourceType, action: ActionType): boolean {
  return checkPermission(role, action, resource);
}

export function canPerform(role: UserRole, action: ActionType, resource: ResourceType): boolean {
  return checkPermission(role, action, resource);
}
