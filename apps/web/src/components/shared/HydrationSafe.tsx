'use client';

import * as React from 'react';

/**
 * HydrationSafe - Prevents hydration mismatches by ensuring children
 * only render on the client after mounting.
 * 
 * Use this to wrap components that rely on browser-only state (e.g., localStorage, window size)
 * or non-deterministic data (e.g., random IDs, dates generated on render).
 */
export function HydrationSafe({ children, fallback = null }: { 
 children: React.ReactNode;
 fallback?: React.ReactNode;
}) {
 const [isMounted, setIsMounted] = React.useState(false);

 React.useEffect(() => {
   
  setIsMounted(true);
 }, []);

 if (!isMounted) {
  return <>{fallback}</>;
 }

 return <>{children}</>;
}
