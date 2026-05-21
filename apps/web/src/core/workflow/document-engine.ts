/**
 * Document Workflow Engine
 * Centralized logic for document status transitions and permission checks.
 */

import { DocumentStatus } from '@/types/DocumentStatus';
import { DocumentType } from '@/types/documents';
import { UserRole as Role } from '@/types/rbac';
export type { DocumentStatus, DocumentType, Role };

export type DocumentAction = 
  | 'EDIT' 
  | 'SUBMIT' 
  | 'APPROVE' 
  | 'REJECT' 
  | 'POST' 
  | 'CANCEL' 
  | 'CONVERT_TO_PO'
  | 'VIEW'
  | 'START'
  | 'COUNT'
  | 'REVIEW_VARIANCE'
  | 'FULFILL'
  | 'DOWNLOAD_PDF'
  | 'INTERNAL_MOVEMENT'
  | 'SHIP'
  | 'RECEIVE'
  | 'CLOSE';

// Role is now imported and aliased from @/types/rbac

// DocumentType is now imported from @/types/documents

import { 
  PR_STATUS, 
  PO_STATUS, 
  GRN_STATUS, 
  STOCKTAKE_STATUS, 
  TRANSFER_STATUS, 
  ISSUE_STATUS, 
  ADJUSTMENT_STATUS,
  KITCHEN_REQUEST_STATUS 
} from '@/contracts/statuses';

const workflowMap: Record<DocumentType, {
  pending: DocumentStatus[];
  completed: DocumentStatus[];
  approved: DocumentStatus[];
  posted: DocumentStatus[];
  locked: DocumentStatus[];
}> = {
  'PR': {
    pending: [PR_STATUS.DRAFT, PR_STATUS.SUBMITTED, PR_STATUS.REJECTED],
    completed: [PR_STATUS.APPROVED, PR_STATUS.CANCELLED],
    approved: [PR_STATUS.APPROVED],
    posted: [],
    locked: [PR_STATUS.SUBMITTED, PR_STATUS.APPROVED, PR_STATUS.CANCELLED]
  },
  'PO': {
    pending: [PO_STATUS.DRAFT, PO_STATUS.SUBMITTED, PO_STATUS.REJECTED],
    completed: [PO_STATUS.APPROVED, PO_STATUS.FULFILLED, PO_STATUS.PARTIAL, PO_STATUS.CANCELLED],
    approved: [PO_STATUS.APPROVED],
    posted: [],
    locked: [PO_STATUS.SUBMITTED, PO_STATUS.APPROVED, PO_STATUS.FULFILLED, PO_STATUS.PARTIAL, PO_STATUS.CANCELLED]
  },
  'GRN': {
    pending: [GRN_STATUS.DRAFT, GRN_STATUS.RECEIVED],
    completed: [GRN_STATUS.POSTED, GRN_STATUS.CANCELLED],
    approved: [],
    posted: [GRN_STATUS.POSTED],
    locked: [GRN_STATUS.POSTED, GRN_STATUS.CANCELLED]
  },
  'TRANSFER': {
    pending: [TRANSFER_STATUS.DRAFT, TRANSFER_STATUS.IN_TRANSIT],
    completed: [TRANSFER_STATUS.RECEIVED, TRANSFER_STATUS.CANCELLED],
    approved: [],
    posted: [],
    locked: [TRANSFER_STATUS.IN_TRANSIT, TRANSFER_STATUS.RECEIVED, TRANSFER_STATUS.CANCELLED]
  },
  'ISSUE': {
    pending: [ISSUE_STATUS.DRAFT, ISSUE_STATUS.SUBMITTED],
    completed: [ISSUE_STATUS.POSTED, ISSUE_STATUS.CANCELLED],
    approved: [],
    posted: [ISSUE_STATUS.POSTED],
    locked: [ISSUE_STATUS.SUBMITTED, ISSUE_STATUS.POSTED, ISSUE_STATUS.CANCELLED]
  },
  'ADJUSTMENT': {
    pending: [ADJUSTMENT_STATUS.DRAFT, ADJUSTMENT_STATUS.SUBMITTED, ADJUSTMENT_STATUS.REJECTED],
    completed: [ADJUSTMENT_STATUS.POSTED, ADJUSTMENT_STATUS.CANCELLED],
    approved: [ADJUSTMENT_STATUS.APPROVED],
    posted: [ADJUSTMENT_STATUS.POSTED],
    locked: [ADJUSTMENT_STATUS.SUBMITTED, ADJUSTMENT_STATUS.APPROVED, ADJUSTMENT_STATUS.POSTED, ADJUSTMENT_STATUS.CANCELLED]
  },
  'STOCKTAKE': {
    pending: [STOCKTAKE_STATUS.DRAFT, STOCKTAKE_STATUS.STARTED, STOCKTAKE_STATUS.COUNTING, STOCKTAKE_STATUS.REVIEW],
    completed: [STOCKTAKE_STATUS.POSTED, STOCKTAKE_STATUS.CLOSED, STOCKTAKE_STATUS.CANCELLED],
    approved: [STOCKTAKE_STATUS.APPROVED],
    posted: [STOCKTAKE_STATUS.POSTED],
    locked: [STOCKTAKE_STATUS.STARTED, STOCKTAKE_STATUS.COUNTING, STOCKTAKE_STATUS.REVIEW, STOCKTAKE_STATUS.APPROVED, STOCKTAKE_STATUS.POSTED, STOCKTAKE_STATUS.CLOSED, STOCKTAKE_STATUS.CANCELLED]
  },
  'KITCHEN_REQUEST': {
    pending: [KITCHEN_REQUEST_STATUS.DRAFT, KITCHEN_REQUEST_STATUS.SUBMITTED],
    completed: [KITCHEN_REQUEST_STATUS.FULFILLED, KITCHEN_REQUEST_STATUS.CANCELLED],
    approved: [],
    posted: [],
    locked: [KITCHEN_REQUEST_STATUS.SUBMITTED, KITCHEN_REQUEST_STATUS.FULFILLED, KITCHEN_REQUEST_STATUS.CANCELLED]
  }
};


