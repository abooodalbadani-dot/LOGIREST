'use client';

import React, { useEffect } from 'react';

export function ErrorProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason);
    };

    const handleWindowError = (event: ErrorEvent) => {
      console.error('Global window error:', event.error);
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleWindowError);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleWindowError);
    };
  }, []);

  return <>{children}</>;
}
