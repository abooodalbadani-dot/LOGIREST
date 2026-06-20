'use client';

import { usePR } from '@/features/purchasing/hooks/usePR';
import { PurchaseRequestForm } from '@/features/purchasing/components/purchase-request-form';
import { useTranslations } from 'next-intl';
import { useAudioFeedback } from '@/hooks/useAudioFeedback';

export function PRFormClient({ id }: { id: string }) {
 const t = useTranslations('procurement.pr');
 const { playSound } = useAudioFeedback();
 
 const { data: pr, isLoading } = usePR(id);

 if (isLoading) {
  return (
   <div className="min-w-0 items-center bg-card flex-1 gap-6 shadow-xl animate-pulse justify-center shadow-sm flex-col flex border border-border rounded-2xl h-[60vh] w-full dark:bg-card-dark">
    <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    <p className="mt-6 text-label-xs font-semibold uppercase text-primary/60">{t('sync_context')}</p>
   </div>
  );
 }

 if (!pr) return null;

 return (
  <div className="max-w-[1400px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
   <PurchaseRequestForm initialData={pr} />
  </div>
 );
}


