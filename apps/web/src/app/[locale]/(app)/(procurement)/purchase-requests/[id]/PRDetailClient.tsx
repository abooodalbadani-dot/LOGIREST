'use client';

import { useTranslations, useLocale } from 'next-intl';
import { usePR } from '@/features/purchasing/hooks/usePR';

import { PurchaseRequestForm } from '@/features/purchasing/components/purchase-request-form';
import { PRViewer } from './PRViewer';
import { useConflictHandler } from '@/core/concurrency/useConflictHandler';
import { ConflictDialog } from '@/core/concurrency/ConflictDialog';
import { PageSkeleton } from '@/components/shared/PageSkeleton';

export function PRDetailClient({ id }: { id: string | null }) {
 const _t = useTranslations('procurement.pr');
 const locale = useLocale() as 'ar' | 'en';
 const { data: pr, isLoading } = usePR(id);
 const { open, handleReload, handleClose, triggerConflict } = useConflictHandler('purchase-request', id || '');

 if (isLoading) return <PageSkeleton variant="detail" />;

 if (!pr) return null;

 const isDraft = pr.status === 'DRAFT' || id === 'new';

 if (!isDraft) {
  return (
   <>
    <PRViewer document={pr} locale={locale} />
    <ConflictDialog 
     open={open}
     onReload={handleReload}
     onClose={handleClose}
    />
   </>
  );
 }

 return (
  <>
   <PurchaseRequestForm initialData={pr} onConflict={triggerConflict} />
   <ConflictDialog 
    open={open}
    onReload={handleReload}
    onClose={handleClose}
   />
  </>
 );
}



