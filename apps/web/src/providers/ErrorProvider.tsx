'use client';

import React, { useEffect } from 'react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

export function ErrorProvider({ children }: { children: React.ReactNode }) {
  const t = useTranslations();

  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason;
      if (!error) return;

      // Log the full traceback to console for development audit
      console.error('Unhandled promise rejection caught by Error Shield:', error);

      // Prevent default browser/Next.js overlay crashing
      event.preventDefault();

      // If the API client has already displayed a toast for this infrastructure crash, skip
      if (error && typeof error === 'object' && error._isToastShown) {
        return;
      }

      let message = 'errors.generic';
      if (error && typeof error === 'object') {
        message = error.message || error.response?.data?.message || message;
      } else if (typeof error === 'string') {
        message = error;
      }

      let translatedMessage = message;
      try {
        if (t.has(message)) {
          translatedMessage = t(message);
        }
      } catch {
        // Fallback to raw message
      }

      toast.error(translatedMessage);
    };

    const handleWindowError = (event: ErrorEvent) => {
      if (event.error === null || event.error === undefined || event.error === '') return;
      console.error('Global window error caught by Error Shield:', event.error);
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleWindowError);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleWindowError);
    };
  }, [t]);

  return <>{children}</>;
}
