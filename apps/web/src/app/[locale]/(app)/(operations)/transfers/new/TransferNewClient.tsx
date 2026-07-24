'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useTranslations } from 'next-intl';

import { useParams } from 'next/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useWarehouses } from '@/features/warehouses/hooks/useWarehouses';
import { useWarehouseInventory } from '@/features/inventory/hooks/useWarehouseInventory';
import { type Item } from '@/features/items/types';
import { useCreateTransfer } from '@/features/operations/hooks/useCreateTransfer';
import { useWarehouseLock } from '@/hooks/useWarehouseLock';
import { LockBanner } from '@/components/shared/LockBanner';
import { DocumentLineItemTable } from '@/components/shared/DocumentLineItemTable/DocumentLineItemTable';
import { ScanInput } from '@/components/shared/ScanInput/ScanInput';
import { SmartCombobox } from '@/components/shared/SmartCombobox';
import { FormFooter } from '@/components/layouts/FormLayout';
import { toast } from 'sonner';
import { audioAlerts } from '@/utils/audio';
import { useAudioFeedback } from '@/hooks/useAudioFeedback';

import { Save, Warehouse, PackagePlus, Sparkles, ArrowLeft, Loader2 } from 'lucide-react';
import { useUnsavedChangesGuard } from '@/lib/unsaved-changes/useUnsavedChangesGuard';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { ErrorState } from '@/components/shared/ErrorState';
import { useAuth } from '@/providers/AuthProvider';
import { useAbortController } from '@/hooks/useAbortController';
import { useInventoryBalance } from '@/features/inventory/hooks/useInventoryBalance';
import { apiClient } from '@/lib/api/client';
import { cn } from '@/lib/utils';
import { z } from 'zod';
import { mapWarehouseToCombobox, mapLineToPayload } from '@/utils/mappers';

interface NewTransferLine {
  id: string;
  itemId: string;
  item: {
    id: string;
    code: string;
    name: string;
    image?: string | null;
    primaryUom: { code: string };
  };
  qty: number;
  uomId: string;
  notes?: string;
}

interface TransferLineNotesCellProps {
  locale: 'ar' | 'en';
  lineId: string;
  notes?: string;
  onChange: (val: string) => void;
}

function TransferLineNotesCell({ locale, lineId, notes, onChange }: TransferLineNotesCellProps) {
  const [localNotes, setLocalNotes] = useState(notes || '');

  useEffect(() => {
    setLocalNotes(notes || '');
  }, [notes]);

  return (
    <div className="w-full">
      <Input
        value={localNotes}
        onChange={(e) => setLocalNotes(e.target.value)}
        onBlur={() => onChange(localNotes)}
        placeholder={locale === 'ar' ? 'ملاحظات السطر...' : 'Line notes...'}
        className="w-full bg-transparent text-sm border-gray-300 dark:border-gray-700 text-[#0B1220] dark:text-white placeholder-gray-400 focus:border-[#b48e67] focus:ring-1 focus:ring-[#b48e67] rounded-md outline-none transition-all"
      />
    </div>
  );
}

interface TransferLineQtyCellProps {
  lineId: string;
  qty: number;
  availableQty: number;
  isExceeded: boolean;
  onChange: (val: number) => void;
  locale: string;
}

