import { QueryClient } from '@tanstack/react-query';

/** Invalidate all Dashboard queries including Execution Queue / stats */
export function invalidateDashboardQueries(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: ['dashboard'] });
}

/** Invalidate all inventory balance, lot, movement, and report queries */
export function invalidateInventoryQueries(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: ['inventory'] });
  queryClient.invalidateQueries({ queryKey: ['inventory/balance'] });
  queryClient.invalidateQueries({ queryKey: ['inventory/movements'] });
  queryClient.invalidateQueries({ queryKey: ['inventory/lots'] });
  queryClient.invalidateQueries({ queryKey: ['warehouse-inventory'] });
  queryClient.invalidateQueries({ queryKey: ['lots'] });
  queryClient.invalidateQueries({ queryKey: ['lots-available'] });
  queryClient.invalidateQueries({ queryKey: ['reports'] });
  invalidateDashboardQueries(queryClient);
}

/** Invalidate Purchase Request queries */
export function invalidatePRQueries(queryClient: QueryClient, id?: string) {
  queryClient.invalidateQueries({ queryKey: ['purchase-requests'] });
  queryClient.invalidateQueries({ queryKey: ['prs'] });
  if (id) {
    queryClient.invalidateQueries({ queryKey: ['purchase-requests', id] });
    queryClient.invalidateQueries({ queryKey: ['pr', id] });
  }
}

/** Invalidate Purchase Order queries */
export function invalidatePOQueries(queryClient: QueryClient, id?: string) {
  queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
  queryClient.invalidateQueries({ queryKey: ['pos'] });
  if (id) {
    queryClient.invalidateQueries({ queryKey: ['purchase-orders', id] });
    queryClient.invalidateQueries({ queryKey: ['po', id] });
  }
  invalidateDashboardQueries(queryClient);
}

/** Invalidate GRN queries */
export function invalidateGRNQueries(queryClient: QueryClient, id?: string) {
  queryClient.invalidateQueries({ queryKey: ['grns'] });
  if (id) {
    queryClient.invalidateQueries({ queryKey: ['grn', id] });
    queryClient.invalidateQueries({ queryKey: ['grns', id] });
  }
  invalidateDashboardQueries(queryClient);
}

/** Invalidate Stock Issue queries */
export function invalidateIssueQueries(queryClient: QueryClient, id?: string) {
  queryClient.invalidateQueries({ queryKey: ['issues'] });
  if (id) {
    queryClient.invalidateQueries({ queryKey: ['issues', id] });
    queryClient.invalidateQueries({ queryKey: ['issue', id] });
  }
  invalidateDashboardQueries(queryClient);
}

/** Invalidate Stock Transfer queries */
export function invalidateTransferQueries(queryClient: QueryClient, id?: string) {
  queryClient.invalidateQueries({ queryKey: ['transfers'] });
  queryClient.invalidateQueries({ queryKey: ['transfers', 'summary'] });
  if (id) {
    queryClient.invalidateQueries({ queryKey: ['transfers', id] });
    queryClient.invalidateQueries({ queryKey: ['transfer', id] });
  }
  invalidateDashboardQueries(queryClient);
}

/** Invalidate Stock Adjustment queries */
export function invalidateAdjustmentQueries(queryClient: QueryClient, id?: string) {
  queryClient.invalidateQueries({ queryKey: ['adjustments'] });
  queryClient.invalidateQueries({ queryKey: ['adjustments', 'summary'] });
  if (id) {
    queryClient.invalidateQueries({ queryKey: ['adjustments', id] });
    queryClient.invalidateQueries({ queryKey: ['adjustment', id] });
  }
  invalidateDashboardQueries(queryClient);
}

/** Invalidate Stocktake queries */
export function invalidateStocktakeQueries(queryClient: QueryClient, id?: string) {
  queryClient.invalidateQueries({ queryKey: ['stocktakes'] });
  queryClient.invalidateQueries({ queryKey: ['stocktakes', 'summary'] });
  if (id) {
    queryClient.invalidateQueries({ queryKey: ['stocktakes', id] });
    queryClient.invalidateQueries({ queryKey: ['stocktake', id] });
    queryClient.invalidateQueries({ queryKey: ['stocktake-session', id] });
  }
  invalidateDashboardQueries(queryClient);
}

/** Invalidate Kitchen Request queries */
export function invalidateKitchenRequestQueries(queryClient: QueryClient, id?: string) {
  queryClient.invalidateQueries({ queryKey: ['kitchen-requests'] });
  if (id) {
    queryClient.invalidateQueries({ queryKey: ['kitchen-requests', id] });
  }
  invalidateDashboardQueries(queryClient);
}
