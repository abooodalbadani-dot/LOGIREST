export const ROLES = [
  'ADMIN',
  'GM',
  'INV_MGR',
  'WH_KEEPER',
  'PROC_OFFICER',
  'APPROVER',
  'AUDITOR',
  'VIEWER',
  'KITCHEN_CHIEF',
  'STORE_MGR',
  'BRANCH_MGR',
  'PROC_MGR',
] as const;

export type Role = (typeof ROLES)[number];

export const LOT_STATUSES = [
  'ACTIVE',
  'HOLD',
  'EXPIRED',
  'QUARANTINE',
] as const;

export type LotStatus = (typeof LOT_STATUSES)[number];

export const ADJUSTMENT_DIRECTIONS = ['IN', 'OUT'] as const;
export type AdjustmentDirection = (typeof ADJUSTMENT_DIRECTIONS)[number];

export const ADJUSTMENT_REASONS = [
  'THEFT',
  'DAMAGE',
  'SPOILAGE',
  'CORRECTION',
  'ADMIN_OVERRIDE',
  'OPENING_STOCK',
] as const;

export type AdjustmentReason = (typeof ADJUSTMENT_REASONS)[number];

export const DOCUMENT_TYPES = [
  'PURCHASE_REQUEST',
  'PURCHASE_ORDER',
  'GOODS_RECEIVED_NOTE',
  'INVENTORY_ISSUE',
  'TRANSFER',
  'ADJUSTMENT',
  'KITCHEN_REQUEST',
  'STOCKTAKE',
] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const LOCK_TYPES = ['STOCKTAKE', 'MANUAL'] as const;
export type LockType = (typeof LOCK_TYPES)[number];

export const STOCKTAKE_STATUSES = [
  'DRAFT',
  'STARTED',
  'COUNTING',
  'REVIEW',
  'APPROVED',
  'POSTED',
  'CLOSED',
  'CANCELLED',
] as const;

export type StocktakeStatusEnum = (typeof STOCKTAKE_STATUSES)[number];