function TransferLineQtyCell({ lineId, qty, availableQty, isExceeded, onChange, locale }: TransferLineQtyCellProps) {
  const [localQty, setLocalQty] = useState(qty !== undefined && qty !== null ? String(qty) : '1');

  useEffect(() => {
    setLocalQty(qty !== undefined && qty !== null ? String(qty) : '1');
  }, [qty]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    if (rawVal === '' || /^\d*\.?\d*$/.test(rawVal)) {
      setLocalQty(rawVal);
      if (rawVal !== '' && rawVal !== '.') {
        const parsed = parseFloat(rawVal);
        if (!isNaN(parsed) && parsed > 0) {
          onChange(parsed);
        }
      }
    }
  };

  const handleBlur = () => {
    let finalVal = 1;
    if (localQty === '' || localQty === '.') {
      finalVal = 1;
    } else {
      const parsed = parseFloat(localQty);
      if (isNaN(parsed) || parsed <= 0) {
        finalVal = 1;
      } else {
        finalVal = parsed;
      }
    }
    setLocalQty(String(finalVal));
    onChange(finalVal);
  };

  return (
    <div className="w-28 sm:w-32 mx-auto relative flex flex-col justify-center h-[52px]">
      <Input
        dir="ltr"
        type="text"
        inputMode="decimal"
        value={localQty}
        onChange={handleChange}
        onBlur={handleBlur}
        className={cn(
          "w-full text-center font-black text-lg bg-white dark:bg-card border border-brand-gold/40 text-foreground focus:border-brand-gold focus:ring-1 focus:ring-brand-gold rounded-lg outline-none transition-all h-10 mt-1",
          isExceeded && "border-status-error focus:ring-1 focus:ring-status-error/30 focus:border-status-error text-status-error"
        )}
      />
      <div className="absolute -bottom-4 inset-x-0 flex justify-center pointer-events-none">
        <span className={cn("text-[10px] font-semibold tracking-wide whitespace-nowrap", isExceeded ? "text-status-error font-bold animate-pulse" : "text-muted-foreground/70")}>
          {locale === 'ar' ? `المتوفر: ${availableQty}` : `Available: ${availableQty}`}
        </span>
      </div>
    </div>
  );
}

