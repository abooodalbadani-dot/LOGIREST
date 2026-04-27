'use client';
import { useTranslations } from 'next-intl';

export function DocumentReadOnlyOverlay({ isPosted, children }: { isPosted: boolean; children: React.ReactNode }) {
  const t = useTranslations('common');
  
  if (!isPosted) {
    return <>{children}</>;
  }
  
  return (
    <div className="relative">
      <div className="absolute top-0 right-0 z-10 m-2 pointer-events-auto">
        <span className="bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 px-2 py-1 rounded text-xs font-bold shadow">
          {t('posted_read_only')}
        </span>
      </div>
      <div className="pointer-events-none opacity-80 select-none">
        {children}
      </div>
    </div>
  );
}
