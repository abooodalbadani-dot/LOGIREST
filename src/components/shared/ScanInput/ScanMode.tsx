'use client';

export function ScanMode({ children, isActive }: { children: React.ReactNode; isActive: boolean }) {
  if (isActive) {
    return (
      <div className="fixed inset-0 bg-surface-0 z-50 p-4 overflow-y-auto">
        {children}
      </div>
    );
  }
  
  return <>{children}</>;
}
