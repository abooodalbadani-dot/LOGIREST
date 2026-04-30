'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { Button } from '@/components/ui/button';
import { StatusBadge, type BadgeStatus } from '@/components/ui/status-badge';
import { DocumentReadOnlyOverlay } from '@/components/shared/DocumentReadOnlyOverlay';
import { DocumentLineItemTable } from '@/components/shared/DocumentLineItemTable/DocumentLineItemTable';
import { PostConfirmDialog } from '@/components/shared/PostConfirmDialog';
import { LockBanner } from '@/components/shared/LockBanner';
import { useTransfer, TransferLine } from '@/features/operations/hooks/useTransfer';
import { useCreateTransfer } from '@/features/operations/hooks/useCreateTransfer';
import { useShipTransfer } from '@/features/operations/hooks/useShipTransfer';
import { useReceiveTransfer } from '@/features/operations/hooks/useReceiveTransfer';
import { useWarehouseLock } from '@/hooks/useWarehouseLock';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { Truck, PackageCheck } from 'lucide-react';
import { format } from 'date-fns';

export function TransferDetailClient({ id, locale }: { id: string; locale: 'ar' | 'en' }) {
  const t = useTranslations('operations.transfer');
  const tCommon = useTranslations('common');
  const router = useRouter();

  const isNew = id === 'new';

  const { data: transfer, isLoading } = useTransfer(isNew ? null : id);
  const createTransfer = useCreateTransfer();
  const shipTransfer = useShipTransfer();
  const receiveTransfer = useReceiveTransfer(id);

  const [fromWarehouseId, setFromWarehouseId] = useState('wh-1');
  const [toWarehouseId, setToWarehouseId] = useState('wh-3');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<(TransferLine & { _receivedQty?: number })[]>([]);
  const [varianceReason, setVarianceReason] = useState('');
  const [shipDialogOpen, setShipDialogOpen] = useState(false);
  const [postDialogOpen, setPostDialogOpen] = useState(false);

  // Dual warehouse lock
  const { data: fromLockState } = useWarehouseLock(fromWarehouseId);
  const { data: toLockState } = useWarehouseLock(toWarehouseId);
  const isFromLocked = fromLockState?.is_locked ?? false;
  const isToLocked = toLockState?.is_locked ?? false;
  const isEitherLocked = isFromLocked || isToLocked;

  useEffect(() => {
    if (transfer) {
      const timer = setTimeout(() => {
        setFromWarehouseId(transfer.from_warehouse_id);
        setToWarehouseId(transfer.to_warehouse_id);
        setNotes(transfer.notes ?? '');
        setLines(transfer.lines.map(l => ({ ...l, _receivedQty: l.received_qty ?? l.qty })));
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [transfer]);

  const transferStatus = transfer?.transfer_status ?? 'DRAFT';
  const isPosted = ['POSTED', 'RECEIVED'].includes(transferStatus);
  const isInTransit = transferStatus === 'IN_TRANSIT';
  const isDraft = transferStatus === 'DRAFT';

  const hasVariance = lines.some(l => (l._receivedQty ?? l.qty) !== (l.shipped_qty ?? l.qty));
  const isVarianceValid = !hasVariance || varianceReason.trim().length >= 10;

  const handleSaveDraft = async () => {
    try {
      await createTransfer.mutateAsync({
        from_warehouse_id: fromWarehouseId,
        to_warehouse_id: toWarehouseId,
        notes,
        lines: []
      });
      router.push(`/${locale}/transfers`);
    } catch (e) {
      console.error(e);
    }
  };

  const handleShip = async () => {
    try {
      await shipTransfer.mutateAsync(id);
      setShipDialogOpen(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleReceiveAndPost = async () => {
    try {
      const receiveLines = lines.map(l => ({
        line_id: l.id,
        received_qty: l._receivedQty ?? l.qty
      }));
      await receiveTransfer.mutateAsync({ 
        lines: receiveLines, 
        confirmation: 'ACKNOWLEDGE_IRREVERSIBLE',
        variance_reason: hasVariance ? varianceReason : undefined
      });
      setPostDialogOpen(false);
      router.push(`/${locale}/transfers`);
    } catch (e) {
      console.error(e);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <div className="relative w-24 h-24 flex items-center justify-center">
          <div className="absolute inset-0 border-4 border-cyan-500/10 rounded-full" />
          <div className="absolute inset-0 border-4 border-t-cyan-500 rounded-full animate-spin" />
          <span className="text-2xl font-black text-cyan-500 tracking-tighter">TRN</span>
        </div>
        <div className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-500 animate-pulse">
          {t('retrieving_manifest')}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <Breadcrumb 
        items={[
          { label: tCommon('modules.operations'), href: `/${locale}/transfers` },
          { label: t('title'), href: `/${locale}/transfers` },
          { label: isNew ? t('create_new') : t('detail_title') }
        ]} 
      />

      <PageHeader
        title={isNew ? t('create_new') : t('detail_title')}
        description={!isNew ? (
          <div className="flex items-center gap-2">
            <span>{tCommon('doc_number')}</span>
            <span dir="ltr" className="font-mono text-cyan-500/80 tracking-widest">{transfer?.document_number}</span>
          </div>
        ) : undefined}
        actions={
          <div className="flex gap-4 items-center">
            {!isNew && <StatusBadge status={transferStatus as BadgeStatus} />}
            {isNew && (
              <PermissionGate action="create" resource="transfer">
                <Button 
                  onClick={handleSaveDraft} 
                  disabled={createTransfer.isPending}
                  className="bg-surface-container-high hover:bg-surface-container-highest text-foreground border border-white/5 rounded-xl h-11 px-6 text-[10px] font-black uppercase tracking-widest transition-all"
                >
                  {t('save_draft')}
                </Button>
              </PermissionGate>
            )}
            {isDraft && !isNew && (
              <PermissionGate action="post" resource="transfer">
                <div title={isEitherLocked ? tCommon('warehouse_locked') : undefined}>
                  <Button
                    disabled={isEitherLocked || shipTransfer.isPending}
                    onClick={() => setShipDialogOpen(true)}
                    className="bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl h-11 px-8 text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-cyan-900/20"
                  >
                    <Truck className="w-4 h-4 me-2" />
                    {t('ship')}
                  </Button>
                </div>
              </PermissionGate>
            )}
            {isInTransit && (
              <PermissionGate action="post" resource="transfer">
                <div title={isEitherLocked ? tCommon('warehouse_locked') : !isVarianceValid ? t('variance_required_error') : undefined}>
                  <Button
                    disabled={isEitherLocked || receiveTransfer.isPending || !isVarianceValid}
                    onClick={() => setPostDialogOpen(true)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl h-11 px-8 text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-900/20 disabled:opacity-50"
                  >
                    <PackageCheck className="w-4 h-4 me-2" />
                    {t('confirm_receipt')}
                  </Button>
                </div>
              </PermissionGate>
            )}
          </div>
        }
      />

      <div className="space-y-2">
        {isFromLocked && <LockBanner lockState={fromLockState} />}
        {isToLocked && toLockState?.session_id !== fromLockState?.session_id && (
          <LockBanner lockState={toLockState} />
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8 bg-surface-container-low/50 p-8 rounded-2xl border border-white/5 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-e from-cyan-500/50 via-cyan-500/20 to-transparent" />

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 ms-1">{t('from_warehouse')}</label>
          <div className="relative group">
            <select
              value={fromWarehouseId}
              onChange={e => setFromWarehouseId(e.target.value)}
              disabled={!isNew}
              className="w-full bg-surface-container-highest/40 border border-white/5 rounded-xl p-4 font-bold text-sm focus:ring-2 focus:ring-cyan-500/30 transition-all outline-none appearance-none disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed group-hover:bg-surface-container-highest/60"
            >
              <option value="wh-1" className="bg-surface-container-highest text-foreground font-medium">{tCommon('warehouses.main')}</option>
              <option value="wh-2" className="bg-surface-container-highest text-foreground font-medium">{tCommon('warehouses.kitchen')}</option>
              <option value="wh-3" className="bg-surface-container-highest text-foreground font-medium">{tCommon('warehouses.pastry')}</option>
            </select>
            <div className="absolute end-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7"/></svg>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 ms-1">{t('to_warehouse')}</label>
          <div className="relative group">
            <select
              value={toWarehouseId}
              onChange={e => setToWarehouseId(e.target.value)}
              disabled={!isNew}
              className="w-full bg-surface-container-highest/40 border border-white/5 rounded-xl p-4 font-bold text-sm focus:ring-2 focus:ring-cyan-500/30 transition-all outline-none appearance-none disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed group-hover:bg-surface-container-highest/60"
            >
              <option value="wh-1" className="bg-surface-container-highest text-foreground font-medium">{tCommon('warehouses.main')}</option>
              <option value="wh-2" className="bg-surface-container-highest text-foreground font-medium">{tCommon('warehouses.kitchen')}</option>
              <option value="wh-3" className="bg-surface-container-highest text-foreground font-medium">{tCommon('warehouses.pastry')}</option>
            </select>
            <div className="absolute end-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7"/></svg>
            </div>
          </div>
        </div>

        {transfer?.shipped_at && (
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 ms-1">{t('shipped_at')}</label>
            <div className="bg-surface-container-highest/30 border border-white/5 rounded-xl p-4 flex items-center justify-between">
               <span dir="ltr" className="font-mono text-sm font-bold text-cyan-500/80">
                {format(new Date(transfer.shipped_at), 'MMM dd, yyyy HH:mm')}
               </span>
               <Truck className="w-4 h-4 text-cyan-500/40" />
            </div>
          </div>
        )}

        <div className="col-span-1 md:col-span-4 space-y-2">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 ms-1">{tCommon('notes')}</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            disabled={!isNew}
            placeholder={t('notes_placeholder')}
            className="w-full bg-surface-container-highest/40 border border-white/5 rounded-xl p-4 font-medium text-sm focus:ring-2 focus:ring-cyan-500/30 transition-all outline-none resize-none min-h-[100px] hover:bg-surface-container-highest/60"
          />
        </div>

        {isInTransit && hasVariance && (
          <div className="col-span-1 md:col-span-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-500">
            <div className="h-px bg-gradient-to-r from-transparent via-status-warning/20 to-transparent" />
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-status-warning/80">
                  {t('variance_reason')}
                </label>
                <span className="text-[9px] font-bold text-status-warning/60 bg-status-warning/10 px-2 py-0.5 rounded-full border border-status-warning/20">
                  {t('variance_detected')}
                </span>
              </div>
              <textarea
                value={varianceReason}
                onChange={e => setVarianceReason(e.target.value)}
                placeholder={t('variance_reason_placeholder')}
                className={`w-full bg-status-warning/5 border border-status-warning/20 rounded-xl p-4 font-medium text-sm focus:ring-2 focus:ring-status-warning/30 transition-all outline-none resize-none min-h-[100px] hover:bg-status-warning/10 ${
                  !isVarianceValid ? 'ring-1 ring-status-error/30' : ''
                }`}
              />
              {!isVarianceValid && (
                <p className="text-[9px] font-bold text-status-error/80 px-1 tracking-tight">
                  {t('variance_required_error')}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="bg-surface-container-low/30 rounded-2xl border border-white/5 overflow-hidden shadow-2xl">
        <DocumentReadOnlyOverlay isPosted={isPosted}>
          <DocumentLineItemTable
            lines={lines}
            locale={locale as 'ar' | 'en'}
            isReadOnly={isPosted || isDraft}
            onRemoveLine={() => {}}
            hideLotColumns={true}
            headers={{
              code: tCommon('table_headers.code'),
              name: tCommon('table_headers.name'),
              qty:  t('transfer_qty'),
              uom:  tCommon('table_headers.uom'),
            }}
            extraColumns={[
              {
                header: t('shipped_qty'),
                cell: (line: TransferLine & { _receivedQty?: number }) => (
                  <div className="flex justify-center">
                    <span dir="ltr" className="font-mono text-sm font-black bg-surface-container-highest px-3 py-1 rounded-lg border border-white/5">
                      {line.shipped_qty ?? line.qty}
                    </span>
                  </div>
                ),
              },
              {
                header: t('received_qty'),
                cell: (line: TransferLine & { _receivedQty?: number }) => (
                  <div className="flex justify-center">
                    {isInTransit ? (
                      <input
                        type="number"
                        className="w-24 bg-surface-container-highest border border-cyan-500/20 rounded-lg text-center px-2 py-2 font-mono font-bold text-cyan-500 focus:ring-2 focus:ring-cyan-500/40 outline-none transition-all shadow-[0_0_10px_rgba(0,229,255,0.05)]"
                        value={line._receivedQty ?? line.qty}
                        onChange={e => {
                          const val = Number(e.target.value);
                          setLines(prev =>
                            prev.map(l => l.id === line.id ? { ...l, _receivedQty: val } : l)
                          );
                        }}
                      />
                    ) : (
                      <span dir="ltr" className={`font-mono text-sm font-black px-3 py-1 rounded-lg border border-white/5 ${line.received_qty ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-surface-container-highest text-muted-foreground/40'}`}>
                        {line.received_qty ?? '—'}
                      </span>
                    )}
                  </div>
                ),
              },
            ]}
          />
        </DocumentReadOnlyOverlay>
      </div>

      <PostConfirmDialog
        open={shipDialogOpen}
        onOpenChange={setShipDialogOpen}
        title={t('ship_confirm_title')}
        description={t('ship_confirm_desc')}
        warningText={t('ship_confirm_warning')}
        requiresTextConfirmation={false}
        onConfirm={handleShip}
        isLoading={shipTransfer.isPending}
      />

      <PostConfirmDialog
        open={postDialogOpen}
        onOpenChange={setPostDialogOpen}
        title={t('receive_confirm_title')}
        description={t('receive_confirm_desc')}
        warningText={t('receive_confirm_warning')}
        requiresTextConfirmation={true}
        onConfirm={handleReceiveAndPost}
        isLoading={receiveTransfer.isPending}
      />
    </div>
  );
}
