'use client';

import { usePR } from '@/features/purchasing/hooks/usePR';
import { PurchaseRequestForm } from '@/features/purchasing/components/pr-form';
import { useTranslations } from 'next-intl';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export function PRFormClient({ id, locale }: { id: string; locale: 'ar' | 'en' }) {
 const t = useTranslations('procurement.pr');
 const tc = useTranslations('common');
 const router = useRouter();
 
 const { data: pr, isLoading } = usePR(id);

 if (isLoading) {
 return (
 <div className="flex flex-col h-[60vh] items-center justify-center bg-surface-container-low shadow-xl rounded-2xl animate-pulse">
 <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
 <p className="mt-6 text-label-xs font-semibold uppercase text-primary/60">{t('sync_context')}</p>
 </div>
 );
 }

 if (!pr || pr.status !== 'DRAFT') {
 return (
 <div className="flex flex-col h-[60vh] items-center justify-center bg-surface-container-low shadow-xl rounded-2xl p-12 text-center">
 <AlertCircle className="w-16 h-16 text-status-error mb-4 opacity-20" />
 <h2 className="text-title-lg font-semibold uppercase text-muted-foreground">{t('edit_not_allowed')}</h2>
 <p className="text-label-sm font-bold text-muted-foreground/40 mt-2 uppercase">{t('edit_not_allowed_desc') || 'Only draft documents can be edited.'}</p>
 <Button onClick={() => router.back()} variant="ghost" className="mt-8 h-12 px-8 rounded-xl border border-surface-variant/10">
 <ArrowLeft className="w-4 h-4 me-2" />
 {tc('back')}
 </Button>
 </div>
 );
 }

 return (
 <div className="max-w-[1400px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
 <PurchaseRequestForm initialData={pr} locale={locale} />
 </div>
 );
}
