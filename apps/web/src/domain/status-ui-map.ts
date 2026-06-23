import { 
  ISSUE_STATUS, 
  STOCKTAKE_STATUS, 
  TRANSFER_STATUS, 
  ADJUSTMENT_STATUS,
} from '@logirest/shared-types';

export type BadgeVariant = 'default' | 'brand' | 'warning' | 'error' | 'success' | 'outline' | 'info' | 'partial';

interface StatusConfig {
  variant: BadgeVariant;
  labelKey: string;
}

/**
 * Global Status to UI Mapping
 * Used as the base for all document types.
 */
export const STATUS_UI_CONFIG: Record<string, StatusConfig> = {
  // Generic / Common
  DRAFT: { variant: 'warning', labelKey: 'statuses.draft' },
  POSTED: { variant: 'success', labelKey: 'statuses.posted' },
  CANCELLED: { variant: 'error', labelKey: 'statuses.cancelled' },
  SUBMITTED: { variant: 'info', labelKey: 'statuses.submitted' },
  APPROVED: { variant: 'info', labelKey: 'statuses.approved' },
  REJECTED: { variant: 'error', labelKey: 'statuses.rejected' },
  PENDING: { variant: 'warning', labelKey: 'statuses.pending' },
  COMPLETED: { variant: 'success', labelKey: 'statuses.completed' },
  VOIDED: { variant: 'error', labelKey: 'statuses.voided' },
  
  // PR/PO Specific
  CLOSED: { variant: 'default', labelKey: 'statuses.closed' },
  PARTIAL: { variant: 'partial', labelKey: 'statuses.partial' },
  IN_PROGRESS: { variant: 'partial', labelKey: 'statuses.in_progress' },
  FULFILLED: { variant: 'success', labelKey: 'statuses.fulfilled' },

  // GRN Specific
  RECEIVED: { variant: 'success', labelKey: 'statuses.received' },

  // Stocktake Specific
  STARTED: { variant: 'brand', labelKey: 'statuses.started' },
  COUNTING: { variant: 'partial', labelKey: 'statuses.counting' },
  REVIEW: { variant: 'warning', labelKey: 'statuses.review' },
  
  // Transfer Specific
  IN_TRANSIT: { variant: 'partial', labelKey: 'statuses.in_transit' },
  DISPUTED: { variant: 'error', labelKey: 'statuses.disputed' },

  // Specialized / Missing
  VARIANCE_SUBMITTED: { variant: 'warning', labelKey: 'statuses.variance_submitted' },
  COUNTING_COMPLETED: { variant: 'info', labelKey: 'statuses.counting_completed' },
  ACTIVE: { variant: 'success', labelKey: 'statuses.active' },
  INACTIVE: { variant: 'error', labelKey: 'statuses.inactive' },
  OUT_OF_STOCK: { variant: 'error', labelKey: 'statuses.out_of_stock' },
  LOW_STOCK: { variant: 'warning', labelKey: 'statuses.low_stock' },
  HEALTHY: { variant: 'success', labelKey: 'statuses.healthy' },
};

/**
 * Domain-specific overrides or specialized mappings
 */
export const ISSUE_STATUS_UI: Record<string, StatusConfig> = {
  ...STATUS_UI_CONFIG,
  [ISSUE_STATUS.SUBMITTED]: { variant: 'warning', labelKey: 'statuses.pending_review' },
};

export const ADJUSTMENT_STATUS_UI: Record<string, StatusConfig> = {
  ...STATUS_UI_CONFIG,
  [ADJUSTMENT_STATUS.SUBMITTED]: { variant: 'warning', labelKey: 'statuses.pending_approval' },
};

export const STOCKTAKE_STATUS_UI: Record<string, StatusConfig> = {
  ...STATUS_UI_CONFIG,
  [STOCKTAKE_STATUS.REVIEW]: { variant: 'warning', labelKey: 'statuses.variance_review' },
};

export const TRANSFER_STATUS_UI: Record<string, StatusConfig> = {
  ...STATUS_UI_CONFIG,
  [TRANSFER_STATUS.IN_TRANSIT]: { variant: 'partial', labelKey: 'statuses.in_transit' },
};

/**
 * Helper to get config with a fallback
 */
export const getStatusConfig = (status: string, customMap?: Record<string, StatusConfig>): StatusConfig => {
  const map = customMap || STATUS_UI_CONFIG;
  return map[status] || STATUS_UI_CONFIG[status] || { variant: 'default', labelKey: 'statuses.unknown' };
};
