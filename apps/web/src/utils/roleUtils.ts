/**
 * Role utility functions — single source of truth for UI role categorization.
 * Replaces the fragile inline role normalization that was spread across Sidebar.tsx.
 */
import type { UserRole } from '@/providers/AuthProvider';

export type RoleCategory = 'admin' | 'manager' | 'auditor' | 'operations' | 'clerk';

/**
 * Maps a system role to a UI category used for sidebar navigation grouping.
 * This function is the ONLY place where this mapping should be defined.
 */
export function getRoleCategory(role: UserRole): RoleCategory {
  switch (role) {
    case 'ADMIN':
      return 'admin';
    case 'AUDITOR':
      return 'auditor';
    case 'GM':
    case 'INV_MGR':
    case 'STORE_MGR':
    case 'PROC_OFFICER':
    case 'BRANCH_MGR':
    case 'PROC_MGR':
      return 'manager';
    case 'WH_KEEPER':
    case 'KITCHEN_CHIEF':
    case 'APPROVER':
      return 'operations';
    case 'VIEWER':
    default:
      return 'clerk';
  }
}

/**
 * Returns true if the role has any management-level authority
 * (can approve documents, manage resources, see reports).
 */
export function isManagerRole(role: UserRole): boolean {
  const category = getRoleCategory(role);
  return category === 'admin' || category === 'manager';
}

/**
 * Returns true if the role has approval authority over documents.
 */
export function hasApprovalAuthority(role: UserRole): boolean {
  return (
    role === 'ADMIN' ||
    role === 'APPROVER' ||
    role === 'INV_MGR' ||
    role === 'STORE_MGR' ||
    role === 'BRANCH_MGR' ||
    role === 'PROC_MGR' ||
    role === 'GM'
  );
}

/**
 * Returns true if the role should see financial cost data
 * (unit price, WAC, total value).
 * Operational roles (WH_KEEPER, KITCHEN_CHIEF) are excluded.
 */
export function canViewFinancialData(role: UserRole): boolean {
  return (
    role === 'ADMIN' ||
    role === 'GM' ||
    role === 'INV_MGR' ||
    role === 'AUDITOR' ||
    role === 'PROC_MGR' ||
    role === 'PROC_OFFICER' ||
    role === 'STORE_MGR' ||
    role === 'BRANCH_MGR'
  );
}
