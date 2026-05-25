/**
 * Roles API Contracts
 * 
 * Target endpoints:
 * - GET /admin/roles - Returns an array of RoleDescriptors with active user counts and permissions.
 */

import type { UserRole } from '../../../../packages/shared-types/src/rbac';

export interface PermissionContract {
  module: string;
  actions: {
    view: boolean;
    create: boolean;
    edit: boolean;
    approve: boolean;
    post: boolean;
  };
}

export interface RoleDescriptorContract {
  id: UserRole;
  displayName: string;
  description: string;
  userCount: number;
  permissions: PermissionContract[];
}

/**
 * Expected HTTP Response Types:
 * 
 * GET /admin/roles
 * - Status 200 OK: RoleDescriptorContract[]
 * - Status 401 Unauthorized: When no valid token is provided
 * - Status 403 Forbidden: When standard user attempts access
 */
