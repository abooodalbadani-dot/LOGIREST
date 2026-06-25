/**
 * Document Workflow Engine
 * Centralized logic for document status transitions and permission checks.
 */

import { DocumentStatus } from '../contracts/statuses';
import { DocumentType, BaseDocumentType } from '../contracts/role-capabilities';
import { UserRole as Role } from '../rbac';
import { ROLE_CAPABILITIES, type CapabilityAction } from '../contracts/role-capabilities';
export type { DocumentStatus, DocumentType, Role };

export type DocumentAction = 
  | 'EDIT' 
  | 'SUBMIT' 
  | 'APPROVE' 
  | 'REJECT' 
  | 'POST' 
  | 'CANCEL' 
  | 'VOID'
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
  | 'CLOSE'
  | 'RECOUNT'
  | 'DISPUTE';

import { 
  PR_STATUS, 
  PO_STATUS, 
  GRN_STATUS, 
  STOCKTAKE_STATUS, 
  TRANSFER_STATUS, 
  ISSUE_STATUS, 
  ADJUSTMENT_STATUS,
  KITCHEN_REQUEST_STATUS 
} from '../contracts/statuses';

const workflowMap: Record<BaseDocumentType, {
  pending: DocumentStatus[];
  completed: DocumentStatus[];
  approved: DocumentStatus[];
  posted: DocumentStatus[];
  locked: DocumentStatus[];
}> = {
  'pr': {
    pending: [PR_STATUS.DRAFT, PR_STATUS.SUBMITTED, PR_STATUS.REJECTED],
    completed: [PR_STATUS.APPROVED, PR_STATUS.CANCELLED, PR_STATUS.FULFILLED],
    approved: [PR_STATUS.APPROVED],
    posted: [],
    locked: [PR_STATUS.SUBMITTED, PR_STATUS.APPROVED, PR_STATUS.CANCELLED, PR_STATUS.FULFILLED]
  },
  'po': {
    pending: [PO_STATUS.DRAFT, PO_STATUS.SUBMITTED, PO_STATUS.REJECTED],
    completed: [PO_STATUS.APPROVED, PO_STATUS.FULFILLED, PO_STATUS.PARTIAL, PO_STATUS.CANCELLED],
    approved: [PO_STATUS.APPROVED],
    posted: [],
    locked: [PO_STATUS.SUBMITTED, PO_STATUS.APPROVED, PO_STATUS.FULFILLED, PO_STATUS.PARTIAL, PO_STATUS.CANCELLED]
  },
    'grn': {
    pending: [GRN_STATUS.DRAFT],
    completed: [GRN_STATUS.RECEIVED, GRN_STATUS.POSTED, GRN_STATUS.CANCELLED, GRN_STATUS.VOIDED],
    approved: [],
    posted: [GRN_STATUS.POSTED],
    locked: [GRN_STATUS.RECEIVED, GRN_STATUS.POSTED, GRN_STATUS.CANCELLED, GRN_STATUS.VOIDED]
  },
  'transfer': {
    pending: [TRANSFER_STATUS.DRAFT, TRANSFER_STATUS.IN_TRANSIT],
    completed: [TRANSFER_STATUS.RECEIVED, TRANSFER_STATUS.CANCELLED],
    approved: [],
    posted: [],
    locked: [TRANSFER_STATUS.IN_TRANSIT, TRANSFER_STATUS.RECEIVED, TRANSFER_STATUS.CANCELLED]
  },
    'issue': {
      pending: [ISSUE_STATUS.DRAFT, ISSUE_STATUS.SUBMITTED],
      completed: [ISSUE_STATUS.POSTED, ISSUE_STATUS.CANCELLED, ISSUE_STATUS.VOIDED],
      approved: [],
      posted: [ISSUE_STATUS.POSTED],
      locked: [ISSUE_STATUS.SUBMITTED, ISSUE_STATUS.POSTED, ISSUE_STATUS.CANCELLED, ISSUE_STATUS.VOIDED]
    },
    'adjustment': {
      pending: [ADJUSTMENT_STATUS.DRAFT, ADJUSTMENT_STATUS.SUBMITTED, ADJUSTMENT_STATUS.REJECTED],
      completed: [ADJUSTMENT_STATUS.POSTED, ADJUSTMENT_STATUS.CANCELLED, ADJUSTMENT_STATUS.VOIDED],
      approved: [ADJUSTMENT_STATUS.APPROVED],
      posted: [ADJUSTMENT_STATUS.POSTED],
      locked: [ADJUSTMENT_STATUS.SUBMITTED, ADJUSTMENT_STATUS.APPROVED, ADJUSTMENT_STATUS.POSTED, ADJUSTMENT_STATUS.CANCELLED, ADJUSTMENT_STATUS.VOIDED]
    },
    'stocktake': {
      pending: [STOCKTAKE_STATUS.DRAFT, STOCKTAKE_STATUS.STARTED, STOCKTAKE_STATUS.COUNTING, STOCKTAKE_STATUS.REVIEW],
      completed: [STOCKTAKE_STATUS.POSTED, STOCKTAKE_STATUS.CLOSED, STOCKTAKE_STATUS.CANCELLED, STOCKTAKE_STATUS.VOIDED],
      approved: [STOCKTAKE_STATUS.APPROVED],
      posted: [STOCKTAKE_STATUS.POSTED],
      locked: [STOCKTAKE_STATUS.STARTED, STOCKTAKE_STATUS.COUNTING, STOCKTAKE_STATUS.REVIEW, STOCKTAKE_STATUS.APPROVED, STOCKTAKE_STATUS.POSTED, STOCKTAKE_STATUS.CLOSED, STOCKTAKE_STATUS.CANCELLED, STOCKTAKE_STATUS.VOIDED]
    },
  'kitchen_request': {
    pending: [KITCHEN_REQUEST_STATUS.DRAFT, KITCHEN_REQUEST_STATUS.SUBMITTED],
    completed: [KITCHEN_REQUEST_STATUS.FULFILLED, KITCHEN_REQUEST_STATUS.CANCELLED, KITCHEN_REQUEST_STATUS.VOIDED],
    approved: [],
    posted: [],
    locked: [KITCHEN_REQUEST_STATUS.SUBMITTED, KITCHEN_REQUEST_STATUS.FULFILLED, KITCHEN_REQUEST_STATUS.CANCELLED, KITCHEN_REQUEST_STATUS.VOIDED]
  }
};


