'use client';

export function DocumentReadOnlyOverlay({ isPosted, children }: { isPosted: boolean; children: React.ReactNode }) {
 if (!isPosted) {
  return <>{children}</>;
 }
 
 return (
  <div className="opacity-90">
   {children}
  </div>
 );
}
