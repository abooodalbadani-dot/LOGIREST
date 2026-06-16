'use client';

import React, { useEffect, useState } from 'react';

interface HydrationSafeProps {
 children: React.ReactNode;
 fallback?: React.ReactNode;
}

/**
 * A component that prevents hydration mismatches by only rendering its children
 * after the component has mounted on the client.
 */
export function HydrationSafe({ children, fallback = null }: HydrationSafeProps) {
 const [mounted, setMounted] = useState(false);

 useEffect(() => {
  // eslint-disable-next-line react-hooks/set-state-in-effect
  setMounted(true);
 }, []);

 if (!mounted) {
  return <>{fallback}</>;
 }

 return <>{children}</>;
}
