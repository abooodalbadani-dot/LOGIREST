'use client';
import { useTranslations } from 'next-intl';

export function DocumentReadOnlyOverlay({ isPosted, children }: { isPosted: boolean; children: React.ReactNode }) {
 const t = useTranslations('common');
 
 if (!isPosted) {
 return <>{children}</>;
 }
 
 return (
 <div className="relative">
 <div className="absolute top-0 end-0 z-10 m-2 pointer-events-auto">
 <span className="bg-operational-cyan/20 border border-operational-cyan/40 text-operational-cyan px-2 py-1 rounded-lg text-label-sm font-bold shadow-lg backdrop-blur-md">
 {t('posted_read_only')}
 </span>
 </div>
 <div className="pointer-events-none opacity-80 select-none">
 {children}
 </div>
 </div>
 );
}
