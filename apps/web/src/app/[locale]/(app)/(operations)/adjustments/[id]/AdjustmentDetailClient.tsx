'use client';

import { useAdjustment } from '@/features/operations/hooks/useAdjustment';
import { ConflictDialog } from '@/core/concurrency/ConflictDialog';
import { useConflictHandler } from '@/core/concurrency/useConflictHandler';
import { ADJUSTMENT_STATUS } from '@logirest/shared-types';
import { isLocked } from '@/domain/status-guards';
import { AdjustmentForm } from './AdjustmentForm';
import { useTranslations } from 'next-intl';
import { AlertCircle } from 'lucide-react';

import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { ScopeGuard } from '@/components/shared/ScopeGuard';

import { useItems } from '@/features/items/hooks/useItems';
import type { Item } from '@/types/master-data';
import React from 'react';

export function AdjustmentDetailClient({ id }: { id: string }) {
 const t = useTranslations('operations.adjustment');
 const conflict = useConflictHandler('adjustment', id);
 
 const isNew = id === 'new';
 const { data: rawAdjustment, isLoading } = useAdjustment(isNew ? null : id);
 const { data: itemsData } = useItems({ limit: 1000 });

 const adjustment = React.useMemo(() => {
  if (!rawAdjustment) return undefined;
  if (!itemsData?.data || !rawAdjustment.lines) return rawAdjustment;
  return {
   ...rawAdjustment,
   lines: rawAdjustment.lines.map((line) => {
    const itemAny = line.item as unknown as { id?: string; image?: string | null; imageUrl?: string | null };
    const masterItem = itemsData.data.find((i: Item) => i.id === itemAny?.id);
    const img = itemAny?.image || itemAny?.imageUrl || masterItem?.image || masterItem?.imageUrl || null;
    return {
     ...line,
     item: {
      ...line.item,
      image: img,
      imageUrl: img,
     },
    };
   }),
  };
 }, [rawAdjustment, itemsData]);

 if (isLoading) return <PageSkeleton variant="detail" />;

 const status = adjustment?.status ?? ADJUSTMENT_STATUS.DRAFT;
 const locked = isLocked('ADJUSTMENT', status);

 const isRejected = status === ADJUSTMENT_STATUS.REJECTED;

 return (
  <ScopeGuard warehouseId={adjustment?.warehouseId}>
   {isRejected && adjustment?.reject && (
    <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl flex items-center gap-3 mb-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
     <AlertCircle className="w-5 h-5 shrink-0" />
     <p className="text-label-sm font-medium">
      {t('rejection_reason_banner', { reason: adjustment.reject })}
     </p>
    </div>
   )}
   <AdjustmentForm 
    document={adjustment}
    id={id}
    isLocked={locked}
    onConflict={conflict.triggerConflict}
   />
   <ConflictDialog 
    open={conflict.open} 
    onClose={conflict.handleClose} 
    onReload={conflict.handleReload} 
   />
  </ScopeGuard>
 );
}
