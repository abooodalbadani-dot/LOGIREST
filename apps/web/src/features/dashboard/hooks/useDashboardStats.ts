import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { apiClient } from '@/lib/api/client';
import { useAuth } from '@/providers/AuthProvider';

/**
 * Dashboard Stats Schema
 * Represents the operational KPIs for various dashboard views.
 */
export const DashboardStatsSchema = z.object({
  totalValue: z.number(),
  pendingFulfillment: z.number(),
  shortages: z.number(),
  warehouseCapacity: z.number(),
  pendingPrs: z.number(),
  activeStocktakes: z.number(),
  lowStockItems: z.number(),
  systemHealth: z.number(),
  activeUsers: z.number(),
  nearExpiryCount: z.number(),
  todayConsumption: z.number(),
  stockHealth: z.number(),
  // Procurement specific
  activePos: z.number(),
  pendingGrns: z.number(),
  totalProcurementSpend: z.number(),
  // Dynamic Lists
  recentRequests: z.array(z.object({
    id: z.string(),
    documentNumber: z.string(),
    type: z.enum(['ISSUE', 'TRANSFER']),
    status: z.string(),
    priority: z.string(),
    itemsSummary: z.string(),
    createdAt: z.string(),
    destination: z.string(),
  })),
  activityLog: z.array(z.object({
    id: z.string(),
    itemName: z.string(),
    qty: z.number(),
    uom: z.string(),
    time: z.string(),
    type: z.string(),
  })),
  expiringLots: z.array(z.object({
    id: z.string(),
    itemId: z.string().optional(),
    itemName: z.string(),
    lotNumber: z.string(),
    expiryDate: z.string(),
    daysLeft: z.number(),
    warehouseName: z.string(),
    qty: z.number(),
    uom: z.string(),
  })),
  fulfillmentQueue: z.array(z.object({
    id: z.string(),
    documentNumber: z.string(),
    type: z.enum(['ISSUE', 'TRANSFER']),
    status: z.string(),
    priority: z.string(),
    itemsCount: z.number(),
    destination: z.string(),
    createdAt: z.string(),
  })),
  pendingApprovals: z.array(z.object({
    id: z.string(),
    documentNumber: z.string(),
    type: z.enum(['PR', 'PO', 'ADJUSTMENT', 'ISSUE', 'TRANSFER']),
    status: z.string(),
    priority: z.string(),
    destination: z.string(),
    createdAt: z.string(),
    totalValue: z.number().optional(),
  })),
  // New Analytics & Admin Fields
  topVendors: z.array(z.object({
    name: z.string(),
    spend: z.number(),
    status: z.string(),
  })),
  efficiencyMetrics: z.object({
    poConversionRate: z.number(),
    fulfillmentCycleDays: z.number(),
    throughputWeek: z.number(),
    conversionChart: z.array(z.number()),
    velocityChart: z.array(z.number()),
  }),
  systemAuditLogs: z.array(z.object({
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
  const { user, activeScope } = useAuth();
  const userRole = user?.role;

  return useQuery<DashboardStats>({
    queryKey: ['dashboard', 'stats', userRole, activeScope.departmentId, activeScope.warehouseId, activeScope.branchId],
    queryFn: () => {
      const params = new URLSearchParams();
      if (userRole) params.append('role', userRole);
      if (activeScope.departmentId) params.append('departmentId', activeScope.departmentId);
      if (activeScope.warehouseId) params.append('warehouseId', activeScope.warehouseId);
      if (activeScope.branchId) params.append('branchId', activeScope.branchId);
      
      return apiClient.get(`/dashboard/stats?${params.toString()}`, DashboardStatsSchema);
    },
    enabled: !!userRole && 
      (userRole !== 'KITCHEN_CHIEF' || !!activeScope.departmentId) && 
      (userRole !== 'STORE_MGR' || !!activeScope.warehouseId),
    staleTime: 120000,
    refetchInterval: 60000,
  });
}
