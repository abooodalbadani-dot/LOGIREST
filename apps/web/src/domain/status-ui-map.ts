import { 
  ISSUE_STATUS, 
  STOCKTAKE_STATUS, 
  TRANSFER_STATUS, 
  PR_STATUS,
  PO_STATUS,
  GRN_STATUS,
  ADJUSTMENT_STATUS,
  KITCHEN_REQUEST_STATUS,
  DocumentStatus 
} from '@/contracts/statuses';

export type BadgeVariant = 'default' | 'brand' | 'warning' | 'error' | 'success' | 'outline' | 'info';

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
  DRAFT: { variant: 'outline', labelKey: 'status.draft' },
  POSTED: { variant: 'success', labelKey: 'status.posted' },
  CANCELLED: { variant: 'error', labelKey: 'status.cancelled' },
  SUBMITTED: { variant: 'info', labelKey: 'status.submitted' },
  APPROVED: { variant: 'success', labelKey: 'status.approved' },
  REJECTED: { variant: 'error', labelKey: 'status.rejected' },
  PENDING: { variant: 'warning', labelKey: 'status.pending' },
  COMPLETED: { variant: 'success', labelKey: 'status.completed' },
  
  // PR/PO Specific
  CLOSED: { variant: 'default', labelKey: 'status.closed' },
  PARTIAL: { variant: 'info', labelKey: 'status.partial' },
  FULFILLED: { variant: 'success', labelKey: 'status.fulfilled' },

  // GRN Specific
  RECEIVED: { variant: 'success', labelKey: 'status.received' },

  // Stocktake Specific
  STARTED: { variant: 'brand', labelKey: 'status.started' },
  COUNTING: { variant: 'info', labelKey: 'status.counting' },
  REVIEW: { variant: 'warning', labelKey: 'status.review' },
  
  // Transfer Specific
  IN_TRANSIT: { variant: 'warning', labelKey: 'status.in_transit' },
};

/**
 * Domain-specific overrides or specialized mappings
 */
export const ISSUE_STATUS_UI: Record<string, StatusConfig> = {
  ...STATUS_UI_CONFIG,
  [ISSUE_STATUS.SUBMITTED]: { variant: 'warning', labelKey: 'status.pending_review' },
};

export const ADJUSTMENT_STATUS_UI: Record<string, StatusConfig> = {
  ...STATUS_UI_CONFIG,
  [ADJUSTMENT_STATUS.SUBMITTED]: { variant: 'warning', labelKey: 'status.pending_approval' },
};

export const STOCKTAKE_STATUS_UI: Record<string, StatusConfig> = {
  ...STATUS_UI_CONFIG,
  [STOCKTAKE_STATUS.REVIEW]: { variant: 'warning', labelKey: 'status.variance_review' },
};

export const TRANSFER_STATUS_UI: Record<string, StatusConfig> = {
  ...STATUS_UI_CONFIG,
  [TRANSFER_STATUS.IN_TRANSIT]: { variant: 'warning', labelKey: 'status.in_transit' },
};

/**
 * Helper to get config with a fallback
 */
export const getStatusConfig = (status: string, customMap?: Record<string, StatusConfig>): StatusConfig => {
  const map = customMap || STATUS_UI_CONFIG;
  return map[status] || STATUS_UI_CONFIG[status] || { variant: 'default', labelKey: 'status.unknown' };
};
