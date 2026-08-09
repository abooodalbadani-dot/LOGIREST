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

export type AuthorizationType =
  | BaseDocumentType
  | 'master_item'
  | 'master_supplier'
  | 'master_org';

export type DocumentType = AuthorizationType | Uppercase<AuthorizationType>;

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
  | 'fulfill'
  | 'recount'
  | 'void';

export const ROLE_CAPABILITIES = {
  adjustment: {
    create: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR', 'BRANCH_MGR'] as const,
    submit: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR', 'BRANCH_MGR'] as const,
    approve: ['ADMIN', 'GM', 'APPROVER', 'BRANCH_MGR'] as const,
    reject: ['ADMIN', 'GM', 'APPROVER', 'BRANCH_MGR'] as const,
    post: ['ADMIN', 'INV_MGR', 'BRANCH_MGR'] as const,
    void: ['ADMIN', 'INV_MGR', 'BRANCH_MGR'] as const,
    cancel: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR', 'BRANCH_MGR'] as const,
    edit: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR', 'BRANCH_MGR'] as const,
    view: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR', 'APPROVER', 'PROC_OFFICER', 'AUDITOR', 'GM', 'VIEWER', 'BRANCH_MGR'] as const,
    export: ['ADMIN', 'INV_MGR', 'STORE_MGR', 'AUDITOR', 'GM', 'BRANCH_MGR'] as const,
  },
  transfer: {
    create: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR', 'BRANCH_MGR'] as const,
    ship: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR', 'BRANCH_MGR'] as const,
    receive: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR', 'BRANCH_MGR'] as const,
    cancel: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR', 'BRANCH_MGR'] as const,
    view: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR', 'APPROVER', 'PROC_OFFICER', 'AUDITOR', 'GM', 'VIEWER', 'BRANCH_MGR'] as const,
    export: ['ADMIN', 'INV_MGR', 'STORE_MGR', 'AUDITOR', 'GM', 'BRANCH_MGR'] as const,
  },
  issue: {
    create: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR', 'KITCHEN_CHIEF', 'BRANCH_MGR'] as const,
    submit: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR', 'KITCHEN_CHIEF', 'BRANCH_MGR'] as const,
    post: ['ADMIN', 'INV_MGR', 'BRANCH_MGR'] as const,
    void: ['ADMIN', 'INV_MGR', 'BRANCH_MGR'] as const,
    cancel: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR', 'KITCHEN_CHIEF', 'BRANCH_MGR'] as const,
    view: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR', 'APPROVER', 'KITCHEN_CHIEF', 'PROC_OFFICER', 'AUDITOR', 'GM', 'VIEWER', 'BRANCH_MGR'] as const,
    export: ['ADMIN', 'INV_MGR', 'STORE_MGR', 'AUDITOR', 'GM', 'BRANCH_MGR'] as const,
  },
  stocktake: {
    create: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR', 'BRANCH_MGR'] as const,
    start: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR', 'BRANCH_MGR'] as const,
    count: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR', 'BRANCH_MGR'] as const,
    review: ['ADMIN', 'INV_MGR', 'STORE_MGR', 'BRANCH_MGR'] as const,
    approve: ['ADMIN', 'GM', 'APPROVER', 'INV_MGR', 'BRANCH_MGR'] as const,
    reject: ['ADMIN', 'GM', 'APPROVER', 'INV_MGR', 'BRANCH_MGR'] as const,
    post: ['ADMIN', 'INV_MGR', 'BRANCH_MGR'] as const,
    void: ['ADMIN', 'INV_MGR', 'BRANCH_MGR'] as const,
    close: ['ADMIN', 'INV_MGR', 'BRANCH_MGR'] as const,
    cancel: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR', 'BRANCH_MGR'] as const,
    view: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR', 'APPROVER', 'PROC_OFFICER', 'AUDITOR', 'GM', 'VIEWER', 'BRANCH_MGR'] as const,
    export: ['ADMIN', 'INV_MGR', 'STORE_MGR', 'AUDITOR', 'GM', 'BRANCH_MGR'] as const,
    recount: ['ADMIN', 'INV_MGR'] as const,
  },
  kitchen_request: {
    create: ['ADMIN', 'BRANCH_MGR', 'STORE_MGR', 'KITCHEN_CHIEF'] as const,
    submit: ['ADMIN', 'BRANCH_MGR', 'STORE_MGR', 'KITCHEN_CHIEF'] as const,
    fulfill: ['ADMIN', 'INV_MGR', 'BRANCH_MGR', 'STORE_MGR', 'WH_KEEPER'] as const,
    cancel: ['ADMIN', 'INV_MGR', 'BRANCH_MGR', 'STORE_MGR', 'WH_KEEPER', 'KITCHEN_CHIEF'] as const,
    view: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR', 'APPROVER', 'KITCHEN_CHIEF', 'PROC_OFFICER', 'AUDITOR', 'GM', 'VIEWER', 'BRANCH_MGR'] as const,
  },
  pr: {
    create: ['ADMIN', 'PROC_OFFICER', 'INV_MGR', 'BRANCH_MGR', 'PROC_MGR'] as const,
    submit: ['ADMIN', 'PROC_OFFICER', 'INV_MGR', 'BRANCH_MGR', 'PROC_MGR'] as const,
    approve: ['ADMIN', 'GM', 'APPROVER', 'BRANCH_MGR', 'PROC_MGR'] as const,
    reject: ['ADMIN', 'GM', 'APPROVER', 'BRANCH_MGR', 'PROC_MGR'] as const,
    cancel: ['ADMIN', 'PROC_OFFICER', 'INV_MGR', 'BRANCH_MGR', 'PROC_MGR'] as const,
    view: ['ADMIN', 'INV_MGR', 'STORE_MGR', 'APPROVER', 'PROC_OFFICER', 'AUDITOR', 'GM', 'VIEWER', 'BRANCH_MGR', 'PROC_MGR'] as const,
  },
  po: {
    create: ['ADMIN', 'PROC_OFFICER', 'PROC_MGR', 'BRANCH_MGR'] as const,
    submit: ['ADMIN', 'PROC_OFFICER', 'PROC_MGR', 'BRANCH_MGR'] as const,
    approve: ['ADMIN', 'GM', 'APPROVER', 'BRANCH_MGR', 'PROC_MGR'] as const,
    reject: ['ADMIN', 'GM', 'APPROVER', 'BRANCH_MGR', 'PROC_MGR'] as const,
    cancel: ['ADMIN', 'PROC_OFFICER', 'PROC_MGR', 'BRANCH_MGR'] as const,
    fulfill: ['ADMIN', 'WH_KEEPER', 'INV_MGR', 'BRANCH_MGR'] as const,
    view: ['ADMIN', 'INV_MGR', 'STORE_MGR', 'APPROVER', 'PROC_OFFICER', 'AUDITOR', 'GM', 'VIEWER', 'BRANCH_MGR', 'PROC_MGR'] as const,
  },
  grn: {
    create: ['ADMIN', 'WH_KEEPER', 'INV_MGR', 'STORE_MGR', 'BRANCH_MGR'] as const,
    submit: ['ADMIN', 'WH_KEEPER', 'INV_MGR', 'STORE_MGR', 'BRANCH_MGR'] as const,
    post: ['ADMIN', 'INV_MGR', 'BRANCH_MGR'] as const,
    void: ['ADMIN', 'INV_MGR', 'BRANCH_MGR'] as const,
    cancel: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR', 'BRANCH_MGR'] as const,
    view: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR', 'APPROVER', 'PROC_OFFICER', 'AUDITOR', 'GM', 'VIEWER', 'BRANCH_MGR', 'PROC_MGR'] as const,
    export: ['ADMIN', 'INV_MGR', 'STORE_MGR', 'AUDITOR', 'GM', 'BRANCH_MGR', 'PROC_MGR'] as const,
  },
  master_item: {
    create: ['ADMIN', 'INV_MGR'] as const,
    edit: ['ADMIN', 'INV_MGR'] as const,
    cancel: ['ADMIN', 'INV_MGR'] as const,
    view: ['ADMIN', 'GM', 'INV_MGR', 'STORE_MGR', 'BRANCH_MGR', 'PROC_MGR', 'PROC_OFFICER', 'WH_KEEPER', 'KITCHEN_CHIEF', 'AUDITOR', 'VIEWER', 'APPROVER'] as const,
  },
  master_supplier: {
    create: ['ADMIN', 'PROC_MGR'] as const,
    edit: ['ADMIN', 'PROC_MGR'] as const,
    cancel: ['ADMIN', 'PROC_MGR'] as const,
    view: ['ADMIN', 'GM', 'INV_MGR', 'STORE_MGR', 'BRANCH_MGR', 'PROC_MGR', 'PROC_OFFICER', 'WH_KEEPER', 'AUDITOR', 'VIEWER', 'APPROVER'] as const,
  },
  master_org: {
    create: ['ADMIN'] as const,
    edit: ['ADMIN'] as const,
    cancel: ['ADMIN'] as const,
    view: ['ADMIN', 'GM', 'INV_MGR', 'STORE_MGR', 'BRANCH_MGR', 'PROC_MGR', 'PROC_OFFICER', 'WH_KEEPER', 'KITCHEN_CHIEF', 'AUDITOR', 'VIEWER', 'APPROVER'] as const,
  },
} as const satisfies Record<AuthorizationType, Partial<Record<CapabilityAction, readonly UserRole[]>>>;

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
  const normalizedType = documentType.toLowerCase() as AuthorizationType;
  const actions = ROLE_CAPABILITIES[normalizedType];
  if (!actions) return false;
  const allowedRoles = actions[action as keyof typeof actions];
  if (!allowedRoles) return false;
  return (allowedRoles as readonly UserRole[]).includes(role);
}

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

