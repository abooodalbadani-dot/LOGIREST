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
    <div className="w-full min-h-[60vh] flex items-center justify-center py-12 px-4 md:px-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="w-full max-w-3xl mx-auto p-6 md:p-10 flex flex-col items-center justify-center text-center bg-[#1A2234] border border-red-500/30 rounded-xl shadow-lg">
        <div className="flex items-center justify-center h-16 w-16 rounded-full bg-red-500/10 text-red-500 border border-red-500/20 mb-4 animate-pulse">
          <AlertCircle className="h-8 w-8" />
        </div>

        <h2 className="text-xl font-bold text-white uppercase tracking-tight">
          {t('operations_title')}
        </h2>
        <p className="w-full text-gray-400 text-sm mt-4 leading-relaxed max-w-md">
          {t('operations_desc')}
        </p>

        <pre className="w-full max-w-full overflow-x-auto whitespace-pre-wrap bg-black/50 border border-red-900/50 rounded-lg p-4 text-left text-red-500 font-mono text-sm my-6">
          ERROR: {error?.message || 'FIELDS IS NOT DEFINED'}
          {error?.digest && `\nDIGEST_ID: ${error.digest}`}
        </pre>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full mt-4">
          <button
            onClick={() => reset()}
            className="w-full sm:w-auto px-6 py-2 bg-transparent border border-[#b48e67] text-[#b48e67] font-medium rounded hover:bg-[#b48e67] hover:text-[#0B1220] transition-colors uppercase tracking-widest text-xs"
          >
            Reinitialize Module
          </button>
          <button
            onClick={handleGoHome}
            className="w-full sm:w-auto px-6 py-2 bg-transparent border border-gray-600 text-gray-400 font-medium rounded hover:bg-gray-800 hover:text-white transition-colors uppercase tracking-widest text-xs"
          >
            {t('dashboard') || 'Dashboard'}
          </button>
        </div>
      </div>
    </div>
  );
}
