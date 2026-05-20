'use client';

import { useTranslations } from 'next-intl';
import { ShieldAlert, Construction } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';

export function ExpiredOverrideClient({ locale }: { locale: string }) {
 const t = useTranslations('inventory.expired_override');

 if (process.env.NODE_ENV !== 'development') {
  return (
   <div className="flex flex-col gap-8 pb-20">
    <PageHeader
     title={t('title')}
     description={t('description')}
     icon={<ShieldAlert className="w-8 h-8 text-rose-500" />}
    />
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
  <div className="flex flex-col gap-8 pb-20">
   <PageHeader
    title={t('title')}
    description={t('description')}
    icon={<ShieldAlert className="w-8 h-8 text-rose-500" />}
   />
   <div className="flex flex-col items-center justify-center py-32 bg-surface-container-low rounded-[3rem] border-2 border-dashed border-white/5">
    <div className="w-20 h-20 rounded-full bg-amber-500/5 flex items-center justify-center mb-6">
     <Construction className="w-10 h-10 text-amber-500/50" />
    </div>
    <p className="text-label-sm font-semibold text-muted-foreground/60 uppercase">{t('coming_soon')}</p>
   </div>
  </div>
 );
}
