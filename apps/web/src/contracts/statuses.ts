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

export const PO_STATUS = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
  PARTIAL: 'PARTIAL',
  FULFILLED: 'FULFILLED',
} as const;

export type POStatus = typeof PO_STATUS[keyof typeof PO_STATUS];

export const GRN_STATUS = {
  DRAFT: 'DRAFT',
  RECEIVED: 'RECEIVED',
  POSTED: 'POSTED',
  CANCELLED: 'CANCELLED',
} as const;

export type GRNStatus = typeof GRN_STATUS[keyof typeof GRN_STATUS];

export const STOCKTAKE_STATUS = {
  DRAFT: 'DRAFT',
  STARTED: 'STARTED',
  COUNTING: 'COUNTING',
  REVIEW: 'REVIEW',
  APPROVED: 'APPROVED',
  POSTED: 'POSTED',
  CLOSED: 'CLOSED',
  CANCELLED: 'CANCELLED',
} as const;

export type StocktakeStatus = typeof STOCKTAKE_STATUS[keyof typeof STOCKTAKE_STATUS];

export const TRANSFER_STATUS = {
  DRAFT: 'DRAFT',
  IN_TRANSIT: 'IN_TRANSIT',
  RECEIVED: 'RECEIVED',
  POSTED: 'POSTED',
  CANCELLED: 'CANCELLED',
} as const;

export type TransferStatus = typeof TRANSFER_STATUS[keyof typeof TRANSFER_STATUS];

export const ISSUE_STATUS = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  POSTED: 'POSTED',
  CANCELLED: 'CANCELLED',
} as const;

export type IssueStatus = typeof ISSUE_STATUS[keyof typeof ISSUE_STATUS];

export const ADJUSTMENT_STATUS = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  POSTED: 'POSTED',
  CANCELLED: 'CANCELLED',
} as const;

export type AdjustmentStatus = typeof ADJUSTMENT_STATUS[keyof typeof ADJUSTMENT_STATUS];

export const KITCHEN_REQUEST_STATUS = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  FULFILLED: 'FULFILLED',
  CANCELLED: 'CANCELLED',
} as const;

export type KitchenRequestStatus = typeof KITCHEN_REQUEST_STATUS[keyof typeof KITCHEN_REQUEST_STATUS];

/**
 * Union of all possible document statuses (Static Tuple for Zod)
 */
export const ALL_STATUSES = [
  'DRAFT',
  'SUBMITTED',
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
  'OPEN',
  'REVIEW',
  'CLOSED',
] as const;

export type DocumentStatus = typeof ALL_STATUSES[number];

/**
 * Exhaustive check helper
 */
export function assertNever(x: never): never {
  throw new Error(`Unexpected status: ${x}`);
}
