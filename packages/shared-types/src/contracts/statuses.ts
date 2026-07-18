/**
 * Centralized Domain Statuses
 * These constants represent the definitive statuses for each document domain.
 */

export const PR_STATUS = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
  FULFILLED: 'FULFILLED',
} as const;

export type PRStatus = typeof PR_STATUS[keyof typeof PR_STATUS];
export const ALL_PR_STATUSES = ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'CANCELLED', 'FULFILLED'] as const;

export const PO_STATUS = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
  PARTIAL: 'PARTIAL',
  FULFILLED: 'FULFILLED',
} as const;

export type POStatus = typeof PO_STATUS[keyof typeof PO_STATUS];
export const ALL_PO_STATUSES = ['DRAFT', 'SUBMITTED', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'CANCELLED', 'PARTIAL', 'FULFILLED'] as const;

export const GRN_STATUS = {
  DRAFT: 'DRAFT',
  RECEIVED: 'RECEIVED',
  POSTED: 'POSTED',
  CANCELLED: 'CANCELLED',
  VOIDED: 'VOIDED',
} as const;

export type GRNStatus = typeof GRN_STATUS[keyof typeof GRN_STATUS];
export const ALL_GRN_STATUSES = ['DRAFT', 'RECEIVED', 'POSTED', 'CANCELLED', 'VOIDED'] as const;

export const STOCKTAKE_STATUS = {
  DRAFT: 'DRAFT',
  STARTED: 'STARTED',
  COUNTING: 'COUNTING',
  REVIEW: 'REVIEW',
  APPROVED: 'APPROVED',
  POSTED: 'POSTED',
  CLOSED: 'CLOSED',
  CANCELLED: 'CANCELLED',
  VOIDED: 'VOIDED',
} as const;

export type StocktakeStatus = typeof STOCKTAKE_STATUS[keyof typeof STOCKTAKE_STATUS];
export const ALL_STOCKTAKE_STATUSES = ['DRAFT', 'STARTED', 'COUNTING', 'REVIEW', 'APPROVED', 'POSTED', 'CLOSED', 'CANCELLED', 'VOIDED'] as const;

export const TRANSFER_STATUS = {
  DRAFT: 'DRAFT',
  IN_TRANSIT: 'IN_TRANSIT',
  RECEIVED: 'RECEIVED',
  DISPUTED: 'DISPUTED',
  POSTED: 'POSTED',
  CANCELLED: 'CANCELLED',
  VOIDED: 'VOIDED',
} as const;

export type TransferStatus = typeof TRANSFER_STATUS[keyof typeof TRANSFER_STATUS];
export const ALL_TRANSFER_STATUSES = ['DRAFT', 'IN_TRANSIT', 'RECEIVED', 'DISPUTED', 'POSTED', 'CANCELLED', 'VOIDED'] as const;

export const ISSUE_STATUS = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  POSTED: 'POSTED',
  CANCELLED: 'CANCELLED',
  VOIDED: 'VOIDED',
} as const;

export type IssueStatus = typeof ISSUE_STATUS[keyof typeof ISSUE_STATUS];
export const ALL_ISSUE_STATUSES = ['DRAFT', 'SUBMITTED', 'POSTED', 'CANCELLED', 'VOIDED'] as const;

export const ADJUSTMENT_STATUS = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  POSTED: 'POSTED',
  CANCELLED: 'CANCELLED',
  VOIDED: 'VOIDED',
} as const;

export type AdjustmentStatus = typeof ADJUSTMENT_STATUS[keyof typeof ADJUSTMENT_STATUS];
export const ALL_ADJUSTMENT_STATUSES = ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'POSTED', 'CANCELLED', 'VOIDED'] as const;

export const KITCHEN_REQUEST_STATUS = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  FULFILLED: 'FULFILLED',
  CANCELLED: 'CANCELLED',
  VOIDED: 'VOIDED',
} as const;

export type KitchenRequestStatus = typeof KITCHEN_REQUEST_STATUS[keyof typeof KITCHEN_REQUEST_STATUS];
export const ALL_KITCHEN_REQUEST_STATUSES = ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'FULFILLED', 'CANCELLED', 'VOIDED'] as const;

/**
 * Union of all possible document statuses (Static Tuple for Zod)
 */
export const ALL_STATUSES = [
  'DRAFT',
  'SUBMITTED',
  'PENDING_APPROVAL',
  'APPROVED',
  'REJECTED',
  'POSTED',
  'CANCELLED',
  'RECEIVED',
  'FULFILLED',
  'PARTIAL',
  'STARTED',
  'COUNTING',
  'IN_TRANSIT',
  'DISPUTED',
  'OPEN',
  'VOIDED',
  'REVIEW',
  'CLOSED',
  'VARIANCE_SUBMITTED',
  'COUNTING_COMPLETED',
  'ACTIVE',
  'INACTIVE',
] as const;

export type DocumentStatus = typeof ALL_STATUSES[number];

/**
 * Exhaustive check helper
 */
export function assertNever(x: never): never {
  throw new Error(`Unexpected status: ${x}`);
}
