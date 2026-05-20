'use client';

import { useTranslations } from 'next-intl';
import { Construction, Calculator } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';

export function LandedCostClient() {
 const t = useTranslations('landed_cost');

 if (process.env.NODE_ENV !== 'development') {
  return (
   <div className="p-8 max-w-[1600px] mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
    <PageHeader title={t('title')} description={t('subtitle')} />
    <div className="flex flex-col items-center justify-center py-32 bg-surface-container-low rounded-[3rem] border-2 border-dashed border-white/5">
     <div className="w-20 h-20 rounded-full bg-amber-500/5 flex items-center justify-center mb-6">
      <Construction className="w-10 h-10 text-amber-500/50" />
     </div>
     <p className="text-label-sm font-semibold text-muted-foreground/60 uppercase">{t('coming_soon')}</p>
    </div>
   </div>
  );
 }

 return (
  <div className="p-8 max-w-[1600px] mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
   <PageHeader title={t('title')} description={t('subtitle')} />
   <div className="flex flex-col items-center justify-center py-32 bg-surface-container-low rounded-[3rem] border-2 border-dashed border-white/5">
    <div className="w-20 h-20 rounded-full bg-amber-500/5 flex items-center justify-center mb-6">
     <Construction className="w-10 h-10 text-amber-500/50" />
    </div>
    <p className="text-label-sm font-semibold text-muted-foreground/60 uppercase">{t('coming_soon')}</p>
   </div>
  </div>
 );
}