export interface RoleDescriptor {
  id: UserRole;
  displayName: string;
  description: string;
  userCount: number;
  permissions: Permission[];
}

export const ROLE_METADATA: Record<UserRole, { displayName: string; description: string }> = {
  ADMIN: {
    displayName: 'Administrator',
    description: 'Full system access with immutable security protocols',
  },
  GM: {
    displayName: 'General Manager',
    description: 'Cross-branch operational visibility and system oversight',
  },
  INV_MGR: {
    displayName: 'Inventory Manager',
    description: 'Manages stock levels, adjustments and stocktake workflows',
  },
  WH_KEEPER: {
    displayName: 'Warehouse Keeper',
    description: 'Operational execution of transfers and goods receiving',
  },
  PROC_OFFICER: {
    displayName: 'Procurement Officer',
    description: 'Handles purchase requests and order cycles',
  },
  APPROVER: {
    displayName: 'Executive Approver',
    description: 'Strategic approval authority for procurement and financial documents',
  },
  AUDITOR: {
    displayName: 'System Auditor',
    description: 'Read-only access to all modules for compliance tracking',
  },
  VIEWER: {
    displayName: 'System Viewer',
    description: 'Read-only access to basic dashboards and operational modules',
  },
  KITCHEN_CHIEF: {
    displayName: 'Kitchen Chief',
    description: 'Manages kitchen-level requests and direct consumption issues',
  },
  STORE_MGR: {
    displayName: 'Store Manager',
    description: 'Branch-level operational management and cost analysis',
  },
  BRANCH_MGR: {
    displayName: 'Branch Manager',
    description: 'Full operational and approval authority for all warehouses in a branch',
  },
  PROC_MGR: {
    displayName: 'Procurement Manager',
    description: 'Manages suppliers, FX rates, and purchase lifecycle across the organization',
  },
};

