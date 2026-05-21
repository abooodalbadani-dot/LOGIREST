import { 
  ISSUE_STATUS, 
  STOCKTAKE_STATUS, 
  TRANSFER_STATUS, 
  PR_STATUS,
  PO_STATUS,
  GRN_STATUS,
  ADJUSTMENT_STATUS,
} from '@logirest/shared-types';
import { isDocumentLocked as engineIsDocumentLocked, DocumentType } from '@logirest/shared-types';

/**
 * Issue Guards
 */
export const isIssuePosted = (status?: string | null): boolean => 
  status === ISSUE_STATUS.POSTED;

export const isIssueDraft = (status?: string | null): boolean => 
  status === ISSUE_STATUS.DRAFT;

/**
 * Stocktake Guards
 */
export const canStartStocktake = (status?: string | null): boolean => 
  status === STOCKTAKE_STATUS.DRAFT;

export const isStocktakeCounting = (status?: string | null): boolean => 
  status === STOCKTAKE_STATUS.COUNTING;

export const isStocktakeInReview = (status?: string | null): boolean => 
  status === STOCKTAKE_STATUS.REVIEW;

export const isStocktakeApproved = (status?: string | null): boolean => 
  status === STOCKTAKE_STATUS.APPROVED;

export const isStocktakeDraft = (status?: string | null): boolean => 
  status === STOCKTAKE_STATUS.DRAFT;

export const isStocktakePosted = (status?: string | null): boolean =>
  status === STOCKTAKE_STATUS.POSTED;

export const isStocktakeClosed = (status?: string | null): boolean =>
  status === STOCKTAKE_STATUS.CLOSED;

export const isStocktakeInProgress = (status?: string | null): boolean => 
  !!status && ([STOCKTAKE_STATUS.STARTED, STOCKTAKE_STATUS.COUNTING, STOCKTAKE_STATUS.REVIEW] as string[]).includes(status);

/**
 * Transfer Guards
 */
export const isTransferInTransit = (status?: string | null): boolean => 
  status === TRANSFER_STATUS.IN_TRANSIT;

export const isTransferPosted = (status?: string | null): boolean => 
  status === TRANSFER_STATUS.POSTED;

/**
 * Adjustment Guards
 */
export const isAdjustmentDraft = (status?: string | null): boolean =>
  status === ADJUSTMENT_STATUS.DRAFT;

export const isAdjustmentPosted = (status?: string | null): boolean =>
  status === ADJUSTMENT_STATUS.POSTED;

export const isAdjustmentPending = (status?: string | null): boolean =>
  status === ADJUSTMENT_STATUS.SUBMITTED;

/**
 * PR/PO/GRN Guards
 */
export const isPRDraft = (status?: string | null): boolean => status === PR_STATUS.DRAFT;
export const isPODraft = (status?: string | null): boolean => status === PO_STATUS.DRAFT;
export const isGRNDraft = (status?: string | null): boolean => status === GRN_STATUS.DRAFT;

/**
 * Generic & Workflow Guards
 */
export const isDraft = (status?: string | null): boolean => 
  status === 'DRAFT';

export const isPosted = (status?: string | null): boolean => 
  status === 'POSTED';

/**
 * Wraps the document engine's lock logic with a simpler domain interface.
 */
export const isLocked = (type: DocumentType, status?: string | null): boolean => {
  if (!status) return false;
  return engineIsDocumentLocked(type, status);
};
