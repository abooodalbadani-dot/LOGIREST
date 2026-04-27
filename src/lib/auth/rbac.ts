import { UserRole, PERMISSION_MATRIX, ResourceType, ActionType } from '@/types/rbac';

export function hasPermission(role: UserRole, resource: ResourceType, action: ActionType): boolean {
  const permissions = PERMISSION_MATRIX[role];
  if (!permissions) return false;
  
  const resourcePermissions = permissions[resource];
  if (!resourcePermissions) return false;
  
  return resourcePermissions.includes(action);
}

export function canPerform(role: UserRole, action: ActionType, resource: ResourceType): boolean {
  return hasPermission(role, resource, action);
}