interface TransitionRule {
  targetStatus: DocumentStatus;
  allowedRoles: Role[];
}

// Legacy transitionMap deleted.

// Legacy canPerformAction deleted.

/**
 * PHASE 2.A: Document-Type Aware Transition Map
 * Explicit, per-document workflow rules. Default Deny.
 */
const transitionMapV2: Record<DocumentType, Partial<Record<DocumentStatus, Partial<Record<DocumentAction, TransitionRule>>>>> = {
  'PR': {
    [PR_STATUS.DRAFT]: {
      'SUBMIT': { targetStatus: PR_STATUS.SUBMITTED, allowedRoles: ['ADMIN', 'PROC_OFFICER', 'INV_MGR'] },
      'EDIT': { targetStatus: PR_STATUS.DRAFT, allowedRoles: ['ADMIN', 'PROC_OFFICER', 'INV_MGR'] },
      'CANCEL': { targetStatus: PR_STATUS.CANCELLED, allowedRoles: ['ADMIN', 'PROC_OFFICER', 'INV_MGR'] },
    },
    [PR_STATUS.SUBMITTED]: {
      'APPROVE': { targetStatus: PR_STATUS.APPROVED, allowedRoles: ['ADMIN', 'APPROVER', 'INV_MGR'] },
      'REJECT': { targetStatus: PR_STATUS.REJECTED, allowedRoles: ['ADMIN', 'APPROVER', 'INV_MGR'] },
    },
    [PR_STATUS.APPROVED]: {
      'CONVERT_TO_PO': { targetStatus: PR_STATUS.APPROVED, allowedRoles: ['ADMIN', 'PROC_OFFICER'] },
    },
    [PR_STATUS.REJECTED]: {
      'EDIT': { targetStatus: PR_STATUS.DRAFT, allowedRoles: ['ADMIN', 'PROC_OFFICER', 'INV_MGR'] },
    }
  },
  'PO': {
    [PO_STATUS.DRAFT]: {
      'SUBMIT': { targetStatus: PO_STATUS.SUBMITTED, allowedRoles: ['ADMIN', 'PROC_OFFICER', 'INV_MGR'] },
      'EDIT': { targetStatus: PO_STATUS.DRAFT, allowedRoles: ['ADMIN', 'PROC_OFFICER', 'INV_MGR'] },
      'CANCEL': { targetStatus: PO_STATUS.CANCELLED, allowedRoles: ['ADMIN', 'PROC_OFFICER', 'INV_MGR'] },
    },
    [PO_STATUS.SUBMITTED]: {
      'APPROVE': { targetStatus: PO_STATUS.APPROVED, allowedRoles: ['ADMIN', 'APPROVER', 'INV_MGR'] },
      'REJECT': { targetStatus: PO_STATUS.REJECTED, allowedRoles: ['ADMIN', 'APPROVER', 'INV_MGR'] },
    },
    [PO_STATUS.APPROVED]: {
      'FULFILL': { targetStatus: PO_STATUS.FULFILLED, allowedRoles: ['ADMIN', 'INV_MGR', 'WH_KEEPER'] },
    },
    [PO_STATUS.PARTIAL]: {
      'FULFILL': { targetStatus: PO_STATUS.FULFILLED, allowedRoles: ['ADMIN', 'INV_MGR', 'WH_KEEPER'] },
    },
    [PO_STATUS.REJECTED]: {
      'EDIT': { targetStatus: PO_STATUS.DRAFT, allowedRoles: ['ADMIN', 'PROC_OFFICER', 'INV_MGR'] },
    }
  },
  'GRN': {
    [GRN_STATUS.RECEIVED]: {
      'POST': { targetStatus: GRN_STATUS.POSTED, allowedRoles: ['ADMIN', 'INV_MGR', 'PROC_OFFICER'] },
    },
    [GRN_STATUS.DRAFT]: {
      'EDIT': { targetStatus: GRN_STATUS.DRAFT, allowedRoles: ['ADMIN', 'WH_KEEPER', 'INV_MGR', 'STORE_MGR'] },
      'CANCEL': { targetStatus: GRN_STATUS.CANCELLED, allowedRoles: ['ADMIN', 'WH_KEEPER', 'INV_MGR', 'STORE_MGR'] },
    }
  },
  'TRANSFER': {
    [TRANSFER_STATUS.DRAFT]: {
      'SHIP': { targetStatus: TRANSFER_STATUS.IN_TRANSIT, allowedRoles: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR'] },
      'CANCEL': { targetStatus: TRANSFER_STATUS.CANCELLED, allowedRoles: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR'] },
    },
    [TRANSFER_STATUS.IN_TRANSIT]: {
      'RECEIVE': { targetStatus: TRANSFER_STATUS.RECEIVED, allowedRoles: ['ADMIN', 'WH_KEEPER', 'INV_MGR'] },
    }
  },
  'ISSUE': {
    [ISSUE_STATUS.DRAFT]: {
      'SUBMIT': { targetStatus: ISSUE_STATUS.SUBMITTED, allowedRoles: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR'] },
      'CANCEL': { targetStatus: ISSUE_STATUS.CANCELLED, allowedRoles: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR'] },
    },
    [ISSUE_STATUS.SUBMITTED]: {
      'POST': { targetStatus: ISSUE_STATUS.POSTED, allowedRoles: ['ADMIN', 'INV_MGR'] },
      'CANCEL': { targetStatus: ISSUE_STATUS.CANCELLED, allowedRoles: ['ADMIN', 'INV_MGR'] },
    }
  },
  'ADJUSTMENT': {
    [ADJUSTMENT_STATUS.DRAFT]: {
      'SUBMIT': { targetStatus: ADJUSTMENT_STATUS.SUBMITTED, allowedRoles: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR'] },
      'CANCEL': { targetStatus: ADJUSTMENT_STATUS.CANCELLED, allowedRoles: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR'] },
    },
    [ADJUSTMENT_STATUS.SUBMITTED]: {
      'APPROVE': { targetStatus: ADJUSTMENT_STATUS.APPROVED, allowedRoles: ['ADMIN', 'APPROVER', 'INV_MGR', 'STORE_MGR'] },
      'REJECT': { targetStatus: ADJUSTMENT_STATUS.REJECTED, allowedRoles: ['ADMIN', 'APPROVER', 'INV_MGR'] },
      'CANCEL': { targetStatus: ADJUSTMENT_STATUS.CANCELLED, allowedRoles: ['ADMIN', 'INV_MGR'] },
    },
    [ADJUSTMENT_STATUS.APPROVED]: {
      'POST': { targetStatus: ADJUSTMENT_STATUS.POSTED, allowedRoles: ['ADMIN', 'INV_MGR'] },
    },
    [ADJUSTMENT_STATUS.REJECTED]: {
      'EDIT': { targetStatus: ADJUSTMENT_STATUS.DRAFT, allowedRoles: ['ADMIN', 'INV_MGR', 'WH_KEEPER'] },
    }
  },
  'STOCKTAKE': {
    [STOCKTAKE_STATUS.DRAFT]: {
      'START': { targetStatus: STOCKTAKE_STATUS.STARTED, allowedRoles: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR'] },
      'CANCEL': { targetStatus: STOCKTAKE_STATUS.CANCELLED, allowedRoles: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR'] },
    },
    [STOCKTAKE_STATUS.STARTED]: {
      'COUNT': { targetStatus: STOCKTAKE_STATUS.COUNTING, allowedRoles: ['ADMIN', 'INV_MGR', 'WH_KEEPER'] },
      'CANCEL': { targetStatus: STOCKTAKE_STATUS.CANCELLED, allowedRoles: ['ADMIN', 'INV_MGR'] },
    },
    [STOCKTAKE_STATUS.COUNTING]: {
      'COUNT': { targetStatus: STOCKTAKE_STATUS.COUNTING, allowedRoles: ['ADMIN', 'INV_MGR', 'WH_KEEPER'] },
      'SUBMIT': { targetStatus: STOCKTAKE_STATUS.REVIEW, allowedRoles: ['ADMIN', 'INV_MGR', 'WH_KEEPER'] },
    },
    [STOCKTAKE_STATUS.REVIEW]: {
      'REVIEW_VARIANCE': { targetStatus: STOCKTAKE_STATUS.REVIEW, allowedRoles: ['ADMIN', 'INV_MGR'] },
      'APPROVE': { targetStatus: STOCKTAKE_STATUS.APPROVED, allowedRoles: ['ADMIN', 'APPROVER', 'INV_MGR'] },
      'REJECT': { targetStatus: STOCKTAKE_STATUS.REVIEW, allowedRoles: ['ADMIN', 'APPROVER', 'INV_MGR'] },
      'CANCEL': { targetStatus: STOCKTAKE_STATUS.CANCELLED, allowedRoles: ['ADMIN', 'INV_MGR'] },
    },
    [STOCKTAKE_STATUS.APPROVED]: {
      'POST': { targetStatus: STOCKTAKE_STATUS.POSTED, allowedRoles: ['ADMIN', 'INV_MGR'] },
    },
    [STOCKTAKE_STATUS.POSTED]: {
      'CLOSE': { targetStatus: STOCKTAKE_STATUS.CLOSED, allowedRoles: ['ADMIN', 'INV_MGR'] },
    }
  },
  'KITCHEN_REQUEST': {
    [KITCHEN_REQUEST_STATUS.DRAFT]: {
      'SUBMIT': { targetStatus: KITCHEN_REQUEST_STATUS.SUBMITTED, allowedRoles: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'KITCHEN_CHIEF'] },
      'CANCEL': { targetStatus: KITCHEN_REQUEST_STATUS.CANCELLED, allowedRoles: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'KITCHEN_CHIEF'] },
    },
    [KITCHEN_REQUEST_STATUS.SUBMITTED]: {
      'FULFILL': { targetStatus: KITCHEN_REQUEST_STATUS.FULFILLED, allowedRoles: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'KITCHEN_CHIEF'] },
      'CANCEL': { targetStatus: KITCHEN_REQUEST_STATUS.CANCELLED, allowedRoles: ['ADMIN', 'INV_MGR', 'KITCHEN_CHIEF'] },
    }
  }
};

/**
 * PHASE 2.A: canPerformActionV2
 * Default Deny, Document-Type Aware.
 */
export function canPerformActionV2(
  documentType: DocumentType,
  status: DocumentStatus,
  action: DocumentAction,
  role?: Role | string
): boolean {
  const typeMap = transitionMapV2[documentType];
  
  if (!typeMap) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[Workflow Engine] No transitions defined for DocumentType: ${documentType}`);
    }
    return false;
  }

  const statusTransitions = typeMap[status];
  if (!statusTransitions) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[Workflow Engine] No transitions defined for ${documentType} at status: ${status}`);
    }
    return false;
  }

  const rule = statusTransitions[action];
  if (!rule) return false;

  if (!role) return false;

  return rule.allowedRoles.includes(role as Role);
}

/**
 * Checks if a document is locked based on its status.
 * Locked documents cannot be edited.
 */
export function isDocumentLocked(type: DocumentType, status: string): boolean {
  if (type in workflowMap) {
    return workflowMap[type].locked.includes(status as DocumentStatus);
  }
  return false;
}

/**
 * Pure status helpers for metrics and analytics.
 * These are deterministic and role-independent.
 */

export function isPendingStatus(type: DocumentType, status: string): boolean {
  if (type in workflowMap) {
    return workflowMap[type].pending.includes(status as DocumentStatus);
  }
  return false;
}

export function isApprovedStatus(type: DocumentType, status: string): boolean {
  if (type in workflowMap) {
    return workflowMap[type].approved.includes(status as DocumentStatus);
  }
  return false;
}

export function isPostedStatus(type: DocumentType, status: string): boolean {
  if (type in workflowMap) {
    return workflowMap[type].posted.includes(status as DocumentStatus);
  }
  return false;
}

export function isCompletedStatus(type: DocumentType, status: string): boolean {
  if (type in workflowMap) {
    return workflowMap[type].completed.includes(status as DocumentStatus);
  }
  return false;
}


/**
 * Gets the next status for a given action using the Document-Aware engine.
 */
export function getNextStatusV2(
  documentType: DocumentType,
  status: DocumentStatus,
  action: DocumentAction
): DocumentStatus | null {
  return transitionMapV2[documentType]?.[status]?.[action]?.targetStatus || null;
}
