'use client';

import { useTranslations } from 'next-intl';
import { usePR } from '@/features/purchasing/hooks/usePR';
import { Package } from 'lucide-react';
import { PurchaseRequestForm } from '@/features/purchasing/components/purchase-request-form';
import { useConflictHandler } from '@/core/concurrency/useConflictHandler';
import { ConflictDialog } from '@/core/concurrency/ConflictDialog';
import { PageSkeleton } from '@/components/shared/PageSkeleton';

export function PRDetailClient({ id }: { id: string | null }) {
  const t = useTranslations('procurement.pr');
  const { data: pr, isLoading } = usePR(id);
  const { open, handleReload, handleClose, triggerConflict } = useConflictHandler('purchase-request', id || '');

  if (isLoading) return <PageSkeleton variant="detail" />;

  if (!pr) return null;

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



