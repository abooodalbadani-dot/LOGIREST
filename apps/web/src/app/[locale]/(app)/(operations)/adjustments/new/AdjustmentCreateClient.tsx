'use client';

import { useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
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
import { Textarea } from '@/components/ui/textarea';
import { useCreateAdjustment } from '@/features/operations/hooks/useCreateAdjustment';
import { useWarehouses } from '@/features/warehouses/api/useWarehouses';
import { useItems } from '@/features/items/api/useItems';
import { useUoMs } from '@/features/uoms/hooks/useUoMs';
import { useWarehouseLock } from '@/hooks/useWarehouseLock';
import { LockBanner } from '@/components/shared/LockBanner';
import { DocumentLineItemTable } from '@/components/shared/DocumentLineItemTable/DocumentLineItemTable';
import { ScanInput } from '@/components/shared/ScanInput/ScanInput';
import { SmartCombobox } from '@/components/shared/SmartCombobox';
import { FormFooter } from '@/components/shared/FormFooter';
import { toast } from 'sonner';
import { audioAlerts } from '@/utils/audio';
import { Save, Package, Info, ArrowUp, ArrowDown, Warehouse, PackagePlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUnsavedChangesGuard } from '@/lib/unsaved-changes/useUnsavedChangesGuard';
import { useAbortController } from '@/hooks/useAbortController';

const REASON_OPTIONS = ['DAMAGE', 'EXPIRY', 'THEFT', 'COUNTING_ERROR', 'CORRECTION', 'OTHER'] as const;

interface NewAdjustmentLine {
  id: string;
  item_id: string;
  item: {
    id: string;
    code: string;
    name_ar: string;
    name_en: string;
    primary_uom: { id: string; code: string };
  };
  qty: number;
  uom_id: string;
  direction: 'INCREASE' | 'DECREASE';
  lot_number?: string;
}

export function AdjustmentCreateClient({ locale }: { locale: 'ar' | 'en' }) {
  const t = useTranslations('operations.adjustment');
  const tCommon = useTranslations('common');
  const abortController = useAbortController();

  const { data: warehouses, isLoading: isLoadingWarehouses } = useWarehouses();
  const { data: items, isLoading: isLoadingItems } = useItems();
  const { data: uomsResult } = useUoMs();
  const createAdjustment = useCreateAdjustment();

  const [warehouseId, setWarehouseId] = useState('');
  const [reasonCategory, setReasonCategory] = useState('DAMAGE');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<NewAdjustmentLine[]>([]);

  const [idempotencyKey] = useState(() => crypto.randomUUID());

  // Unsaved changes guard
  const isDirty = warehouseId !== '' || notes !== '' || lines.length > 0;
  const { router } = useUnsavedChangesGuard(isDirty);

  // Warehouse locking guard
  const { data: lockState } = useWarehouseLock(warehouseId);
  const isLocked = !!lockState?.isLocked;

  const uoms = uomsResult?.data || [];
  const activeUoMs = uoms.filter(u => u.is_active !== false);

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
          primary_uom: { 
            id: item.primary_uom.id,
            code: item.primary_uom.code 
          }
        },
        qty: 1,
        uom_id: item.primary_uom.id,
        direction: 'INCREASE',
        lot_number: ''
      }];
    });

    audioAlerts.playScanSuccess();
  };

  const handleSave = () => {
    if (!warehouseId || lines.length === 0) return;

    createAdjustment.mutate({
      payload: {
        warehouse_id: warehouseId,
        reason: reasonCategory,
        notes,
        lines: lines.map(l => ({
          item_id: l.item_id,
          qty: l.qty,
          uom_id: l.uom_id,
          direction: l.direction,
          lot_allocations: l.lot_number ? [{ lot_id: l.lot_number, qty: l.qty }] : undefined
        }))
      },
      signal: abortController.signal,
      headers: {
        'X-Idempotency-Key': idempotencyKey
      }
    }, {
      onSuccess: () => {
        router.push("/adjustments", { skipGuard: true });
      }
    });
  };

  const showNotesError = notes.length > 0 && notes.length < 10;
  const isValid = !!(
    warehouseId &&
    reasonCategory &&
    notes.length >= 10 &&
    notes.length <= 1000 &&
    lines.length > 0 &&
    lines.every(l => l.qty > 0)
  );

  const extraColumns = [
    {
      header: t('direction') || 'Direction',
      cell: (line: NewAdjustmentLine) => (
        <div className="flex justify-center bg-surface-container-low/40 rounded-lg p-0.5 h-9 w-36 mx-auto">
          <button
            type="button"
            onClick={() => {
              setLines(prev => prev.map(l => l.id === line.id ? { ...l, direction: 'INCREASE' } : l));
            }}
            className={cn(
              "flex flex-1 items-center justify-center gap-1 rounded-md text-[10px] font-bold uppercase transition-all active:scale-[0.95] disabled:opacity-50",
              line.direction === 'INCREASE'
                ? "bg-status-success/15 text-status-success shadow-sm"
                : "text-muted-foreground/30 hover:text-muted-foreground/60"
            )}
          >
            <ArrowUp className="w-3 h-3" />
            {t('direction_increase') || 'Inc'}
          </button>
          <button
            type="button"
            onClick={() => {
              setLines(prev => prev.map(l => l.id === line.id ? { ...l, direction: 'DECREASE' } : l));
            }}
            className={cn(
              "flex flex-1 items-center justify-center gap-1 rounded-md text-[10px] font-bold uppercase transition-all active:scale-[0.95] disabled:opacity-50",
              line.direction === 'DECREASE'
                ? "bg-status-error/15 text-status-error shadow-sm"
                : "text-muted-foreground/30 hover:text-muted-foreground/60"
            )}
          >
            <ArrowDown className="w-3 h-3" />
            {t('direction_decrease') || 'Dec'}
          </button>
        </div>
      )
    },
    {
      header: tCommon('lot_number') || 'Lot Number',
      cell: (line: NewAdjustmentLine) => (
        <div className="flex justify-center">
          <input
            type="text"
            placeholder={t('lot_placeholder') || 'Lot...'}
            value={line.lot_number || ''}
            onChange={(e) => {
              const val = e.target.value;
              setLines(prev => prev.map(l => l.id === line.id ? { ...l, lot_number: val } : l));
            }}
            className="w-32 bg-surface-container-highest/60 border border-white/5 rounded-lg text-center h-9 px-2 font-mono text-label-xs font-semibold focus:ring-2 focus:ring-cyan-500/30 outline-none transition-all hover:bg-surface-container-highest/80 disabled:opacity-50"
          />
        </div>
      )
    }
  ];

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000 pb-32">
      {createAdjustment.error && (
        <div 
          role="alert"
          aria-live="assertive"
          className="bg-status-error/10 border border-status-error/20 p-4 rounded-2xl flex items-start gap-3 animate-in animate-shake duration-500"
        >
          <div className="w-8 h-8 rounded-xl bg-status-error/10 flex items-center justify-center shrink-0">
            <Info className="w-4 h-4 text-status-error" />
          </div>
          <div className="space-y-1">
            <p className="text-body-sm font-bold text-status-error uppercase tracking-tight">
              {tCommon('error.submission_failed')}
            </p>
            <p className="text-body-sm text-status-error/80 leading-relaxed">
              {createAdjustment.error instanceof Error ? createAdjustment.error.message : tCommon('error.generic')}
            </p>
          </div>
        </div>
      )}

      <Breadcrumb
        items={[
          { label: tCommon('inventory') || 'Inventory', href: '#' },
          { label: t('title') || 'Adjustments', href: "/adjustments" },
          { label: t('create_new') || 'New Adjustment' }
        ]}
      />

      <PageHeader
        title={t('create_new')}
        description={t('subtitle')} 
      />

      <LockBanner lockState={lockState} />

      <div className={cn("grid grid-cols-1 lg:grid-cols-3 gap-8", createAdjustment.isPending && "opacity-60 pointer-events-none transition-opacity")}>
        {/* Left Sidebar Panel - Metadata settings (30%) */}
        <div className="lg:col-span-1 space-y-8">
          <div className="bg-surface-container-low/50 p-8 rounded-[2.5rem] border border-white/5 relative overflow-hidden shadow-2xl group">
            {/* Premium Locale-Mirrored Gradient Accent */}
            <div className={cn(
              "absolute top-0 left-0 right-0 h-1 from-cyan-500/50 via-cyan-500/20 to-transparent pointer-events-none",
              locale === 'ar' ? "bg-gradient-to-l" : "bg-gradient-to-r"
            )} />
            
            <div className="flex items-center gap-3 mb-6">
              <Warehouse className="w-4 h-4 text-cyan-500" />
              <h3 className="text-label-sm font-semibold uppercase tracking-wider text-foreground/70">
                {t('details_section')}
              </h3>
            </div>

            <div className="space-y-6">
              {/* Warehouse selection */}
              <div className="space-y-2">
                <label htmlFor="warehouse-select" className="text-label-sm font-semibold uppercase text-muted-foreground/70 ms-1">
                  {tCommon('warehouse')}
                </label>
                <Select
                  value={warehouseId}
                  onValueChange={(val) => setWarehouseId(val || '')}
                >
                  <SelectTrigger id="warehouse-select" className="w-full bg-surface-container-highest/40 border-none h-11 px-6 text-label-sm font-bold rounded-2xl shadow-inner shadow-black/5 focus:ring-2 focus:ring-cyan-500/20 transition-all">
                    <SelectValue placeholder={tCommon('select_warehouse')} />
                  </SelectTrigger>
                  <SelectContent className="bg-surface-container-highest border border-surface-container-high/50 shadow-2xl rounded-2xl overflow-hidden">
                    {isLoadingWarehouses ? (
                      <div className="p-4 space-y-2">
                        <div className="h-4 bg-surface-container-low animate-pulse rounded w-3/4" />
                        <div className="h-4 bg-surface-container-low animate-pulse rounded w-1/2" />
                      </div>
                    ) : warehouses?.length === 0 ? (
                      <div className="p-4 text-center text-label-xs text-muted-foreground italic">
                        {tCommon('no_data')}
                      </div>
                    ) : (
                      warehouses?.map(w => (
                        <SelectItem key={w.id} value={w.id} className="text-label-sm font-bold py-3 focus:bg-cyan-500/10 focus:text-cyan-400">
                          {locale === 'ar' ? w.name_ar : w.name_en}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Reason Category */}
              <div className="space-y-2">
                <label htmlFor="reason-select" className="text-label-sm font-semibold uppercase text-muted-foreground/70 ms-1">
                  {t('reason')}
                </label>
                <Select
                  value={reasonCategory}
                  onValueChange={(val) => setReasonCategory(val || 'DAMAGE')}
                >
                  <SelectTrigger id="reason-select" className="w-full bg-surface-container-highest/40 border-none h-11 px-6 text-label-sm font-bold rounded-2xl shadow-inner shadow-black/5 focus:ring-2 focus:ring-cyan-500/20 transition-all">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-surface-container-highest border border-surface-container-high/50 shadow-2xl rounded-2xl overflow-hidden">
                    {REASON_OPTIONS.map(r => (
                      <SelectItem key={r} value={r} className="text-label-sm font-bold py-3 focus:bg-cyan-500/10 focus:text-cyan-400">
                        {t(`reasons.${r.toLowerCase()}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Reason details / notes */}
              <div className="space-y-2">
                <label htmlFor="notes-area" className="text-label-sm font-semibold uppercase text-muted-foreground/70 ms-1">
                  {tCommon('notes')}
                </label>
                <Textarea
                  id="notes-area"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t('notes_placeholder')}
                  className="w-full bg-surface-container-highest/40 border border-white/5 rounded-2xl p-4 font-medium text-body-md focus:ring-2 focus:ring-cyan-500/30 transition-all outline-none resize-none min-h-[140px] hover:bg-surface-container-highest/60"
                />
                {showNotesError && (
                  <p className="text-[10px] font-bold text-status-error uppercase px-1 mt-1">
                    {t('validation.notes_min_length') || 'Reason details must be at least 10 characters'}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Operations Deck Panel - Scanning and lines table (70%) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-surface-container-low/50 p-8 rounded-[2.5rem] border border-white/5 relative overflow-hidden shadow-2xl group">
            {/* Premium Emerald Accent Gradient */}
            <div className={cn(
              "absolute top-0 left-0 right-0 h-1 from-emerald-500/50 via-emerald-500/20 to-transparent pointer-events-none",
              locale === 'ar' ? "bg-gradient-to-l" : "bg-gradient-to-r"
            )} />

            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <PackagePlus className="w-5 h-5 text-emerald-500" />
                <h3 className="text-label-sm font-semibold uppercase tracking-wider text-foreground/70">
                  {t('lines_section')}
                </h3>
              </div>
              <div className="flex items-center gap-2 px-4 py-1.5 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-label-xxs font-semibold uppercase text-emerald-500">
                  {lines.length} {tCommon('items') || 'Items'}
                </span>
              </div>
            </div>

            {/* Input Bars (Scanning + Combobox) */}
            <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
              <div className="space-y-2">
                <label className="text-label-xs font-semibold uppercase text-muted-foreground/40 ms-1">
                  {locale === 'ar' ? 'مسح الباركود' : 'Barcode Scanner'}
                </label>
                <ScanInput 
                  onScan={handleAddItem}
                  placeholder={t('scan_item_placeholder') || 'Scan item barcode...'} 
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
                  disabled={isLoadingItems}
                />
              </div>
            </div>

            {/* High-density interactive virtualized table */}
            <div className="bg-surface-container-low/30 rounded-[2rem] border border-white/5 overflow-hidden">
              <DocumentLineItemTable
                lines={lines}
                locale={locale}
                isReadOnly={false}
                onRemoveLine={(id) => setLines(prev => prev.filter(l => l.id !== id))}
                hideLotColumns={true}
                dense={true}
                extraColumns={extraColumns}
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
                renderUom={(line) => {
                  const uomOption = activeUoMs.find(u => u.id === line.uom_id);
                  return (
                    <div className="flex items-center">
                      <Select
                        value={line.uom_id}
                        onValueChange={(val) => {
                          setLines(prev => prev.map(l => l.id === line.id ? { ...l, uom_id: val } : l));
                        }}
                      >
                        <SelectTrigger className="w-24 bg-surface-container-highest/60 border border-white/5 rounded-lg text-center h-9 px-2 text-[10px] font-bold focus:ring-2 focus:ring-cyan-500/30 outline-none transition-all hover:bg-surface-container-highest/80 disabled:opacity-50 select-none">
                          <SelectValue placeholder={uomOption ? (locale === 'ar' ? uomOption.name_ar : uomOption.name_en) : 'PCS'} />
                        </SelectTrigger>
                        <SelectContent className="bg-surface-container-highest border border-surface-container-high/50 shadow-2xl rounded-xl overflow-hidden">
                          {activeUoMs.map((u) => (
                            <SelectItem key={u.id} value={u.id} className="text-label-xs font-bold py-2 focus:bg-cyan-500/10 focus:text-cyan-400">
                              {locale === 'ar' ? u.name_ar : u.name_en}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <FormFooter
          onCancel={() => router.push('/adjustments', { skipGuard: true })}
          onSubmit={handleSave}
          isSaving={createAdjustment.isPending}
          isDirty={isDirty}
          isValid={isValid}
          isLocked={false}
          saveLabel={t('save_draft') || 'Save Adjustment'}
        />
    </div>
  );
}
