import { UserRole } from '@/providers/AuthProvider';
import { PRStatus, POStatus, GRNStatus } from '@/features/purchasing/types';

export type DocumentType = 
  | 'PURCHASE_REQUEST'
  | 'PURCHASE_ORDER'
  | 'GOODS_RECEIPT'
  | 'STOCKTAKE'
  | 'ADJUSTMENT'
  | 'ISSUE'
  | 'TRANSFER'
  | 'KITCHEN_REQUEST';

export type DocumentStatus = 
  | PRStatus 
  | POStatus 
  | GRNStatus 
  | string; // Allowing string for other features not yet refactored

export type DocumentAction = 
  | 'SUBMIT'
  | 'APPROVE'
  | 'REJECT'
  | 'POST'
  | 'CANCEL'
  | 'EDIT'
  | 'DELETE'
  | 'VIEW';

export interface WorkflowTransition {
  from: DocumentStatus;
  to: DocumentStatus;
  action: DocumentAction;
  allowedRoles: UserRole[];
}

/**
 * Standardized Document Workflow Engine
 * Centralizes all status transitions and permission checks.
 */
export const DOCUMENT_WORKFLOW_CONFIG: Record<DocumentType, {
  transitions: WorkflowTransition[];
  lockedStatuses: DocumentStatus[];
}> = {
  PURCHASE_REQUEST: {
    lockedStatuses: ['SUBMITTED', 'APPROVED', 'REJECTED'],
    transitions: [
      { from: 'DRAFT', to: 'SUBMITTED', action: 'SUBMIT', allowedRoles: ['PROC_OFFICER', 'ADMIN', 'STORE_MGR', 'KITCHEN_CHIEF'] },
      { from: 'SUBMITTED', to: 'APPROVED', action: 'APPROVE', allowedRoles: ['APPROVER', 'GM', 'ADMIN'] },
      { from: 'SUBMITTED', to: 'REJECTED', action: 'REJECT', allowedRoles: ['APPROVER', 'GM', 'ADMIN'] },
      { from: 'DRAFT', to: 'DRAFT', action: 'EDIT', allowedRoles: ['PROC_OFFICER', 'ADMIN', 'STORE_MGR', 'KITCHEN_CHIEF'] },
      { from: 'DRAFT', to: 'DRAFT', action: 'DELETE', allowedRoles: ['PROC_OFFICER', 'ADMIN', 'STORE_MGR', 'KITCHEN_CHIEF'] },
    ]
  },
  PURCHASE_ORDER: {
    lockedStatuses: ['SUBMITTED', 'APPROVED', 'REJECTED'],
    transitions: [
      { from: 'DRAFT', to: 'SUBMITTED', action: 'SUBMIT', allowedRoles: ['PROC_OFFICER', 'ADMIN'] },
      { from: 'SUBMITTED', to: 'APPROVED', action: 'APPROVE', allowedRoles: ['APPROVER', 'GM', 'ADMIN'] },
      { from: 'SUBMITTED', to: 'REJECTED', action: 'REJECT', allowedRoles: ['APPROVER', 'GM', 'ADMIN'] },
    ]
  },
  GOODS_RECEIPT: {
    lockedStatuses: ['POSTED', 'CANCELLED'],
    transitions: [
      { from: 'DRAFT', to: 'RECEIVED', action: 'SUBMIT', allowedRoles: ['WH_KEEPER', 'ADMIN'] },
      { from: 'RECEIVED', to: 'POSTED', action: 'POST', allowedRoles: ['INV_MGR', 'ADMIN'] },
      { from: 'DRAFT', to: 'CANCELLED', action: 'CANCEL', allowedRoles: ['WH_KEEPER', 'ADMIN'] },
    ]
  },
  // Default configurations for other types to be expanded
  STOCKTAKE: {
    lockedStatuses: ['POSTED', 'APPROVED'],
    transitions: []
  },
  ADJUSTMENT: {
    lockedStatuses: ['POSTED', 'APPROVED'],
    transitions: []
  },
  ISSUE: {
    lockedStatuses: ['POSTED', 'CANCELLED'],
    transitions: []
  },
  TRANSFER: {
    lockedStatuses: ['POSTED', 'CANCELLED'],
    transitions: []
  },
  KITCHEN_REQUEST: {
    lockedStatuses: ['APPROVED', 'REJECTED'],
    transitions: []
  }
};

/**
 * Checks if a document is locked based on its status.
 * Locked documents cannot be edited or deleted.
 */
export function isDocumentLocked(type: DocumentType, status: DocumentStatus): boolean {
  const config = DOCUMENT_WORKFLOW_CONFIG[type];
  if (!config) return false;
  return config.lockedStatuses.includes(status);
}

/**
 * Validates if a user can perform a specific action on a document.
 */
export function canPerformAction(
  type: DocumentType,
  currentStatus: DocumentStatus,
  action: DocumentAction,
  userRole?: UserRole
): boolean {
  if (!userRole) return false;

  // Global ADMIN override for VIEW and some actions if needed
  if (userRole === 'ADMIN' && action === 'VIEW') return true;

  const config = DOCUMENT_WORKFLOW_CONFIG[type];
  if (!config) return false;

  // Handle simple EDIT/DELETE checks based on lock status if not explicitly in transitions
  if (action === 'EDIT' || action === 'DELETE') {
    if (isDocumentLocked(type, currentStatus)) return false;
    // Check if there's a specific transition for this action
    const transition = config.transitions.find(t => t.action === action);
    if (transition) return transition.allowedRoles.includes(userRole);
    // Fallback: If not locked, allow those who can SUBMIT to also EDIT
    const submitTransition = config.transitions.find(t => t.action === 'SUBMIT');
    return submitTransition?.allowedRoles.includes(userRole) ?? false;
  }

  const transition = config.transitions.find(
    t => t.from === currentStatus && t.action === action
  );

  if (!transition) return false;

  return transition.allowedRoles.includes(userRole);
}
