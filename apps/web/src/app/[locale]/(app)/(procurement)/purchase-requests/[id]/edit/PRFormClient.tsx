'use client';

import { usePR } from '@/features/purchasing/hooks/usePR';
import { PurchaseRequestForm } from '@/features/purchasing/components/purchase-request-form';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { isDocumentLocked } from '@/core/workflow/document-engine';
import { PurchaseRequestViewer } from '@/features/purchasing/components/purchase-request-viewer';

export function PRFormClient({ id }: { id: string }) {
  const t = useTranslations('procurement.pr');
  const tc = useTranslations('common');
  const router = useRouter();
  const locale = useLocale();
  
  const { data: pr, isLoading } = usePR(id);

  if (isLoading) {
    return (
      <div className="flex flex-col h-[60vh] items-center justify-center bg-surface-container-low shadow-xl rounded-2xl animate-pulse">
        <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        <p className="mt-6 text-label-xs font-semibold uppercase text-primary/60">{t('sync_context')}</p>
      </div>
    );
  }

  if (!pr) return null;

  if (isDocumentLocked('PR', pr.status)) {
    return (
      <div className="max-w-[1400px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
        <PurchaseRequestViewer document={pr} />
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
      <PurchaseRequestForm initialData={pr} />
    </div>
  );
}

