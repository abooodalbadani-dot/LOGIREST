'use client';
import { useTranslations } from 'next-intl';

export function DocumentReadOnlyOverlay({ isPosted, children }: { isPosted: boolean; children: React.ReactNode }) {
 if (!isPosted) {
  return <>{children}</>;
 }
 
 return (
  <div className="pointer-events-none opacity-80 select-none">
   {children}
  </div>
 );
}