interface TransitionRule {
  targetStatus: DocumentStatus;
  allowedRoles: Role[];
}

/**
 * PHASE 2.A: Document-Type Aware Transition Map
 * Explicit, per-document workflow rules. Default Deny.
 */
const transitionMapV2: Record<BaseDocumentType, Partial<Record<DocumentStatus, Partial<Record<DocumentAction, TransitionRule>>>>> = {
  'pr': {
    [PR_STATUS.DRAFT]: {
      'SUBMIT': { targetStatus: PR_STATUS.SUBMITTED, allowedRoles: ['ADMIN', 'PROC_OFFICER', 'INV_MGR', 'BRANCH_MGR', 'PROC_MGR'] },
      'EDIT': { targetStatus: PR_STATUS.DRAFT, allowedRoles: ['ADMIN', 'PROC_OFFICER', 'INV_MGR', 'BRANCH_MGR', 'PROC_MGR'] },
      'CANCEL': { targetStatus: PR_STATUS.CANCELLED, allowedRoles: ['ADMIN', 'PROC_OFFICER', 'INV_MGR', 'BRANCH_MGR', 'PROC_MGR'] },
    },
    [PR_STATUS.SUBMITTED]: {
      'APPROVE': { targetStatus: PR_STATUS.APPROVED, allowedRoles: ['ADMIN', 'GM', 'APPROVER', 'BRANCH_MGR', 'PROC_MGR'] },
      'REJECT': { targetStatus: PR_STATUS.REJECTED, allowedRoles: ['ADMIN', 'GM', 'APPROVER', 'BRANCH_MGR', 'PROC_MGR'] },
    },
    [PR_STATUS.APPROVED]: {
      'CONVERT_TO_PO': { targetStatus: PR_STATUS.FULFILLED, allowedRoles: ['ADMIN', 'PROC_OFFICER', 'PROC_MGR', 'BRANCH_MGR'] },
    },
    [PR_STATUS.REJECTED]: {
      'EDIT': { targetStatus: PR_STATUS.DRAFT, allowedRoles: ['ADMIN', 'PROC_OFFICER', 'INV_MGR', 'BRANCH_MGR', 'PROC_MGR'] },
    }
  },
  'po': {
    [PO_STATUS.DRAFT]: {
      'SUBMIT': { targetStatus: PO_STATUS.SUBMITTED, allowedRoles: ['ADMIN', 'PROC_OFFICER', 'PROC_MGR', 'BRANCH_MGR'] },
      'EDIT': { targetStatus: PO_STATUS.DRAFT, allowedRoles: ['ADMIN', 'PROC_OFFICER', 'PROC_MGR', 'BRANCH_MGR'] },
      'CANCEL': { targetStatus: PO_STATUS.CANCELLED, allowedRoles: ['ADMIN', 'PROC_OFFICER', 'PROC_MGR', 'BRANCH_MGR'] },
    },
    [PO_STATUS.SUBMITTED]: {
      'APPROVE': { targetStatus: PO_STATUS.APPROVED, allowedRoles: ['ADMIN', 'GM', 'APPROVER', 'BRANCH_MGR', 'PROC_MGR'] },
      'REJECT': { targetStatus: PO_STATUS.REJECTED, allowedRoles: ['ADMIN', 'GM', 'APPROVER', 'BRANCH_MGR', 'PROC_MGR'] },
    },
    [PO_STATUS.APPROVED]: {
      'FULFILL': { targetStatus: PO_STATUS.FULFILLED, allowedRoles: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'PROC_MGR'] },
    },
    [PO_STATUS.PARTIAL]: {
      'FULFILL': { targetStatus: PO_STATUS.FULFILLED, allowedRoles: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'PROC_MGR'] },
    },
    [PO_STATUS.REJECTED]: {
      'EDIT': { targetStatus: PO_STATUS.DRAFT, allowedRoles: ['ADMIN', 'PROC_OFFICER', 'PROC_MGR', 'BRANCH_MGR'] },
    }
  },
  'grn': {
    [GRN_STATUS.DRAFT]: {
      'EDIT': { targetStatus: GRN_STATUS.DRAFT, allowedRoles: ['ADMIN', 'WH_KEEPER', 'INV_MGR', 'STORE_MGR', 'BRANCH_MGR'] },
      'SUBMIT': { targetStatus: GRN_STATUS.RECEIVED, allowedRoles: ['ADMIN', 'WH_KEEPER', 'INV_MGR', 'STORE_MGR', 'BRANCH_MGR'] },
      'CANCEL': { targetStatus: GRN_STATUS.CANCELLED, allowedRoles: ['ADMIN', 'WH_KEEPER', 'INV_MGR', 'STORE_MGR', 'BRANCH_MGR'] },
    },
    [GRN_STATUS.RECEIVED]: {
      'POST': { targetStatus: GRN_STATUS.POSTED, allowedRoles: ['ADMIN', 'INV_MGR', 'BRANCH_MGR'] },
      'CANCEL': { targetStatus: GRN_STATUS.CANCELLED, allowedRoles: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR', 'BRANCH_MGR'] },
    },
    [GRN_STATUS.POSTED]: {
      'VOID': { targetStatus: GRN_STATUS.VOIDED, allowedRoles: ['ADMIN'] },
    }
  },
  'transfer': {
    [TRANSFER_STATUS.DRAFT]: {
      'SHIP': { targetStatus: TRANSFER_STATUS.IN_TRANSIT, allowedRoles: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR', 'BRANCH_MGR'] },
      'CANCEL': { targetStatus: TRANSFER_STATUS.CANCELLED, allowedRoles: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR', 'BRANCH_MGR'] },
    },
    [TRANSFER_STATUS.IN_TRANSIT]: {
      'RECEIVE': { targetStatus: TRANSFER_STATUS.RECEIVED, allowedRoles: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR', 'BRANCH_MGR'] },
      'DISPUTE': { targetStatus: TRANSFER_STATUS.DISPUTED, allowedRoles: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR', 'BRANCH_MGR'] },
    },
    [TRANSFER_STATUS.DISPUTED]: {
      'RECEIVE': { targetStatus: TRANSFER_STATUS.RECEIVED, allowedRoles: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR', 'BRANCH_MGR'] },
      'CANCEL': { targetStatus: TRANSFER_STATUS.CANCELLED, allowedRoles: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR', 'BRANCH_MGR'] },
    }
  },
  'issue': {
    [ISSUE_STATUS.DRAFT]: {
      'SUBMIT': { targetStatus: ISSUE_STATUS.SUBMITTED, allowedRoles: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR', 'KITCHEN_CHIEF', 'BRANCH_MGR'] },
      'CANCEL': { targetStatus: ISSUE_STATUS.CANCELLED, allowedRoles: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR', 'KITCHEN_CHIEF', 'BRANCH_MGR'] },
    },
    [ISSUE_STATUS.SUBMITTED]: {
      'POST': { targetStatus: ISSUE_STATUS.POSTED, allowedRoles: ['ADMIN', 'INV_MGR', 'BRANCH_MGR'] },
      'CANCEL': { targetStatus: ISSUE_STATUS.CANCELLED, allowedRoles: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR', 'KITCHEN_CHIEF', 'BRANCH_MGR'] },
    },
    [ISSUE_STATUS.POSTED]: {
      'VOID': { targetStatus: ISSUE_STATUS.VOIDED, allowedRoles: ['ADMIN'] },
    }
  },
  'adjustment': {
    [ADJUSTMENT_STATUS.DRAFT]: {
      'SUBMIT': { targetStatus: ADJUSTMENT_STATUS.SUBMITTED, allowedRoles: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR', 'BRANCH_MGR'] },
      'CANCEL': { targetStatus: ADJUSTMENT_STATUS.CANCELLED, allowedRoles: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR', 'BRANCH_MGR'] },
    },
    [ADJUSTMENT_STATUS.SUBMITTED]: {
      'APPROVE': { targetStatus: ADJUSTMENT_STATUS.APPROVED, allowedRoles: ['ADMIN', 'GM', 'APPROVER', 'INV_MGR', 'STORE_MGR', 'BRANCH_MGR'] },
      'REJECT': { targetStatus: ADJUSTMENT_STATUS.REJECTED, allowedRoles: ['ADMIN', 'GM', 'APPROVER', 'INV_MGR', 'STORE_MGR', 'BRANCH_MGR'] },
      'CANCEL': { targetStatus: ADJUSTMENT_STATUS.CANCELLED, allowedRoles: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR', 'BRANCH_MGR'] },
    },
    [ADJUSTMENT_STATUS.APPROVED]: {
      'POST': { targetStatus: ADJUSTMENT_STATUS.POSTED, allowedRoles: ['ADMIN', 'INV_MGR', 'BRANCH_MGR'] },
    },
    [ADJUSTMENT_STATUS.POSTED]: {
      'VOID': { targetStatus: ADJUSTMENT_STATUS.VOIDED, allowedRoles: ['ADMIN'] },
    },
    [ADJUSTMENT_STATUS.REJECTED]: {
      'EDIT': { targetStatus: ADJUSTMENT_STATUS.DRAFT, allowedRoles: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR', 'BRANCH_MGR'] },
    }
  },
  'stocktake': {
    [STOCKTAKE_STATUS.DRAFT]: {
      'START': { targetStatus: STOCKTAKE_STATUS.STARTED, allowedRoles: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR', 'BRANCH_MGR'] },
      'CANCEL': { targetStatus: STOCKTAKE_STATUS.CANCELLED, allowedRoles: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR', 'BRANCH_MGR'] },
    },
    [STOCKTAKE_STATUS.STARTED]: {
      'COUNT': { targetStatus: STOCKTAKE_STATUS.COUNTING, allowedRoles: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR', 'BRANCH_MGR'] },
      'SUBMIT': { targetStatus: STOCKTAKE_STATUS.REVIEW, allowedRoles: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR', 'BRANCH_MGR'] },
      'CANCEL': { targetStatus: STOCKTAKE_STATUS.CANCELLED, allowedRoles: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR', 'BRANCH_MGR'] },
    },
    [STOCKTAKE_STATUS.COUNTING]: {
      'COUNT': { targetStatus: STOCKTAKE_STATUS.COUNTING, allowedRoles: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR', 'BRANCH_MGR'] },
      'SUBMIT': { targetStatus: STOCKTAKE_STATUS.REVIEW, allowedRoles: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR', 'BRANCH_MGR'] },
      'CANCEL': { targetStatus: STOCKTAKE_STATUS.CANCELLED, allowedRoles: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR', 'BRANCH_MGR'] },
    },
    [STOCKTAKE_STATUS.REVIEW]: {
      'REVIEW_VARIANCE': { targetStatus: STOCKTAKE_STATUS.REVIEW, allowedRoles: ['ADMIN', 'INV_MGR', 'STORE_MGR', 'BRANCH_MGR'] },
      'APPROVE': { targetStatus: STOCKTAKE_STATUS.APPROVED, allowedRoles: ['ADMIN', 'GM', 'APPROVER', 'INV_MGR', 'BRANCH_MGR'] },
      'REJECT': { targetStatus: STOCKTAKE_STATUS.REVIEW, allowedRoles: ['ADMIN', 'GM', 'APPROVER', 'INV_MGR', 'BRANCH_MGR'] },
      'CANCEL': { targetStatus: STOCKTAKE_STATUS.CANCELLED, allowedRoles: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR', 'BRANCH_MGR'] },
      'RECOUNT': { targetStatus: STOCKTAKE_STATUS.COUNTING, allowedRoles: ['ADMIN', 'INV_MGR'] },
    },
    [STOCKTAKE_STATUS.APPROVED]: {
      'POST': { targetStatus: STOCKTAKE_STATUS.POSTED, allowedRoles: ['ADMIN', 'INV_MGR', 'BRANCH_MGR'] },
    },
    [STOCKTAKE_STATUS.POSTED]: {
      'CLOSE': { targetStatus: STOCKTAKE_STATUS.CLOSED, allowedRoles: ['ADMIN', 'INV_MGR', 'BRANCH_MGR'] },
      'VOID': { targetStatus: STOCKTAKE_STATUS.VOIDED, allowedRoles: ['ADMIN'] },
    }
  },
  'kitchen_request': {
    [KITCHEN_REQUEST_STATUS.DRAFT]: {
      'SUBMIT': { targetStatus: KITCHEN_REQUEST_STATUS.SUBMITTED, allowedRoles: ['ADMIN', 'INV_MGR', 'BRANCH_MGR', 'STORE_MGR', 'WH_KEEPER', 'KITCHEN_CHIEF'] },
      'CANCEL': { targetStatus: KITCHEN_REQUEST_STATUS.CANCELLED, allowedRoles: ['ADMIN', 'INV_MGR', 'BRANCH_MGR', 'STORE_MGR', 'WH_KEEPER', 'KITCHEN_CHIEF'] },
    },
    [KITCHEN_REQUEST_STATUS.SUBMITTED]: {
      'FULFILL': { targetStatus: KITCHEN_REQUEST_STATUS.FULFILLED, allowedRoles: ['ADMIN', 'INV_MGR', 'BRANCH_MGR', 'STORE_MGR', 'WH_KEEPER'] },
      'CANCEL': { targetStatus: KITCHEN_REQUEST_STATUS.CANCELLED, allowedRoles: ['ADMIN', 'INV_MGR', 'BRANCH_MGR', 'STORE_MGR', 'WH_KEEPER', 'KITCHEN_CHIEF'] },
    },
    [KITCHEN_REQUEST_STATUS.FULFILLED]: {
      'VOID': { targetStatus: KITCHEN_REQUEST_STATUS.VOIDED, allowedRoles: ['ADMIN', 'INV_MGR'] },
    }
  }
};

/**
 * PHASE 2.A: canPerformActionV2
 * Default Deny, Document-Type Aware.
 * Uses ROLE_CAPABILITIES as the single source of truth for role-based checks.
 * Falls back to transitionMapV2 for workflow status checks.
 */
export function canPerformActionV2(
  documentType: DocumentType,
  status: DocumentStatus,
  action: DocumentAction,
  role?: Role | string
): boolean {
  if (!role) return false;

  const normalizedType = documentType.toLowerCase() as BaseDocumentType;
  const normalizedAction = action.toLowerCase();

  // 1. First check transitionMapV2 - status-based lock enforcement
  const typeMap = transitionMapV2[normalizedType];
  
  if (!typeMap) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[Workflow Engine] No transitions defined for DocumentType: ${documentType}`);
    }
    return false;
  }

  const statusTransitions = typeMap[status];
  if (!statusTransitions) {
    return false; // Status has no transitions defined → locked
  }

  const rule = statusTransitions[action];
  if (!rule) {
    return false; // Action not allowed in this status → locked
  }

  // 2. Then check if the user's role has the capability
  const capabilitiesKey = normalizedType === 'pr' ? 'pr'
    : normalizedType === 'po' ? 'po'
    : normalizedType === 'grn' ? 'grn'
    : normalizedType === 'kitchen_request' ? 'kitchen_request'
    : normalizedType;

  const docCapabilities = ROLE_CAPABILITIES[capabilitiesKey as keyof typeof ROLE_CAPABILITIES];
  if (docCapabilities) {
    const capabilityAction = normalizedAction === 'review_variance' ? 'review' : normalizedAction;
    const allowedRoles = docCapabilities[capabilityAction as keyof typeof docCapabilities];
    if (allowedRoles && !(allowedRoles as readonly Role[]).includes(role as Role)) {
      return false; // If the capability is defined but the user lacks the role, reject immediately
    }
  }

  // 3. Fallback to transitionMapV2 role check
  return rule.allowedRoles.includes(role as Role);
}

/**
 * Checks if a document is locked based on its status.
 * Locked documents cannot be edited.
 */
export function isDocumentLocked(type: DocumentType, status: string): boolean {
  const normalizedType = type.toLowerCase() as BaseDocumentType;
  if (normalizedType in workflowMap) {
    return workflowMap[normalizedType].locked.includes(status as DocumentStatus);
  }
  return false;
}

/**
 * Pure status helpers for metrics and analytics.
 * These are deterministic and role-independent.
 */

export function isPendingStatus(type: DocumentType, status: string): boolean {
  const normalizedType = type.toLowerCase() as BaseDocumentType;
  if (normalizedType in workflowMap) {
    return workflowMap[normalizedType].pending.includes(status as DocumentStatus);
  }
  return false;
}

export function isApprovedStatus(type: DocumentType, status: string): boolean {
  const normalizedType = type.toLowerCase() as BaseDocumentType;
  if (normalizedType in workflowMap) {
    return workflowMap[normalizedType].approved.includes(status as DocumentStatus);
  }
  return false;
}

export function isPostedStatus(type: DocumentType, status: string): boolean {
  const normalizedType = type.toLowerCase() as BaseDocumentType;
  if (normalizedType in workflowMap) {
    return workflowMap[normalizedType].posted.includes(status as DocumentStatus);
  }
  return false;
}

export function isCompletedStatus(type: DocumentType, status: string): boolean {
  const normalizedType = type.toLowerCase() as BaseDocumentType;
  if (normalizedType in workflowMap) {
    return workflowMap[normalizedType].completed.includes(status as DocumentStatus);
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
  const normalizedType = documentType.toLowerCase() as BaseDocumentType;
  return transitionMapV2[normalizedType]?.[status]?.[action]?.targetStatus || null;
}