export function TransferNewClient() {
  const params = useParams();
  const locale = (params.locale as 'ar' | 'en') || 'en';
  const t = useTranslations('operations.transfer');
  const tCommon = useTranslations('common');
  const abortController = useAbortController();
  const { user } = useAuth();

  const [fromWarehouseId, setFromWarehouseId] = useState('');
  const [toWarehouseId, setToWarehouseId] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<NewTransferLine[]>([]);
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [isSuggestingFIFO, setIsSuggestingFIFO] = useState(false);

  const { data: warehousesData, isLoading: isLoadingWarehouses, error: errorWarehouses } = useWarehouses();
  const warehouses = warehousesData?.data || [];

  const { data: destWarehousesData } = useWarehouses({ ignoreScope: true });
  const destWarehouses = destWarehousesData?.data || [];

  const { data: inventoryData, isLoading: isLoadingItems, error: errorItems } = useWarehouseInventory(fromWarehouseId, { enabled: !!fromWarehouseId });
  const inventoryItems = inventoryData?.data || [];

  const createTransfer = useCreateTransfer();
  const { playSound } = useAudioFeedback();

  // Inventory balance hook enabled when fromWarehouseId is active
  const { data: inventoryBalances, isError: isBalanceError, isLoading: isBalanceLoading } = useInventoryBalance(
    fromWarehouseId ? { warehouse_id: fromWarehouseId } : undefined,
    { enabled: !!fromWarehouseId }
  );

  useEffect(() => {
    if (isBalanceError) {
      toast.error(locale === 'ar' ? 'تعذر تحميل الأرصدة، يرجى التحقق من الاتصال بالشبكة' : 'Failed to load balances, please check your network connection');
    }
  }, [isBalanceError, locale]);

  // Filter out inactive items and map from warehouse inventory
  const allItems = useMemo(() => {
    return inventoryItems
      .filter((inv) => inv.qtyAvailable > 0)
      .map((inv) => ({
        id: inv.itemId,
        code: inv.itemCode,
        barcode: inv.primaryBarcode || inv.itemCode,
        name: inv.itemName,
        qtyAvailable: inv.qtyAvailable,
        primaryUom: { id: inv.uomCode || '', code: inv.uomCode || '' },
        isActive: true,
        image: inv.image || null,
      }));
  }, [inventoryItems]);

  // Derive assigned warehouses from user scopes
  const assignedWarehouseIds = useMemo(() => {
    if (!user?.scopes) return null;
    const ids = user.scopes.map(s => s.warehouseId).filter(Boolean) as string[];
    return ids.length > 0 ? ids : null;
  }, [user?.scopes]);

  const isScopeless = user?.role ? ['ADMIN', 'GM', 'INV_MGR', 'AUDITOR', 'VIEWER'].includes(user.role) : false;
  const hasNoScope = !isScopeless && assignedWarehouseIds === null;

  // Memoize source warehouses for SmartCombobox, filtered by user's assigned warehouses
  const sourceWarehouseItems = useMemo(() => {
    const filtered = !assignedWarehouseIds
      ? (warehouses || [])
      : (warehouses || []).filter(w => assignedWarehouseIds.includes(w.id));
    return filtered.map(w => mapWarehouseToCombobox(w));
  }, [warehouses, assignedWarehouseIds]);

  // Memoize destination warehouses (all active warehouses, excluding source)
  const destinationWarehouseItems = useMemo(() => {
    return (destWarehouses || [])
      .filter(w => w.id !== fromWarehouseId)
      .map(w => mapWarehouseToCombobox(w));
  }, [destWarehouses, fromWarehouseId]);

  // Unsaved changes guard
  const isDirty = fromWarehouseId !== '' || toWarehouseId !== '' || notes !== '' || lines.length > 0;
  const { router } = useUnsavedChangesGuard(isDirty);

  // Warehouse locks
  const { data: fromLockState } = useWarehouseLock(fromWarehouseId);
  const { data: toLockState } = useWarehouseLock(toWarehouseId);
  const isEitherLocked = !!fromLockState?.isLocked || !!toLockState?.isLocked;

  const handleAddItem = async (barcode: string) => {
    if (!fromWarehouseId) {
      toast.error(locale === 'ar' ? 'يرجى تحديد مستودع المصدر أولاً' : 'Please select the source warehouse first');
      throw new Error('NoSourceWarehouse');
    }

    const clean = barcode.trim();
    let item = allItems?.find(
      (i) => i.barcode?.toLowerCase() === clean.toLowerCase() || i.code?.toLowerCase() === clean.toLowerCase()
    );

    if (!item) {
      try {
        const res = await apiClient.get(
          `/items?search=${encodeURIComponent(clean)}`,
          z.object({ data: z.array(z.unknown()) })
        );
        const apiFound = (res as { data: Array<{ id: string; code: string; name: string; barcode?: string; primaryUom?: { code?: string } }> })?.data?.[0];
        if (apiFound) {
          item = {
            id: apiFound.id,
            code: apiFound.code,
            barcode: apiFound.barcode || apiFound.code,
            name: apiFound.name,
            qtyAvailable: 999999,
            primaryUom: { id: apiFound.primaryUom?.code || 'EA', code: apiFound.primaryUom?.code || 'EA' },
            isActive: true,
            image: null,
          };
        }
      } catch {
        // ignore fallback error
      }
    }

    if (!item) {
      toast.error(`${tCommon('no_item_found') || "Item not found"}: "${clean}"`);
      throw new Error('ItemNotFound');
    }

    if (item.isActive === false) {
      toast.error(locale === 'ar' ? `الصنف "${item.code}" غير نشط` : `Item "${item.code}" is inactive`);
      throw new Error('InactiveItem');
    }

    // Check available balance in cache
    const balance = inventoryBalances?.data?.find(b => b.itemId === item.id);
    const availableQty = balance ? balance.qtyAvailable : 0;

    if (availableQty <= 0) {
      toast.error(locale === 'ar'
        ? `رصيد الصنف غير كافٍ في مستودع المصدر (الرصيد: 0)`
        : `Insufficient stock in source warehouse (Stock: 0)`
      );
      throw new Error('NoStock');
    }

    const existing = lines.find(l => l.itemId === item.id);
    const newQty = existing ? existing.qty + 1 : 1;
    if (newQty > availableQty) {
      toast.error(locale === 'ar'
        ? `الكمية المدخلة تتجاوز الرصيد المتوفر (${availableQty})`
        : `Quantity exceeds available stock (${availableQty})`
      );
      throw new Error('InsufficientStock');
    }

    setLines(prev => {
      const existingLine = prev.find(l => l.itemId === item.id);
      if (existingLine) {
        return prev.map(l => l.itemId === item.id ? { ...l, qty: l.qty + 1 } : l);
      }
      return [...prev, {
        id: `temp-${item.id}-${Date.now()}`,
        itemId: item.id,
        item: {
          id: item.id,
          code: item.code,
          name: item.name,
          image: item.image || null,
          primaryUom: { code: item.primaryUom.code }
        },
        qty: 1,
        uomId: item.primaryUom.id,
        notes: ''
      }];
    });
  };

  const handleSuggestFIFO = async () => {
    if (lines.length === 0) {
      toast.error(locale === 'ar' ? 'أضف أصنافاً أولاً' : 'Add items first');
      return;
    }
    setIsSuggestingFIFO(true);
    try {
      const fetchPromises = lines.map(l => {
        const qs = new URLSearchParams();
        qs.append('warehouseId', fromWarehouseId);
        qs.append('itemId', l.itemId);

        return apiClient.get(`/operations/lots-available?${qs.toString()}`, z.object({
          data: z.array(z.object({
            id: z.string(),
            item_id: z.string(),
            lot_number: z.string(),
            expiry_date: z.string().nullable().optional(),
            qty_available: z.number().optional(),
          }))
        })).then(res => res.data);
      });

      const results = await Promise.all(fetchPromises);
      const lots = results.flat();
      const expiredLots = lots.filter(l => l.expiry_date && new Date(l.expiry_date) < new Date());
      const nearExpiry = lots.filter(l => {
        if (!l.expiry_date) return false;
        const daysUntilExpiry = Math.ceil((new Date(l.expiry_date).getTime() - Date.now()) / 86400000);
        return daysUntilExpiry > 0 && daysUntilExpiry <= 30;
      });

      let msg: string;
      if (locale === 'ar') {
        const parts: string[] = [];
        if (expiredLots.length > 0) parts.push(`${expiredLots.length} batch منتهية الصلاحية`);
        if (nearExpiry.length > 0) parts.push(`${nearExpiry.length} batch قريبة من الانتهاء`);
        msg = parts.length > 0 ? `FIFO: ${parts.join('، ')}` : 'جميع الأصناف ضمن الحدود الآمنة';
      } else {
        const parts: string[] = [];
        if (expiredLots.length > 0) parts.push(`${expiredLots.length} expired lots`);
        if (nearExpiry.length > 0) parts.push(`${nearExpiry.length} lots near expiry`);
        msg = parts.length > 0 ? `FIFO: ${parts.join(', ')} — prioritize these` : 'All items within safe limits';
      }
      toast.info(msg);
    } catch {
      toast.error(locale === 'ar' ? 'فشل جلب بيانات FIFO' : 'Failed to fetch FIFO data');
    } finally {
      setIsSuggestingFIFO(false);
    }
  };

  const handleSave = () => {
    if (!fromWarehouseId || !toWarehouseId || lines.length === 0 || hasQuantityErrors) return;

    createTransfer.mutate({
      payload: {
        fromWarehouseId,
        toWarehouseId,
        notes,
        lines: lines.map(l => mapLineToPayload(l))
      },
      signal: abortController.signal,
      headers: {
        'X-Idempotency-Key': idempotencyKey
      }
    }, {
      onSuccess: (data) => {
        playSound('success');
        router.push(`/transfers/${data.id}`, { skipGuard: true });
      }
    });
  };

  const hasQuantityErrors = !!inventoryBalances?.data && lines.some(line => {
    const balance = inventoryBalances.data.find(b => b.itemId === line.itemId);
    const availableQty = balance ? balance.qtyAvailable : 0;
    return line.qty > availableQty || line.qty <= 0;
  });

  const handleNotesChange = useCallback((lineId: string, val: string) => {
    setLines(prev => prev.map(l => l.id === lineId ? { ...l, notes: val } : l));
  }, []);

  const handleQtyChange = useCallback((lineId: string, val: number) => {
    setLines(prev => prev.map(l => l.id === lineId ? { ...l, qty: val } : l));
  }, []);

  const renderQty = useCallback((line: NewTransferLine) => {
    const balance = inventoryBalances?.data?.find(b => b.itemId === line.itemId);
    const availableQty = balance ? balance.qtyAvailable : 0;
    const isExceeded = balance ? line.qty > availableQty : false;
    return (
      <TransferLineQtyCell
        lineId={line.id}
        qty={line.qty}
        availableQty={availableQty}
        isExceeded={isExceeded}
        onChange={(val) => handleQtyChange(line.id, val)}
        locale={locale}
      />
    );
  }, [inventoryBalances?.data, handleQtyChange, locale]);

  const extraColumns = useMemo(() => [
    {
      header: tCommon('notes'),
      headerClassName: "w-full min-w-[200px] text-start",
      cellClassName: "w-full min-w-[200px] text-start",
      cell: (line: NewTransferLine) => (
        <TransferLineNotesCell
          locale={locale as 'ar' | 'en'}
          lineId={line.id}
          notes={line.notes}
          onChange={(val) => handleNotesChange(line.id, val)}
        />
      )
    }
  ], [locale, tCommon, handleNotesChange]);

  const isValid = !!(
    fromWarehouseId &&
    toWarehouseId &&
    fromWarehouseId !== toWarehouseId &&
    lines.length > 0 &&
    !hasQuantityErrors
  );

  if (isLoadingWarehouses) return <PageSkeleton />;
  if (errorWarehouses || errorItems) return <ErrorState onRetry={() => window.location.reload()} />;

  if (hasNoScope) {
    return (
      <ErrorState
        title={locale === 'ar' ? 'غير مصرح' : 'Access Denied'}
        message={locale === 'ar' ? 'لم يتم تعيين أي مستودع لحسابك. يرجى التواصل مع المسؤول.' : 'No authorized warehouse scopes assigned to your account. Please contact your administrator.'}
        onRetry={() => window.location.reload()}
      />
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSave();
      }}
      className="px-0 py-6 sm:p-8 pt-6 max-w-[1600px] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000 pb-32"
    >
      <div className="px-4 sm:px-0 space-y-6 max-w-4xl mx-auto w-full">
        <div className="flex items-center gap-4">
          <button type="button" onClick={() => router.push('/transfers')} className="w-10 h-10 flex items-center justify-center bg-card hover:bg-surface-container-high rounded-full transition-colors text-muted-foreground hover:text-foreground shrink-0 border border-border/60 shadow-sm">
            <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
          </button>
          <div className="flex-1">
            <Breadcrumb
              items={[
                { label: tCommon('modules.operations'), href: `/transfers` },
                { label: t('title'), href: `/transfers` },
                { label: t('create_new') }
              ]}
            />
          </div>
        </div>

        <PageHeader
          title={t('create_new')}
          subtitle={t('description')}
          actions={
            <Button
              type="button"
              onClick={handleSave}
              disabled={createTransfer.isPending || !isValid || isEitherLocked}
              className="bg-brand-gold hover:bg-brand-gold/90 text-slate-950 font-bold px-8 h-12 rounded-xl flex items-center gap-2 transition-all shadow-sm"
            >
              {createTransfer.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {t('save_transfer')}
            </Button>
          }
        />
      </div>

      <div className="space-y-2">
        {fromLockState?.isLocked && <LockBanner lockState={fromLockState} />}
        {toLockState?.isLocked && toLockState.sessionId !== fromLockState?.sessionId && (
          <LockBanner lockState={toLockState} />
        )}
      </div>

      <div className="flex flex-col max-w-4xl mx-auto w-full bg-card rounded-none sm:rounded-2xl relative shadow-lg border border-border/60 overflow-hidden mb-10">

        {/* Top Section: Parameters */}
        <div className="p-4 sm:p-8 border-b border-border/40 bg-surface-container-highest/10">
          <div className="flex items-center gap-3 mb-6">
            <Warehouse className="w-4 h-4 text-brand-gold" />
            <h3 className="text-sm font-bold text-foreground">
              {t('transfer_parameters')}
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="space-y-2">
              <label htmlFor="from-warehouse-select" className="text-label-sm font-semibold uppercase text-muted-foreground/70 ms-1">
                {t('from_warehouse')}
              </label>
              <SmartCombobox
                items={sourceWarehouseItems}
                value={fromWarehouseId}
                onSelect={(item) => {
                  const value = item ? String(item.id) : '';
                  if (value && value === toWarehouseId) {
                    toast.error(t('warehouse_match_error'));
                    setToWarehouseId('');
                  }
                  setFromWarehouseId(value);
                  setLines([]); // Clear lines to prevent validation conflicts
                }}
                getPrimaryLabel={(item) => item.name}
                placeholder={t('select_warehouse') || 'Select warehouse...'}
                triggerClassName="w-full bg-surface-container-highest/40 border-none h-11 px-6 text-label-sm font-bold rounded-2xl shadow-inner shadow-black/5 focus:ring-2 focus:ring-cyan-500/20 transition-all truncate pr-8"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="to-warehouse-select" className="text-label-sm font-semibold uppercase text-muted-foreground/70 ms-1">
                {t('to_warehouse')}
              </label>
              <SmartCombobox
                items={destinationWarehouseItems}
                value={toWarehouseId}
                onSelect={(item) => {
                  const value = item ? String(item.id) : '';
                  if (value && value === fromWarehouseId) {
                    toast.error(t('warehouse_match_error'));
                    return;
                  }
                  setToWarehouseId(value);
                }}
                getPrimaryLabel={(item) => item.name}
                placeholder={t('select_warehouse') || 'Select warehouse...'}
                triggerClassName="w-full bg-surface-container-highest/40 border-none h-11 px-6 text-label-sm font-bold rounded-2xl shadow-inner shadow-black/5 focus:ring-2 focus:ring-cyan-500/20 transition-all truncate pr-8"
              />
            </div>
          </div>

          <div className="space-y-2 mt-6">
            <label className="text-label-sm font-semibold uppercase text-muted-foreground/70 ms-1">
              {tCommon('notes')}
            </label>
            <Input
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder={t('notes_placeholder')}
              className="w-full bg-surface-container-highest/40 border-none h-11 px-4 text-sm font-medium rounded-2xl shadow-inner shadow-black/5 focus:ring-2 focus:ring-brand-gold/30 transition-all outline-none hover:bg-surface-container-highest/60"
            />
          </div>
        </div>

        {/* Bottom Section: Line Items */}
        <div className="p-4 sm:p-8 bg-card">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <PackagePlus className="w-4 h-4 text-brand-gold" />
              <h3 className="text-sm font-bold text-foreground">
                {t('items_to_transfer')}
              </h3>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleSuggestFIFO}
                disabled={!fromWarehouseId || lines.length === 0 || isSuggestingFIFO}
                className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 rounded-full border border-amber-500/20 text-amber-500 text-label-xxs font-semibold uppercase transition-all disabled:opacity-30"
              >
                <Sparkles className="w-3 h-3" />
                {isSuggestingFIFO ? (locale === 'ar' ? 'جاري...' : 'Loading...') : (locale === 'ar' ? 'اقتراح FIFO' : 'Suggest FIFO')}
              </button>
              <div className="flex items-center gap-2 px-4 py-1.5 bg-muted/50 rounded-full border border-emerald-500/20">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-label-xxs font-semibold uppercase text-foreground">
                  {lines.length} {tCommon('items')}
                </span>
              </div>
            </div>
          </div>

          <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-label-xs font-semibold uppercase text-muted-foreground/40 ms-1">
                {locale === 'ar' ? 'مسح الباركود' : 'Barcode Scanner'}
              </label>
              <ScanInput
                onScan={handleAddItem}
                placeholder={!fromWarehouseId ? (locale === 'ar' ? 'يرجى تحديد مستودع...' : 'Select warehouse...') : (t('scan_item_placeholder') || "Scan barcode...")}
                className="w-full"
                variant="standard"
                scannerMode={true}
                disabled={!fromWarehouseId || isBalanceLoading || isBalanceError}
              />
            </div>
            <div className="space-y-2">
              <label className="text-label-xs font-semibold uppercase text-muted-foreground/40 ms-1">
                {locale === 'ar' ? 'البحث عن صنف' : 'Search / Add Item'}
              </label>
              <SmartCombobox
                items={allItems}
                onSelect={(item) => handleAddItem(item.code)}
                getPrimaryLabel={(item) => item.name || ''}
                placeholder={!fromWarehouseId ? (locale === 'ar' ? 'يرجى تحديد مستودع...' : 'Select warehouse...') : (locale === 'ar' ? 'ابحث عن صنف...' : 'Search item...')}
                disabled={!fromWarehouseId || isBalanceLoading || isBalanceError}
                triggerClassName="bg-surface-container-highest/40 border-none h-11 px-4 rounded-2xl text-label-xs font-semibold shadow-inner w-full"
              />
            </div>
          </div>

          <div className="border border-border/60 shadow-sm rounded-xl overflow-hidden mt-4">
            <DocumentLineItemTable
              lines={lines}
              locale={locale}
              isReadOnly={false}
              onRemoveLine={(id) => setLines(prev => prev.filter(l => l.id !== id))}
              hideLotColumns={true}
              hideUomColumn={true}
              noCollapse={false}
              dense={false}
              mobileLayoutPattern="transfer-form"
              headers={{
                code: tCommon('table_headers.code'),
                name: tCommon('table_headers.name'),
                qty: tCommon('table_headers.qty'),
                uom: tCommon('table_headers.uom'),
              }}
              renderQty={renderQty}
              extraColumns={extraColumns}
            />
          </div>
        </div>
      </div>
    </form>
  );
}

