'use client';

import React, { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

export default function OperationsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('errors');

  useEffect(() => {
    console.error('Operations boundary caught a rendering or data-loading failure:', error);
  }, [error]);

  const handleGoHome = () => {
    window.location.href = '/';
  };

  return (
    <div className="flex-1 w-full min-w-[280px] shrink-0 flex flex-col items-center justify-center min-h-[60vh] py-12 px-4 md:px-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="w-full max-w-2xl mx-auto p-8 md:p-12 bg-card border border-border/50 rounded-2xl shadow-lg text-center space-y-6 shrink-0 min-w-[280px] overflow-hidden">
        <div className="flex flex-col items-center justify-center w-full gap-4">
          <div className="flex justify-center">
            <div className="flex items-center justify-center h-16 w-16 rounded-2xl bg-status-error/10 text-status-error border border-status-error/20 animate-pulse">
              <AlertCircle className="h-8 w-8" />
            </div>
          </div>

          <h2 className="block w-full text-center text-title-md font-bold text-foreground uppercase tracking-tight">
            {t('operations_title')}
          </h2>
          <p className="w-full max-w-md mx-auto text-center text-muted-foreground whitespace-normal break-words mt-4 leading-relaxed">
            {t('operations_desc')}
          </p>
        </div>

        {error.digest && (
          <div className="bg-bg-light dark:bg-brand-black/50 border border-border/30 rounded-xl p-3 font-mono text-[10px] text-muted-foreground/60 select-all max-w-md mx-auto w-full">
            DIGEST_ID: {error.digest}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-center gap-4 mt-8">
          <button
            onClick={() => reset()}
            className="flex items-center gap-2 px-6 py-2.5 bg-brand-gold text-brand-black font-semibold rounded-lg hover:bg-brand-gold/90 transition-colors whitespace-nowrap cursor-pointer"
          >
            <RefreshCw className="w-4 h-4 ml-2" />
            <span>{t('retry')}</span>
          </button>
          <button
            onClick={handleGoHome}
            className="flex items-center gap-2 px-6 py-2.5 bg-transparent border border-border/50 text-foreground font-medium rounded-lg hover:bg-white/5 transition-colors whitespace-nowrap cursor-pointer"
          >
            <Home className="w-4 h-4 ml-2" />
            <span>{t('dashboard')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
