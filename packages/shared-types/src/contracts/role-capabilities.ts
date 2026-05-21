/**
 * Role Capabilities Contract
 * Single source of truth for per-document-type role authorization.
 * Both usePermission and canPerformActionV2 derive from this contract.
 */

import type { UserRole } from '../rbac';

export type BaseDocumentType =
  | 'adjustment'
  | 'transfer'
  | 'issue'
  | 'stocktake'
  | 'kitchen_request'
  | 'pr'
  | 'po'
  | 'grn';

export type DocumentType = BaseDocumentType | Uppercase<BaseDocumentType>;

export type CapabilityAction =
  | 'create'
  | 'submit'
  | 'approve'
  | 'reject'
  | 'post'
  | 'cancel'
  | 'edit'
  | 'view'
  | 'export'
  | 'ship'
  | 'receive'
  | 'start'
  | 'count'
  | 'review'
  | 'close'
  | 'fulfill';

export const ROLE_CAPABILITIES = {
  adjustment: {
    create: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR'] as const,
    submit: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR'] as const,
    approve: ['ADMIN', 'APPROVER', 'INV_MGR', 'STORE_MGR'] as const,
    reject: ['ADMIN', 'APPROVER', 'INV_MGR', 'STORE_MGR'] as const,
    post: ['ADMIN', 'INV_MGR'] as const,
    cancel: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR'] as const,
    edit: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR'] as const,
    view: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR', 'APPROVER', 'KITCHEN_CHIEF', 'PROC_OFFICER', 'AUDITOR', 'GM', 'VIEWER'] as const,
    export: ['ADMIN', 'INV_MGR', 'STORE_MGR', 'AUDITOR', 'GM'] as const,
  },
  transfer: {
    create: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR'] as const,
    ship: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR'] as const,
    receive: ['ADMIN', 'INV_MGR', 'WH_KEEPER'] as const,
    cancel: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR'] as const,
    view: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR', 'APPROVER', 'KITCHEN_CHIEF', 'PROC_OFFICER', 'AUDITOR', 'GM', 'VIEWER'] as const,
    export: ['ADMIN', 'INV_MGR', 'STORE_MGR', 'AUDITOR', 'GM'] as const,
  },
  issue: {
    create: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR', 'KITCHEN_CHIEF'] as const,
    submit: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR', 'KITCHEN_CHIEF'] as const,
    post: ['ADMIN', 'INV_MGR'] as const,
    cancel: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR', 'KITCHEN_CHIEF'] as const,
    view: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR', 'APPROVER', 'KITCHEN_CHIEF', 'PROC_OFFICER', 'AUDITOR', 'GM', 'VIEWER'] as const,
    export: ['ADMIN', 'INV_MGR', 'STORE_MGR', 'AUDITOR', 'GM'] as const,
  },
  stocktake: {
    create: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR'] as const,
    start: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR'] as const,
    count: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR'] as const,
    review: ['ADMIN', 'INV_MGR', 'STORE_MGR'] as const,
    approve: ['ADMIN', 'APPROVER', 'INV_MGR', 'STORE_MGR'] as const,
    reject: ['ADMIN', 'APPROVER', 'INV_MGR', 'STORE_MGR'] as const,
    post: ['ADMIN', 'INV_MGR'] as const,
    close: ['ADMIN', 'INV_MGR'] as const,
    view: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR', 'APPROVER', 'KITCHEN_CHIEF', 'PROC_OFFICER', 'AUDITOR', 'GM', 'VIEWER'] as const,
    export: ['ADMIN', 'INV_MGR', 'STORE_MGR', 'AUDITOR', 'GM'] as const,
  },
  kitchen_request: {
    create: ['ADMIN', 'KITCHEN_CHIEF', 'INV_MGR', 'STORE_MGR'] as const,
    submit: ['ADMIN', 'KITCHEN_CHIEF', 'INV_MGR', 'STORE_MGR'] as const,
    fulfill: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR', 'KITCHEN_CHIEF'] as const,
    cancel: ['ADMIN', 'KITCHEN_CHIEF', 'INV_MGR', 'STORE_MGR'] as const,
    view: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR', 'APPROVER', 'KITCHEN_CHIEF', 'PROC_OFFICER', 'AUDITOR', 'GM', 'VIEWER'] as const,
  },
  pr: {
    create: ['ADMIN', 'PROC_OFFICER', 'INV_MGR', 'STORE_MGR'] as const,
    submit: ['ADMIN', 'PROC_OFFICER', 'INV_MGR', 'STORE_MGR'] as const,
    approve: ['ADMIN', 'APPROVER', 'INV_MGR', 'STORE_MGR'] as const,
    reject: ['ADMIN', 'APPROVER', 'INV_MGR', 'STORE_MGR'] as const,
    cancel: ['ADMIN', 'PROC_OFFICER', 'INV_MGR', 'STORE_MGR'] as const,
    view: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR', 'APPROVER', 'KITCHEN_CHIEF', 'PROC_OFFICER', 'AUDITOR', 'GM', 'VIEWER'] as const,
  },
  po: {
    create: ['ADMIN', 'PROC_OFFICER', 'INV_MGR'] as const,
    submit: ['ADMIN', 'PROC_OFFICER', 'INV_MGR'] as const,
    approve: ['ADMIN', 'APPROVER', 'INV_MGR', 'STORE_MGR'] as const,
    reject: ['ADMIN', 'APPROVER', 'INV_MGR', 'STORE_MGR'] as const,
    cancel: ['ADMIN', 'PROC_OFFICER', 'INV_MGR'] as const,
    view: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR', 'APPROVER', 'KITCHEN_CHIEF', 'PROC_OFFICER', 'AUDITOR', 'GM', 'VIEWER'] as const,
  },
  grn: {
    create: ['ADMIN', 'WH_KEEPER', 'INV_MGR', 'STORE_MGR'] as const,
    post: ['ADMIN', 'INV_MGR'] as const,
    cancel: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR'] as const,
    view: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR', 'APPROVER', 'KITCHEN_CHIEF', 'PROC_OFFICER', 'AUDITOR', 'GM', 'VIEWER'] as const,
    export: ['ADMIN', 'INV_MGR', 'STORE_MGR', 'AUDITOR', 'GM'] as const,
  },
} as const satisfies Record<BaseDocumentType, Partial<Record<CapabilityAction, readonly UserRole[]>>>;

export type RoleCapabilities = typeof ROLE_CAPABILITIES;

/**
 * Check if a role can perform a specific action on a document type.
 */
export function canRolePerformAction(
  documentType: DocumentType,
  action: CapabilityAction,
  role: UserRole | undefined
): boolean {
  if (!role) return false;
  const normalizedType = documentType.toLowerCase() as BaseDocumentType;
  const actions = ROLE_CAPABILITIES[normalizedType];
  if (!actions) return false;
  const allowedRoles = actions[action as keyof typeof actions];
  if (!allowedRoles) return false;
  return (allowedRoles as readonly UserRole[]).includes(role);
}
