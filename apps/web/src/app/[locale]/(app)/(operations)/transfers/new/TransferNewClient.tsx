'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';

import { useParams } from 'next/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { useWarehouses } from '@/features/warehouses/api/useWarehouses';
import { useItems } from '@/features/items/api/useItems';
import { useCreateTransfer } from '@/features/operations/hooks/useCreateTransfer';
import { useWarehouseLock } from '@/hooks/useWarehouseLock';
import { LockBanner } from '@/components/shared/LockBanner';
import { DocumentLineItemTable } from '@/components/shared/DocumentLineItemTable/DocumentLineItemTable';
import { ScanInput } from '@/components/shared/ScanInput/ScanInput';
import { SmartCombobox } from '@/components/shared/SmartCombobox';
import { FormFooter } from '@/components/shared/FormFooter';
import { toast } from 'sonner';
import { audioAlerts } from '@/utils/audio';

import { Save, Warehouse, PackagePlus } from 'lucide-react';
import { useUnsavedChangesGuard } from '@/lib/unsaved-changes/useUnsavedChangesGuard';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { ErrorState } from '@/components/shared/ErrorState';
import { useAbortController } from '@/hooks/useAbortController';

interface NewTransferLine {
  id: string;
  item_id: string;
  item: {
    id: string;
    code: string;
    name_ar: string;
    name_en: string;
    primary_uom: { code: string };
  };
  qty: number;
  uom_id: string;
}

