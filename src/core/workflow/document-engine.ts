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
  | 'RECEIVE';

// Role is now imported and aliased from @/types/rbac

// DocumentType is now imported from @/types/documents

const workflowMap: Record<DocumentType, {
  pending: DocumentStatus[];
  completed: DocumentStatus[];
  approved: DocumentStatus[];
  posted: DocumentStatus[];
  locked: DocumentStatus[];
}> = {
  'PR': {
    pending: ['DRAFT', 'SUBMITTED', 'REJECTED'],
    completed: ['APPROVED', 'CANCELLED'],
    approved: ['APPROVED'],
    posted: [],
    locked: ['SUBMITTED', 'APPROVED', 'CANCELLED']
  },
  'PO': {
    pending: ['DRAFT', 'SUBMITTED', 'REJECTED'],
    completed: ['APPROVED', 'FULFILLED', 'PARTIAL', 'CANCELLED'],
    approved: ['APPROVED'],
    posted: [],
    locked: ['SUBMITTED', 'APPROVED', 'FULFILLED', 'PARTIAL', 'CANCELLED']
  },
  'GRN': {
    pending: ['DRAFT', 'RECEIVED'],
    completed: ['POSTED', 'CANCELLED'],
    approved: [],
    posted: ['POSTED'],
    locked: ['POSTED', 'CANCELLED']
  },
  'TRANSFER': {
    pending: ['DRAFT', 'IN_TRANSIT'],
    completed: ['RECEIVED', 'CANCELLED'],
    approved: [],
    posted: [],
    locked: ['IN_TRANSIT', 'RECEIVED', 'CANCELLED']
  },
  'ISSUE': {
    pending: ['DRAFT', 'SUBMITTED'],
    completed: ['POSTED', 'CANCELLED'],
    approved: [],
    posted: ['POSTED'],
    locked: ['SUBMITTED', 'POSTED', 'CANCELLED']
  },
  'ADJUSTMENT': {
    pending: ['DRAFT', 'SUBMITTED', 'REJECTED'],
    completed: ['POSTED', 'CANCELLED'],
    approved: ['APPROVED'],
    posted: ['POSTED'],
    locked: ['SUBMITTED', 'APPROVED', 'POSTED', 'CANCELLED']
  },
  'STOCKTAKE': {
    pending: ['DRAFT', 'STARTED', 'COUNTING', 'VARIANCE_SUBMITTED', 'REJECTED'],
    completed: ['POSTED', 'CANCELLED'],
    approved: ['APPROVED'],
    posted: ['POSTED'],
    locked: ['STARTED', 'COUNTING', 'VARIANCE_SUBMITTED', 'APPROVED', 'POSTED', 'CANCELLED']
  },
  'KITCHEN_REQUEST': {
    pending: ['DRAFT', 'SUBMITTED'],
    completed: ['FULFILLED', 'CANCELLED'],
    approved: [],
    posted: [],
    locked: ['SUBMITTED', 'FULFILLED', 'CANCELLED']
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
    'DRAFT': {
      'SUBMIT': { targetStatus: 'SUBMITTED', allowedRoles: ['ADMIN', 'PROC_OFFICER', 'INV_MGR'] },
      'EDIT': { targetStatus: 'DRAFT', allowedRoles: ['ADMIN', 'PROC_OFFICER', 'INV_MGR'] },
      'CANCEL': { targetStatus: 'CANCELLED', allowedRoles: ['ADMIN', 'PROC_OFFICER', 'INV_MGR'] },
    },
    'SUBMITTED': {
      'APPROVE': { targetStatus: 'APPROVED', allowedRoles: ['ADMIN', 'APPROVER', 'INV_MGR'] },
      'REJECT': { targetStatus: 'REJECTED', allowedRoles: ['ADMIN', 'APPROVER', 'INV_MGR'] },
    },
    'APPROVED': {
      'CONVERT_TO_PO': { targetStatus: 'APPROVED', allowedRoles: ['ADMIN', 'PROC_OFFICER'] },
    },
    'REJECTED': {
      'EDIT': { targetStatus: 'DRAFT', allowedRoles: ['ADMIN', 'PROC_OFFICER', 'INV_MGR'] },
    }
  },
  'PO': {
    'DRAFT': {
      'SUBMIT': { targetStatus: 'SUBMITTED', allowedRoles: ['ADMIN', 'PROC_OFFICER', 'INV_MGR'] },
      'EDIT': { targetStatus: 'DRAFT', allowedRoles: ['ADMIN', 'PROC_OFFICER', 'INV_MGR'] },
      'CANCEL': { targetStatus: 'CANCELLED', allowedRoles: ['ADMIN', 'PROC_OFFICER', 'INV_MGR'] },
    },
    'SUBMITTED': {
      'APPROVE': { targetStatus: 'APPROVED', allowedRoles: ['ADMIN', 'APPROVER', 'INV_MGR'] },
      'REJECT': { targetStatus: 'REJECTED', allowedRoles: ['ADMIN', 'APPROVER', 'INV_MGR'] },
    },
    'APPROVED': {
      'FULFILL': { targetStatus: 'FULFILLED', allowedRoles: ['ADMIN', 'INV_MGR', 'WH_KEEPER'] },
    },
    'PARTIAL': {
      'FULFILL': { targetStatus: 'FULFILLED', allowedRoles: ['ADMIN', 'INV_MGR', 'WH_KEEPER'] },
    },
    'REJECTED': {
      'EDIT': { targetStatus: 'DRAFT', allowedRoles: ['ADMIN', 'PROC_OFFICER', 'INV_MGR'] },
    }
  },
  'GRN': {
    'RECEIVED': {
      'POST': { targetStatus: 'POSTED', allowedRoles: ['ADMIN', 'INV_MGR', 'PROC_OFFICER'] },
    },
    'DRAFT': {
      'EDIT': { targetStatus: 'DRAFT', allowedRoles: ['ADMIN', 'WH_KEEPER', 'INV_MGR'] },
      'CANCEL': { targetStatus: 'CANCELLED', allowedRoles: ['ADMIN', 'WH_KEEPER', 'INV_MGR'] },
    }
  },
  'TRANSFER': {
    'DRAFT': {
      'SHIP': { targetStatus: 'IN_TRANSIT', allowedRoles: ['ADMIN', 'INV_MGR', 'WH_KEEPER'] },
      'CANCEL': { targetStatus: 'CANCELLED', allowedRoles: ['ADMIN', 'INV_MGR', 'WH_KEEPER'] },
    },
    'IN_TRANSIT': {
      'RECEIVE': { targetStatus: 'RECEIVED', allowedRoles: ['ADMIN', 'WH_KEEPER', 'INV_MGR'] },
    }
  },
  'ISSUE': {
    'DRAFT': {
      'SUBMIT': { targetStatus: 'SUBMITTED', allowedRoles: ['ADMIN', 'INV_MGR', 'WH_KEEPER'] },
      'CANCEL': { targetStatus: 'CANCELLED', allowedRoles: ['ADMIN', 'INV_MGR', 'WH_KEEPER'] },
    },
    'SUBMITTED': {
      'POST': { targetStatus: 'POSTED', allowedRoles: ['ADMIN', 'INV_MGR'] },
      'CANCEL': { targetStatus: 'CANCELLED', allowedRoles: ['ADMIN', 'INV_MGR'] },
    }
  },
  'ADJUSTMENT': {
    'DRAFT': {
      'SUBMIT': { targetStatus: 'SUBMITTED', allowedRoles: ['ADMIN', 'INV_MGR', 'WH_KEEPER'] },
      'CANCEL': { targetStatus: 'CANCELLED', allowedRoles: ['ADMIN', 'INV_MGR', 'WH_KEEPER'] },
    },
    'SUBMITTED': {
      'APPROVE': { targetStatus: 'APPROVED', allowedRoles: ['ADMIN', 'APPROVER', 'INV_MGR'] },
      'REJECT': { targetStatus: 'REJECTED', allowedRoles: ['ADMIN', 'APPROVER', 'INV_MGR'] },
      'CANCEL': { targetStatus: 'CANCELLED', allowedRoles: ['ADMIN', 'INV_MGR'] },
    },
    'APPROVED': {
      'POST': { targetStatus: 'POSTED', allowedRoles: ['ADMIN', 'INV_MGR'] },
    }
  },
  'STOCKTAKE': {
    'DRAFT': {
      'START': { targetStatus: 'STARTED', allowedRoles: ['ADMIN', 'INV_MGR', 'WH_KEEPER'] },
      'CANCEL': { targetStatus: 'CANCELLED', allowedRoles: ['ADMIN', 'INV_MGR', 'WH_KEEPER'] },
    },
    'STARTED': {
      'COUNT': { targetStatus: 'COUNTING', allowedRoles: ['ADMIN', 'INV_MGR', 'WH_KEEPER'] },
      'CANCEL': { targetStatus: 'CANCELLED', allowedRoles: ['ADMIN', 'INV_MGR'] },
    },
    'COUNTING': {
      'COUNT': { targetStatus: 'COUNTING', allowedRoles: ['ADMIN', 'INV_MGR', 'WH_KEEPER'] },
      'SUBMIT': { targetStatus: 'VARIANCE_SUBMITTED', allowedRoles: ['ADMIN', 'INV_MGR', 'WH_KEEPER'] },
    },
    'VARIANCE_SUBMITTED': {
      'REVIEW_VARIANCE': { targetStatus: 'VARIANCE_SUBMITTED', allowedRoles: ['ADMIN', 'INV_MGR'] },
      'APPROVE': { targetStatus: 'APPROVED', allowedRoles: ['ADMIN', 'APPROVER', 'INV_MGR'] },
      'REJECT': { targetStatus: 'REJECTED', allowedRoles: ['ADMIN', 'APPROVER', 'INV_MGR'] },
      'CANCEL': { targetStatus: 'CANCELLED', allowedRoles: ['ADMIN', 'INV_MGR'] },
    },
    'APPROVED': {
      'POST': { targetStatus: 'POSTED', allowedRoles: ['ADMIN', 'INV_MGR'] },
    }
  },
  'KITCHEN_REQUEST': {
    'DRAFT': {
      'SUBMIT': { targetStatus: 'SUBMITTED', allowedRoles: ['ADMIN', 'INV_MGR', 'WH_KEEPER'] },
      'CANCEL': { targetStatus: 'CANCELLED', allowedRoles: ['ADMIN', 'INV_MGR', 'WH_KEEPER'] },
    },
    'SUBMITTED': {
      'FULFILL': { targetStatus: 'FULFILLED', allowedRoles: ['ADMIN', 'INV_MGR', 'WH_KEEPER'] },
      'CANCEL': { targetStatus: 'CANCELLED', allowedRoles: ['ADMIN', 'INV_MGR'] },
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

  if (role) {
    return rule.allowedRoles.includes(role as Role);
  }

  return true;
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
