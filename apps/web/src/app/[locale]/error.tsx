'use client';

import { useEffect } from 'react';

export default function Error({
 error,
 reset,
}: {
 error: Error & { digest?: string };
 reset: () => void;
}) {
 useEffect(() => {
  console.error('Unhandled UI Crash Caught by Error Boundary:', error);
 }, [error]);

 const handleGoHome = () => {
  window.location.href = '/';
 };

 return (
  <div className="flex flex-col items-center justify-center min-h-screen bg-[#050505] text-[#f1f5f9] font-sans antialiased p-8 select-none">
   <div className="flex flex-col items-stretch space-y-6 max-w-md w-full">
    <div className="flex items-center justify-between">
     <span className="text-xs font-mono tracking-wider uppercase text-red-500 font-bold">
      SYSTEM_ERROR
     </span>
     <span className="text-[10px] font-mono text-slate-500">
      {error.digest ? `ID: ${error.digest}` : 'UNHANDLED_EXCEPTION'}
     </span>
    </div>
    <div className="h-[1px] w-full bg-card/10" />
    
    <div className="space-y-2">
     <h2 className="text-sm font-mono text-slate-200 uppercase tracking-tight">
      An unexpected application crash occurred
     </h2>
     <p className="text-xs text-slate-400 font-mono leading-relaxed break-words">
      {error.message || 'The application encountered an error during rendering.'}
     </p>
    </div>

    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
     <button
      onClick={() => reset()}
      className="px-6 py-2.5 bg-[#0B1220] text-white font-bold rounded-lg shadow-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
     >
      Try Again
     </button>
     <button
      onClick={handleGoHome}
      className="flex-1 min-h-[40px] px-4 py-2 border border-white/10 text-slate-300 hover:bg-card/5 active:scale-95 transition-all rounded font-mono text-xs uppercase tracking-wider font-bold"
     >
      Dashboard
     </button>
    </div>
   </div>
  </div>
 );
}
