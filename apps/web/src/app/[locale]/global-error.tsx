'use client';

import { useEffect } from 'react';

export default function GlobalError({
 error,
 reset,
}: {
 error: Error & { digest?: string };
 reset: () => void;
}) {
 useEffect(() => {
  console.error('Fatal Root Layout Crash Caught by Global Error Boundary:', error);
 }, [error]);

 const handleGoHome = () => {
  window.location.href = '/';
 };

 return (
  <html lang="en" suppressHydrationWarning>
   <body className="bg-[#050505] text-[#f1f5f9] font-sans antialiased" suppressHydrationWarning>
    <div className="flex flex-col items-center justify-center min-h-screen p-8 select-none">
     <div className="flex flex-col items-stretch space-y-6 max-w-md w-full">
      <div className="flex items-center justify-between">
       <span className="text-xs font-mono tracking-wider uppercase text-red-500 font-bold">
        FATAL_CRASH
       </span>
       <span className="text-[10px] font-mono text-slate-500">
        {error.digest ? `ID: ${error.digest}` : 'ROOT_EXCEPTION'}
       </span>
      </div>
      <div className="h-[1px] w-full bg-card/10" />
      
      <div className="space-y-2">
       <h2 className="text-sm font-mono text-slate-200 uppercase tracking-tight">
        A critical layout failure occurred
       </h2>
       <p className="text-xs text-slate-400 font-mono leading-relaxed break-words">
        The core app Shell failed to initialize. This usually happens during connection failures or hydration discrepancies.
       </p>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
       <button
        onClick={() => reset()}
        className="flex-1 min-h-[40px] px-4 py-2 bg-operational-cyan text-slate-950 hover:brightness-110 active:scale-95 transition-all rounded font-mono text-xs uppercase tracking-wider font-bold"
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
   </body>
  </html>
 );
}
