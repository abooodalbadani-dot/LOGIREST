'use client';

import { useTranslations } from 'next-intl';
import { useKitchenRequest } from '@/features/operations/hooks/useKitchenRequests';
import { AlertCircle } from 'lucide-react';
import { KitchenRequestForm } from './KitchenRequestForm';
import { useConflictHandler } from '@/core/concurrency/useConflictHandler';
import { ConflictDialog } from '@/core/concurrency/ConflictDialog';

export function KitchenRequestDetailClient({ id, locale }: { id: string; locale: 'ar' | 'en' }) {
  const t = useTranslations('operations.kitchen_request');
  const { data: request, isLoading } = useKitchenRequest(id);
  
  const conflict = useConflictHandler('kitchen-requests', id);

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="w-12 h-12 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
      <p className="text-label-xs font-semibold uppercase text-muted-foreground/40">{t('loading')}</p>
    </div>
  );

  if (!request) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <AlertCircle className="w-12 h-12 text-red-500/20" />
      <p className="text-label-xs font-semibold uppercase text-muted-foreground/40">{t('not_found')}</p>
    </div>
  );

  return (
    <>
      <KitchenRequestForm 
        request={request} 
        locale={locale} 
      />
      <ConflictDialog 
        open={conflict.open}
        onClose={conflict.handleClose}
        onReload={conflict.handleReload}
      />
    </>
  );
}

