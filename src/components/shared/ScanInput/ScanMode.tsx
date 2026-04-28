'use client';

export function ScanMode({ children, isActive }: { children: React.ReactNode; isActive: boolean }) {
  if (isActive) {
    return (
      <div className="fixed inset-0 bg-background/90 backdrop-blur-3xl z-[100] p-4 sm:p-8 overflow-y-auto animate-in fade-in zoom-in-95 duration-500 flex items-center justify-center">
        <div className="w-full max-w-4xl bg-surface-container-low/95 border border-white/10-muted/30 rounded-[2rem] shadow-[0_48px_96px_-24px_rgba(0,0,0,0.5)] overflow-hidden relative">
          {/* Top scanning indicator line */}
          <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-transparent via-operational-cyan/50 to-transparent animate-pulse" />
          <div className="p-6 sm:p-10">
            {children}
          </div>
        </div>
      </div>
    );
  }
  
  return <>{children}</>;
}
