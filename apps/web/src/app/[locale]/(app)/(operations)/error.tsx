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
      <div className="flex flex-col items-center justify-center w-full max-w-md mx-auto p-8 text-center bg-[#1A2234] border border-red-500/30 rounded-xl shadow-lg">
        <div className="flex items-center justify-center h-16 w-16 rounded-full bg-red-500/10 text-red-500 border border-red-500/20 mb-4 animate-pulse">
          <AlertCircle className="h-8 w-8" />
        </div>

        <h2 className="text-xl font-bold text-white uppercase tracking-tight">
          {t('operations_title')}
        </h2>
        <p className="text-gray-400 text-sm mt-4 leading-relaxed max-w-[250px]">
          {t('operations_desc')}
        </p>

        <div className="mt-6 p-3 bg-[#0B1220] border border-red-500/20 rounded text-red-400 text-[10px] font-mono w-full text-left overflow-x-auto uppercase tracking-wider">
          ERROR: {error?.message || 'FIELDS IS NOT DEFINED'}
        </div>

        {error?.digest && (
          <div className="mt-2 p-2 bg-[#0B1220] border border-border/30 rounded text-muted-foreground/60 text-[10px] font-mono w-full text-left overflow-x-auto uppercase tracking-wider">
            DIGEST_ID: {error.digest}
          </div>
        )}

        <div className="flex flex-col gap-3 w-full mt-8">
          <button
            onClick={() => reset()}
            className="w-full px-6 py-2 bg-transparent border border-[#b48e67] text-[#b48e67] font-medium rounded hover:bg-[#b48e67] hover:text-[#0B1220] transition-colors uppercase tracking-widest text-xs"
          >
            Reinitialize Module
          </button>
          <button
            onClick={handleGoHome}
            className="w-full px-6 py-2 bg-transparent border border-gray-600 text-gray-400 font-medium rounded hover:bg-gray-800 hover:text-white transition-colors uppercase tracking-widest text-xs"
          >
            {t('dashboard') || 'Dashboard'}
          </button>
        </div>
      </div>
    </div>
  );
}
