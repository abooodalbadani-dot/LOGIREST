'use client';
import { useAuth } from '@/providers/AuthProvider';
import { canViewFinancialData } from '@/utils/roleUtils';

/**
 * Returns whether the current user's role is allowed to see a specific column.
 *
 * Financial columns (unitPrice, wac, totalValue, unitCost, unitCostForeign, unitCostBase)
 * are hidden from purely operational roles (WH_KEEPER, KITCHEN_CHIEF).
 *
 * Usage:
 * ```tsx
 * const showCost = useColumnVisibility('unitPrice');
 * {showCost && <TableColumn key="unitPrice" title="Unit Price" />}
 * ```
 */

/** Columns that are restricted to management/financial-access roles. */
const FINANCIAL_COLUMNS = new Set([
  'unitPrice',
  'unitCostForeign',
  'unitCostBase',
  'unitCost',
  'wac',
  'totalValue',
  'totalCost',
  'supplierTotalAmount',
]);

export function useColumnVisibility(columnKey: string): boolean {
  const { user, isLoading } = useAuth();

  if (isLoading || !user) return false;

  if (FINANCIAL_COLUMNS.has(columnKey)) {
    return canViewFinancialData(user.role);
  }

  // Non-financial columns are always visible
  return true;
}