export function TransferNewClient() {
  const params = useParams();
  const locale = (params.locale as 'ar' | 'en') || 'en';
  const t = useTranslations('operations.transfer');
  const tCommon = useTranslations('common');
  const abortController = useAbortController();
  const { data: warehouses, isLoading: isLoadingWarehouses, error: errorWarehouses } = useWarehouses();
  const { data: items, isLoading: isLoadingItems, error: errorItems } = useItems();
  const createTransfer = useCreateTransfer();

  const [fromWarehouseId, setFromWarehouseId] = useState('');
  const [toWarehouseId, setToWarehouseId] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<NewTransferLine[]>([]);

  const [idempotencyKey] = useState(() => crypto.randomUUID());

  // Unsaved changes guard
  const isDirty = fromWarehouseId !== '' || toWarehouseId !== '' || notes !== '' || lines.length > 0;
  const { router } = useUnsavedChangesGuard(isDirty);

  // Warehouse locks
  const { data: fromLockState } = useWarehouseLock(fromWarehouseId);
  const { data: toLockState } = useWarehouseLock(toWarehouseId);
  const isEitherLocked = !!fromLockState?.isLocked || !!toLockState?.isLocked;

  const handleAddItem = (barcode: string) => {
    const item = items?.find(i => i.barcode === barcode || i.code === barcode);
    if (!item) {
      audioAlerts.playScanInvalid();
      toast.error(tCommon('no_item_found') || "Item not found.");
      return;
    }

    setLines(prev => {
      const existing = prev.find(l => l.item_id === item.id);
      if (existing) {
        return prev.map(l => l.item_id === item.id ? { ...l, qty: l.qty + 1 } : l);
      }
      return [...prev, {
        id: `temp-${item.id}-${Date.now()}`,
        item_id: item.id,
        item: {
          id: item.id,
          code: item.code,
          name_ar: item.name_ar,
          name_en: item.name_en,
          primary_uom: { code: item.primary_uom.code }
         },
        qty: 1,
        uom_id: item.primary_uom.id
      }];
    });

    audioAlerts.playScanSuccess();
  };

  const handleSave = () => {
    if (!fromWarehouseId || !toWarehouseId || lines.length === 0) return;
    
    createTransfer.mutate({
      payload: {
        from_warehouse_id: fromWarehouseId,
        to_warehouse_id: toWarehouseId,
        notes,
        lines: lines.map(l => ({
          item_id: l.item_id,
          qty: l.qty,
          uom_id: l.uom_id
        }))
      },
      signal: abortController.signal,
      headers: {
        'X-Idempotency-Key': idempotencyKey
      }
    }, {
      onSuccess: () => {
        router.push(`/transfers`, { skipGuard: true });
      }
    });
  };

  const isValid = !!(fromWarehouseId && toWarehouseId && fromWarehouseId !== toWarehouseId && lines.length > 0);

  if (isLoadingWarehouses || isLoadingItems) return <PageSkeleton />;
  if (errorWarehouses || errorItems) return <ErrorState onRetry={() => window.location.reload()} />;

  return (
    <form 
      onSubmit={(e) => {
        e.preventDefault();
        handleSave();
      }}
      className="p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000 pb-32"
    >
      <Breadcrumb 
        items={[
          { label: tCommon('modules.operations'), href: `/transfers` },
          { label: t('title'), href: `/transfers` },
          { label: t('create_new') }
        ]} 
      />

      <PageHeader
        title={t('create_new')}
        description={t('description')}
      />

      <div className="space-y-2">
        {fromLockState?.isLocked && <LockBanner lockState={fromLockState} />}
        {toLockState?.isLocked && toLockState.sessionId !== fromLockState?.sessionId && (
          <LockBanner lockState={toLockState} />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-8">
          <div className="bg-surface-container-low/50 p-8 rounded-[2.5rem] border border-white/5 relative overflow-hidden shadow-2xl">
            <div className={`absolute top-0 inset-x-0 h-1 ${locale === 'ar' ? 'bg-gradient-to-l' : 'bg-gradient-to-r'} from-cyan-500/50 via-cyan-500/20 to-transparent`} />
            
            <div className="flex items-center gap-3 mb-6">
              <Warehouse className="w-4 h-4 text-cyan-500" />
              <h3 className="text-label-sm font-semibold uppercase tracking-wider text-foreground/70">
                {t('transfer_parameters')}
              </h3>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-label-sm font-semibold uppercase text-muted-foreground/70 ms-1">
                  {t('from_warehouse')}
                </label>
                <Select
                  value={fromWarehouseId}
                  onValueChange={(val) => setFromWarehouseId(val || '')}
                >
                  <SelectTrigger className="w-full bg-surface-container-highest/40 border-none h-11 px-6 text-label-sm font-bold rounded-2xl shadow-inner shadow-black/5 focus:ring-2 focus:ring-cyan-500/20 transition-all">
                    <SelectValue placeholder={t('select_warehouse')} />
                  </SelectTrigger>
                  <SelectContent className="bg-surface-container-highest border border-surface-container-high/50 shadow-2xl rounded-2xl overflow-hidden">
                    {warehouses?.map((wh) => (
                      <SelectItem key={wh.id} value={wh.id} className="text-label-sm font-bold py-3 focus:bg-cyan-500/10 focus:text-cyan-400">
                        {locale === 'ar' ? wh.name_ar : wh.name_en}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-label-sm font-semibold uppercase text-muted-foreground/70 ms-1">
                  {t('to_warehouse')}
                </label>
                <Select
                  value={toWarehouseId}
                  onValueChange={(val) => setToWarehouseId(val || '')}
                >
                  <SelectTrigger className="w-full bg-surface-container-highest/40 border-none h-11 px-6 text-label-sm font-bold rounded-2xl shadow-inner shadow-black/5 focus:ring-2 focus:ring-cyan-500/20 transition-all">
                    <SelectValue placeholder={t('select_warehouse')} />
                  </SelectTrigger>
                  <SelectContent className="bg-surface-container-highest border border-surface-container-high/50 shadow-2xl rounded-2xl overflow-hidden">
                    {warehouses?.map((wh) => (
                      <SelectItem key={wh.id} value={wh.id} className="text-label-sm font-bold py-3 focus:bg-cyan-500/10 focus:text-cyan-400">
                        {locale === 'ar' ? wh.name_ar : wh.name_en}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fromWarehouseId && toWarehouseId && fromWarehouseId === toWarehouseId && (
                  <p className="text-label-xxs font-bold text-status-error uppercase px-1 mt-1">
                    {t('warehouse_match_error')}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-label-sm font-semibold uppercase text-muted-foreground/70 ms-1">
                  {tCommon('notes')}
                </label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder={t('notes_placeholder')}
                  className="w-full bg-surface-container-highest/40 border border-white/5 rounded-2xl p-4 font-medium text-body-md focus:ring-2 focus:ring-cyan-500/30 transition-all outline-none resize-none min-h-[120px] hover:bg-surface-container-highest/60"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-surface-container-low/50 p-8 rounded-[2.5rem] border border-white/5 relative overflow-hidden shadow-2xl">
            <div className={`absolute top-0 inset-x-0 h-1 ${locale === 'ar' ? 'bg-gradient-to-l' : 'bg-gradient-to-r'} from-emerald-500/50 via-emerald-500/20 to-transparent`} />
            
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <PackagePlus className="w-5 h-5 text-emerald-500" />
                <h3 className="text-label-sm font-semibold uppercase tracking-wider text-foreground/70">
                  {t('items_to_transfer')}
                </h3>
              </div>
              <div className="flex items-center gap-2 px-4 py-1.5 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-label-xxs font-semibold uppercase text-emerald-500">
                  {lines.length} {tCommon('items')}
                </span>
              </div>
            </div>

            <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
              <div className="space-y-2">
                <label className="text-label-xs font-semibold uppercase text-muted-foreground/40 ms-1">
                  {locale === 'ar' ? 'مسح الباركود' : 'Barcode Scanner'}
                </label>
                <ScanInput 
                  onScan={handleAddItem}
                  placeholder={t('scan_item_placeholder')} 
                  className="w-full"
                  scannerMode={true}
                  size="lg"
                />
              </div>
              <div className="space-y-2">
                <label className="text-label-xs font-semibold uppercase text-muted-foreground/40 ms-1">
                  {locale === 'ar' ? 'البحث عن صنف' : 'Search / Add Item'}
                </label>
                <SmartCombobox
                  items={items || []}
                  onSelect={(item) => handleAddItem(item.code)}
                  placeholder={locale === 'ar' ? 'ابحث عن صنف لإضافته...' : 'Search item to add...'}
                />
              </div>
            </div>

            <div className="bg-surface-container-low/30 rounded-[2rem] border border-white/5 overflow-hidden">
              <DocumentLineItemTable
                lines={lines}
                locale={locale}
                isReadOnly={false}
                onRemoveLine={(id) => setLines(prev => prev.filter(l => l.id !== id))}
                hideLotColumns={true}
                dense={true}
                headers={{
                  code: tCommon('table_headers.code'),
                  name: tCommon('table_headers.name'),
                  qty: tCommon('table_headers.qty'),
                  uom: tCommon('table_headers.uom'),
                }}
                renderQty={(line) => (
                  <div className="flex justify-center">
                    <input
                      type="number"
                      min="0.001"
                      step="0.001"
                      value={line.qty}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setLines(prev => prev.map(l => l.id === line.id ? { ...l, qty: val || 0 } : l));
                      }}
                      className="w-24 bg-surface-container-highest/60 border border-white/5 rounded-lg text-center py-1.5 font-mono text-body-md font-semibold focus:ring-2 focus:ring-cyan-500/30 outline-none transition-all hover:bg-surface-container-highest/80 disabled:opacity-50"
                    />
                  </div>
                )}
              />
            </div>
          </div>
        </div>
      </div>

      <FormFooter
        onCancel={() => router.push('/transfers', { skipGuard: true })}
        onSubmit={handleSave}
        isSaving={createTransfer.isPending}
        isDirty={isDirty}
        isValid={isValid}
        isLocked={false}
        saveLabel={t('save_transfer')}
      />
    </form>
  );
}
