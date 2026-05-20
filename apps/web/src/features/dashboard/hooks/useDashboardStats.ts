import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { apiClient } from '@/lib/api/client';
import { useAuth } from '@/providers/AuthProvider';

/**
 * Dashboard Stats Schema
 * Represents the operational KPIs for various dashboard views.
 */
export const DashboardStatsSchema = z.object({
  total_value: z.number(),
  pending_fulfillment: z.number(),
  shortages: z.number(),
  warehouse_capacity: z.number(),
  pending_prs: z.number(),
  active_stocktakes: z.number(),
  low_stock_items: z.number(),
  system_health: z.number(),
  active_users: z.number(),
  near_expiry_count: z.number(),
  today_consumption: z.number(),
  stock_health: z.number(),
  // Procurement specific
  active_pos: z.number(),
  pending_grns: z.number(),
  total_procurement_spend: z.number(),
  // Dynamic Lists
  recent_requests: z.array(z.object({
    id: z.string(),
    document_number: z.string(),
    type: z.enum(['ISSUE', 'TRANSFER']),
    status: z.string(),
    priority: z.string(),
    items_summary: z.string(),
    created_at: z.string(),
    destination: z.string(),
  })),
  activity_log: z.array(z.object({
    id: z.string(),
    item_name: z.string(),
    qty: z.number(),
    uom: z.string(),
    time: z.string(),
    type: z.string(),
  })),
  expiring_lots: z.array(z.object({
    id: z.string(),
    item_name: z.string(),
    lot_number: z.string(),
    expiry_date: z.string(),
    days_left: z.number(),
    warehouse_name: z.string(),
    qty: z.number(),
    uom: z.string(),
  })),
  fulfillment_queue: z.array(z.object({
    id: z.string(),
    document_number: z.string(),
    type: z.enum(['ISSUE', 'TRANSFER']),
    status: z.string(),
    priority: z.string(),
    items_count: z.number(),
    destination: z.string(),
    created_at: z.string(),
  })),
  pending_approvals: z.array(z.object({
    id: z.string(),
    document_number: z.string(),
    type: z.enum(['PR', 'PO', 'ADJUSTMENT', 'ISSUE', 'TRANSFER']),
    status: z.string(),
    priority: z.string(),
    destination: z.string(),
    created_at: z.string(),
    total_value: z.number().optional(),
  })),
  // New Analytics & Admin Fields
  top_vendors: z.array(z.object({
    name: z.string(),
    spend: z.number(),
    status: z.string(),
  })),
  efficiency_metrics: z.object({
    po_conversion_rate: z.number(),
    fulfillment_cycle_days: z.number(),
    throughput_week: z.number(),
    conversion_chart: z.array(z.number()),
    velocity_chart: z.array(z.number()),
  }),
  system_audit_logs: z.array(z.object({
    id: z.string(),
    action: z.string(),
    user: z.string(),
    time: z.string(),
    type: z.string(),
  })),
});

export type DashboardStats = z.infer<typeof DashboardStatsSchema>;

/**
 * Hook to fetch unified dashboard statistics.
 * Uses TanStack Query for caching and state management.
 */
export function useDashboardStats() {
  const { user } = useAuth();
  const userRole = user?.role || 'ADMIN';

  return useQuery<DashboardStats>({
    queryKey: ['dashboard', 'stats', userRole],
    queryFn: () => apiClient.get(`/dashboard/stats?role=${userRole}`, DashboardStatsSchema),
    staleTime: 120000,
    refetchInterval: 60000,
  });
}
