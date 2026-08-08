'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from '@/i18n/navigation';
import { useOperationalScope } from '@/hooks/useOperationalScope';

/**
 * List of document detail/edit route patterns paired with their module list fallbacks.
 * Uses flexible matching to support locale prefixes (/ar, /en) and layout groupings.
 */
const DETAIL_ROUTE_FALLBACKS: Array<{ pattern: RegExp; fallback: string }> = [
  { pattern: /(^|\/)(adjustments)\/[^/]+$/, fallback: '/adjustments' },
  { pattern: /(^|\/)(issues)\/[^/]+$/, fallback: '/issues' },
  { pattern: /(^|\/)(transfers)\/[^/]+$/, fallback: '/transfers' },
  { pattern: /(^|\/)(stocktake)\/[^/]+$/, fallback: '/stocktake' },
  { pattern: /(^|\/)(goods-received)\/[^/]+$/, fallback: '/goods-received' },
  { pattern: /(^|\/)(purchase-orders)\/[^/]+$/, fallback: '/purchase-orders' },
  { pattern: /(^|\/)(purchase-requests)\/[^/]+$/, fallback: '/purchase-requests' },
  { pattern: /(^|\/)(kitchen-requests)\/[^/]+$/, fallback: '/kitchen-requests' },
];

/**
 * Step 1: Frontend Context Listener (Auto-Redirect)
 * 
 * Global hook that monitors active operational scope changes (activeWarehouseId / activeBranchId).
 * If the user switches their active scope while viewing a specific document detail or edit page,
 * this hook forces an instant redirect to the module's root list view to prevent cross-scope context bleeding.
 */
export function useScopeRedirectListener() {
  const router = useRouter();
  const pathname = usePathname();
  const { warehouseId, branchId } = useOperationalScope();

  // Track previous active scope across renders
  const prevScopeRef = useRef<{ warehouseId: string | null; branchId: string | null }>({
    warehouseId,
    branchId,
  });

  const isInitialMount = useRef(true);

  useEffect(() => {
    const prevWarehouse = prevScopeRef.current.warehouseId;
    const prevBranch = prevScopeRef.current.branchId;

    // Skip on initial page mount (already loaded with current scope)
    if (isInitialMount.current) {
      isInitialMount.current = false;
      prevScopeRef.current = { warehouseId, branchId };
      return;
    }

    const warehouseChanged = prevWarehouse !== warehouseId;
    const branchChanged = prevBranch !== branchId;

    // Update reference to current scope
    prevScopeRef.current = { warehouseId, branchId };

    // Trigger auto-redirect if scope changed while lingering on a document detail route
    if (warehouseChanged || branchChanged) {
      for (const item of DETAIL_ROUTE_FALLBACKS) {
        if (item.pattern.test(pathname)) {
          console.warn(
            `[Scope Bleed Guard] Active scope changed (${prevWarehouse} → ${warehouseId}). Redirecting from ${pathname} to ${item.fallback}`
          );
          router.replace(item.fallback);
        }
      }
    }
  }, [warehouseId, branchId, pathname, router]);
}
