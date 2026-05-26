'use client';

import { useTranslations, useLocale } from 'next-intl';
import { isDocumentLocked, type DocumentStatus } from '@logirest/shared-types';
import { ActionGuard } from '@/core/workflow/ActionGuard';
import { useGRN } from '@/features/purchasing/hooks/useGRN';
import { useAuth } from '@/providers/AuthProvider';

import { GRNForm } from '@/features/purchasing/components/grn-form';
import { GRNViewer, type GRNViewerDocument } from './GRNViewer';
import { Button } from '@/components/ui/button';
import { VoidButton } from '@/components/shared/VoidButton';
import { Send, Scan } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import { useConflictHandler } from '@/core/concurrency/useConflictHandler';
import { ConflictDialog } from '@/core/concurrency/ConflictDialog';
import { GRN_STATUS } from '@logirest/shared-types';

interface GRNDetailClientProps {
  id: string;
}

import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { ErrorState } from '@/components/shared/ErrorState';

/**
 * GRNDetailClient - Dispatcher Pattern
 * Switches between GRNForm (Editable) and GRNViewer (Locked/Immutable)
 */
export function GRNDetailClient({ id }: GRNDetailClientProps) {
  const t = useTranslations('procurement.grn');
  const locale = useLocale() as 'ar' | 'en';
  const router = useRouter();
  const { user } = useAuth();
  
  const isNew = id === 'new';
  const { data: grn, isLoading, error } = useGRN(isNew ? null : id);
  const { open, handleReload, handleClose, triggerConflict } = useConflictHandler('goods-received', id);

  if (isLoading) return <PageSkeleton variant="detail" />;
  if (error || (!isNew && !grn)) return <ErrorState onRetry={() => window.location.reload()} />;

  const status = (grn?.status || GRN_STATUS.DRAFT) as DocumentStatus;
  const isLocked = isDocumentLocked('GRN', status);

    const actions = (
      <div className="flex gap-2 items-center">
        {isLocked ? (
          <Button
            onClick={() => router.push(`/goods-received/${id}/scan-mode`)}
            variant="outline"
            className="h-10 px-6 text-label-xs font-semibold uppercase rounded-lg border-status-warning/20 text-status-warning hover:bg-status-warning/5 transition-all"
          >
            <Scan className="w-4 h-4 me-2" />
            {t('inspect_scan_registers')}
          </Button>
        ) : (
          <Button
            onClick={() => router.push(`/goods-received/${id}/scan-mode`)}
            variant="outline"
            className="h-10 px-6 text-label-xs font-semibold uppercase rounded-lg border-primary/20 text-primary hover:bg-primary/5 transition-all"
          >
            <Scan className="w-4 h-4 me-2" />
            {t('scan_mode')}
          </Button>
        )}
        <ActionGuard documentType="GRN" status={status} action="POST" role={user?.role}>
          <Button 
            onClick={() => router.push(`/goods-received/${id}/post`)}
            className="h-10 px-8 primary-gradient text-white text-label-xs font-semibold uppercase shadow-xl shadow-primary/20 transition-all rounded-lg"
          >
            <Send className="w-4 h-4 me-2" />
            {t('post_grn')}
          </Button>
        </ActionGuard>
        <VoidButton
          documentId={id}
          documentType="GRN"
          status={status}
          version={grn?.version || 1}
        />
      </div>
  );

  if (isLocked) {
    if (!grn) return null;
    return (
      <>
        <GRNViewer 
          document={{
            ...grn,
            status: grn.status as DocumentStatus,
            created_at: grn.created_at ?? '',
            created_by: grn.created_by ?? '',
            updated_at: grn.updated_at ?? '',
            fx_rate_captured_at: grn.fx_rate_captured_at ?? null,
            type: 'GRN' as const,
            branch_id: '',
            posted_at: null,
            posted_by: null,
            supplier_name: grn.supplier?.name,
            po_number: grn.po_number ?? null,
            lines: grn.lines.map(l => ({
              id: l.id,
              document_id: '',
              item_id: l.item.id,
              item: {
                id: l.item.id,
                code: l.item.code,
                name_ar: l.item.name_ar,
                name_en: l.item.name_en,
                primary_uom: {
                  id: l.item.primary_uom.id,
                  code: l.item.primary_uom.code,
                  name_ar: '',
                  name_en: '',
                },
              },
              lot_id: l.lot?.id ?? null,
              lot: l.lot ? { ...l.lot, is_expired: false } : null,
              qty: l.qty,
              uom_id: l.uom_id,
              unit_cost: null,
              po_qty: null,
              received_qty: l.received_qty,
              unit_cost_foreign: l.unit_cost_foreign ?? 0,
              unit_cost_base: l.unit_cost_base ?? 0,
            })),
          }} 
          locale={locale} 
          actions={actions}
        />
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
      <GRNForm 
        initialData={grn} 
        id={id} 
        actions={actions}
        onConflict={triggerConflict}
              />
      <ConflictDialog 
        open={open}
        onReload={handleReload}
        onClose={handleClose}
      />
    </>
  );
}
