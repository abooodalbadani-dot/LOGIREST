'use client';

import { use, useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { DocumentReadOnlyOverlay } from '@/components/shared/DocumentReadOnlyOverlay';
import { DocumentLineItemTable } from '@/components/shared/DocumentLineItemTable/DocumentLineItemTable';
import { PostConfirmDialog } from '@/components/shared/PostConfirmDialog';
import { LockBanner } from '@/components/shared/LockBanner';
import { useTransfer, TransferLine } from '@/features/operations/hooks/useTransfer';
import { useCreateTransfer } from '@/features/operations/hooks/useCreateTransfer';
import { useShipTransfer } from '@/features/operations/hooks/useShipTransfer';
import { useReceiveTransfer } from '@/features/operations/hooks/useReceiveTransfer';
import { usePostTransfer } from '@/features/operations/hooks/usePostTransfer';
import { useWarehouseLock } from '@/hooks/useWarehouseLock';
import { Truck, PackageCheck, Send } from 'lucide-react';
import { format } from 'date-fns';

export default function TransferDetailPage(props: { params: Promise<{ locale: string; id: string }> }) {
  const params = use(props.params);
  const { locale, id } = params;
  const t = useTranslations('operations.transfer');
  const tCommon = useTranslations('common');
  const router = useRouter();

  const isNew = id === 'new';

  const { data: transfer, isLoading } = useTransfer(isNew ? null : id);
  const createTransfer = useCreateTransfer();
  const shipTransfer = useShipTransfer();
  const receiveTransfer = useReceiveTransfer(id);
  const postTransfer = usePostTransfer();

  const [fromWarehouseId, setFromWarehouseId] = useState('wh-1');
  const [toWarehouseId, setToWarehouseId] = useState('wh-3');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<(TransferLine & { _receivedQty?: number })[]>([]);
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
      setFromWarehouseId(transfer.from_warehouse_id);
      setToWarehouseId(transfer.to_warehouse_id);
      setNotes(transfer.notes ?? '');
      setLines(transfer.lines.map(l => ({ ...l, _receivedQty: l.received_qty ?? l.qty })));
    }
  }, [transfer]);

  const transferStatus = transfer?.transfer_status ?? 'DRAFT';
  const isPosted = transferStatus === 'POSTED';
  const isInTransit = transferStatus === 'IN_TRANSIT';
  const isDraft = transferStatus === 'DRAFT';

  const handleSaveDraft = async () => {
    try {
      const result = await createTransfer.mutateAsync({
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
      await receiveTransfer.mutateAsync({ lines: receiveLines, confirmation: 'ACKNOWLEDGE_IRREVERSIBLE' });
      setPostDialogOpen(false);
      router.push(`/${locale}/transfers`);
    } catch (e) {
      console.error(e);
    }
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="space-y-6 pb-20">
      <PageHeader
        title={isNew ? t('create_new') : t('detail_title') + ' – ' + (transfer?.document_number ?? '')}
        actions={
          <div className="flex gap-2 items-center">
            {!isNew && <StatusBadge status={transferStatus as any} />}
            {isNew && (
              <Button onClick={handleSaveDraft} disabled={createTransfer.isPending}>
                {t('save_draft')}
              </Button>
            )}
            {isDraft && !isNew && (
              <div title={isEitherLocked ? t('warehouse_locked') : undefined}>
                <Button
                  disabled={isEitherLocked || shipTransfer.isPending}
                  onClick={() => setShipDialogOpen(true)}
                >
                  <Truck className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
                  {t('ship')}
                </Button>
              </div>
            )}
            {isInTransit && (
              <div title={isEitherLocked ? t('warehouse_locked') : undefined}>
                <Button
                  disabled={isEitherLocked || receiveTransfer.isPending}
                  onClick={() => setPostDialogOpen(true)}
                >
                  <PackageCheck className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
                  {t('confirm_receipt')}
                </Button>
              </div>
            )}
          </div>
        }
      />

      {/* Dual warehouse lock banners */}
      {isFromLocked && <LockBanner lockState={fromLockState} />}
      {isToLocked && toLockState?.session_id !== fromLockState?.session_id && (
        <LockBanner lockState={toLockState} />
      )}

      {/* Header fields */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-surface-1 p-4 rounded-lg border border-surface-3">
        <div>
          <label className="text-sm text-muted-foreground block mb-1">{t('from_warehouse')}</label>
          <select
            value={fromWarehouseId}
            onChange={e => setFromWarehouseId(e.target.value)}
            disabled={!isNew}
            className="w-full bg-surface-2 border border-surface-3 rounded p-2"
          >
            <option value="wh-1">Warehouse 1 (Main)</option>
            <option value="wh-2">Warehouse 2 (Dry)</option>
            <option value="wh-3">Warehouse 3 (Cold)</option>
          </select>
        </div>
        <div>
          <label className="text-sm text-muted-foreground block mb-1">{t('to_warehouse')}</label>
          <select
            value={toWarehouseId}
            onChange={e => setToWarehouseId(e.target.value)}
            disabled={!isNew}
            className="w-full bg-surface-2 border border-surface-3 rounded p-2"
          >
            <option value="wh-1">Warehouse 1 (Main)</option>
            <option value="wh-2">Warehouse 2 (Dry)</option>
            <option value="wh-3">Warehouse 3 (Cold)</option>
          </select>
        </div>
        {transfer?.shipped_at && (
          <div>
            <label className="text-sm text-muted-foreground block mb-1">{t('shipped_at')}</label>
            <div className="py-2 text-sm font-mono" dir="ltr">
              {format(new Date(transfer.shipped_at), 'MMM dd, yyyy HH:mm')}
            </div>
          </div>
        )}
        <div className="col-span-2 md:col-span-4">
          <label className="text-sm text-muted-foreground block mb-1">{tCommon('notes')}</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            disabled={!isNew}
            className="w-full bg-surface-2 border border-surface-3 rounded p-2"
            rows={2}
          />
        </div>
      </div>

      {/* Line items */}
      <DocumentReadOnlyOverlay isPosted={isPosted}>
        <DocumentLineItemTable
          lines={lines}
          locale={locale as 'ar' | 'en'}
          isReadOnly={isPosted || isDraft}
          onRemoveLine={() => {}}
          hideLotColumns={true}
          headers={{
            code: 'Item Code',
            name: 'Item Name',
            qty:  'Transfer Qty',
            uom:  'UoM',
          }}
          extraColumns={[
            {
              header: t('shipped_qty'),
              cell: (line: any) => (
                <span dir="ltr" className="font-mono text-sm">
                  {line.shipped_qty ?? line.qty}
                </span>
              ),
            },
            {
              header: t('received_qty'),
              cell: (line: any) =>
                isInTransit ? (
                  <input
                    type="number"
                    className="w-20 bg-surface-2 border border-surface-3 rounded text-center px-2 py-1"
                    value={line._receivedQty ?? line.qty}
                    onChange={e => {
                      const val = Number(e.target.value);
                      setLines(prev =>
                        prev.map(l => l.id === line.id ? { ...l, _receivedQty: val } : l)
                      );
                    }}
                  />
                ) : (
                  <span dir="ltr" className="font-mono text-sm text-muted-foreground">
                    {line.received_qty ?? '—'}
                  </span>
                ),
            },
          ]}
        />
      </DocumentReadOnlyOverlay>

      {/* Ship dialog */}
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

      {/* Receive & Post dialog */}
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
