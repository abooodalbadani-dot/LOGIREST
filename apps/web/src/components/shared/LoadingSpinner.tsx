'use client';

export default function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#050505] text-[#f1f5f9] font-sans antialiased p-8 select-none">
      <div className="flex flex-col items-stretch space-y-4 max-w-xs w-full">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono tracking-wider uppercase text-operational-cyan">
            OTANTIK_CORE
          </span>
          <div className="w-3.5 h-3.5 border-1.5 border-operational-cyan border-t-transparent rounded-full animate-spin" style={{ borderWidth: '1.5px' }} />
        </div>
        <div className="h-[1px] w-full bg-white/10" />
        <p className="text-xs font-mono tracking-normal leading-normal text-slate-400">
          RESOLVING_AUTHENTICATION_STATE
        </p>
      </div>
    </div>
  );
}
