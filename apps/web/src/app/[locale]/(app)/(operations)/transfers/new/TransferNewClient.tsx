'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';

import { useParams } from 'next/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { Button } from '@/components/ui/button';
import { useWarehouses } from '@/features/warehouses/hooks/useWarehouses';
import { useItems } from '@/features/items/hooks/useItems';
import { type Item } from '@/features/items/types';
import { useCreateTransfer } from '@/features/operations/hooks/useCreateTransfer';
import { useWarehouseLock } from '@/hooks/useWarehouseLock';
import { LockBanner } from '@/components/shared/LockBanner';
import { DocumentLineItemTable } from '@/components/shared/DocumentLineItemTable/DocumentLineItemTable';
import { ScanInput } from '@/components/shared/ScanInput/ScanInput';
import { SmartCombobox } from '@/components/shared/SmartCombobox';
import { FormFooter } from '@/components/shared/FormFooter';
import { toast } from 'sonner';
import { audioAlerts } from '@/utils/audio';
import { useAudioFeedback } from '@/hooks/useAudioFeedback';
 
import { Save, Warehouse, PackagePlus, Sparkles } from 'lucide-react';
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
    primaryUom: { code: string };
  };
  qty: number;
  uomId: string;
}

export function TransferNewClient() {
  const params = useParams();
  const locale = (params.locale as 'ar' | 'en') || 'en';
  const t = useTranslations('operations.transfer');
  const tCommon = useTranslations('common');
  const abortController = useAbortController();
  const { user } = useAuth();
  const { data: warehousesData, isLoading: isLoadingWarehouses, error: errorWarehouses } = useWarehouses(); const warehouses = warehousesData?.data || [];
  const { data: itemsData, isLoading: isLoadingItems, error: errorItems } = useItems(); const items = itemsData?.data || [];
  const createTransfer = useCreateTransfer();
  const { playSound } = useAudioFeedback();

  const [fromWarehouseId, setFromWarehouseId] = useState('');
  const [toWarehouseId, setToWarehouseId] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<NewTransferLine[]>([]);
  const [idempotencyKey] = useState(() => crypto.randomUUID());

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

  // Filter out inactive items
  const allItems = useMemo(() => (items || []).filter((item: Item) => item.isActive !== false), [items]);

  // Derive assigned warehouses from user scopes
  const assignedWarehouseIds = useMemo(() => {
    if (!user?.scopes) return null;
    const ids = user.scopes.map(s => s.warehouseId).filter(Boolean) as string[];
    return ids.length > 0 ? ids : null;
  }, [user?.scopes]);

  const hasNoScope = assignedWarehouseIds === null;

  // Memoize warehouses for SmartCombobox, filtered by user's assigned warehouses
  const warehouseItems = useMemo(() => {
    const filtered = !assignedWarehouseIds
      ? (warehouses || [])
      : (warehouses || []).filter(w => assignedWarehouseIds.includes(w.id));
    return filtered.map(w => mapWarehouseToCombobox(w));
  }, [warehouses, assignedWarehouseIds]);

  // Unsaved changes guard
  const isDirty = fromWarehouseId !== '' || toWarehouseId !== '' || notes !== '' || lines.length > 0;
  const { router } = useUnsavedChangesGuard(isDirty);

  // Warehouse locks
  const { data: fromLockState } = useWarehouseLock(fromWarehouseId);
  const { data: toLockState } = useWarehouseLock(toWarehouseId);
  const isEitherLocked = !!fromLockState?.isLocked || !!toLockState?.isLocked;

  const handleAddItem = (barcode: string) => {
    if (!fromWarehouseId) {
      audioAlerts.playScanInvalid();
      toast.error(locale === 'ar' ? 'يرجى تحديد مستودع المصدر أولاً' : 'Please select the source warehouse first');
      return;
    }

    const item = allItems?.find((i: Item) => i.barcode === barcode || i.code === barcode);
    if (!item) {
      audioAlerts.playScanInvalid();
      toast.error(`${tCommon('no_item_found') || "Item not found"}: "${barcode}"`);
      return;
    }

    if (item.isActive === false) {
      audioAlerts.playScanInvalid();
      toast.error(locale === 'ar' ? `الصنف "${item.code}" غير نشط` : `Item "${item.code}" is inactive`);
      return;
    }

    // Check available balance in cache
    const balance = inventoryBalances?.data?.find(b => b.itemId === item.id);
    const availableQty = balance ? balance.qtyAvailable : 0;

    if (availableQty <= 0) {
      audioAlerts.playScanInvalid();
      toast.error(locale === 'ar' 
        ? `رصيد الصنف غير كافٍ في مستودع المصدر (الرصيد: 0)` 
        : `Insufficient stock in source warehouse (Stock: 0)`
      );
      return;
    }

    const existing = lines.find(l => l.itemId === item.id);
    const newQty = existing ? existing.qty + 1 : 1;
    if (newQty > availableQty) {
      audioAlerts.playScanInvalid();
      toast.error(locale === 'ar'
        ? `الكمية المدخلة تتجاوز الرصيد المتوفر (${availableQty})`
        : `Quantity exceeds available stock (${availableQty})`
      );
      return;
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
          primaryUom: { code: item.primaryUom.code }
         },
        qty: 1,
        uomId: item.primaryUom.id
      }];
    });

    audioAlerts.playScanSuccess();
  };

  const [isSuggestingFIFO, setIsSuggestingFIFO] = useState(false);

  const handleSuggestFIFO = async () => {
    if (lines.length === 0) {
      toast.error(locale === 'ar' ? 'أضف أصنافاً أولاً' : 'Add items first');
      return;
    }
    setIsSuggestingFIFO(true);
    try {
      const qs = new URLSearchParams();
      qs.append('warehouse_id', fromWarehouseId);
      lines.forEach(l => qs.append('item_id', l.itemId));

      const res = await apiClient.get(`/operations/lots-available?${qs.toString()}`, z.object({
        data: z.array(z.object({
          id: z.string(),
          item_id: z.string(),
          lot_number: z.string(),
          expiry_date: z.string().nullable().optional(),
          qty_available: z.number().optional(),
        }))
      }));

      const lots = res.data;
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

  const isValid = !!(
    fromWarehouseId && 
    toWarehouseId && 
    fromWarehouseId !== toWarehouseId && 
    lines.length > 0 &&
    !hasQuantityErrors
  );

  if (isLoadingWarehouses || isLoadingItems) return <PageSkeleton />;
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
          <div className="bg-surface-container-low/50 p-8 rounded-[2.5rem] border border-white/5 relative overflow-visible shadow-2xl">
            <div className={`absolute top-0 inset-x-0 h-1 rounded-t-[2.5rem] ${locale === 'ar' ? 'bg-gradient-to-l' : 'bg-gradient-to-r'} from-cyan-500/50 via-cyan-500/20 to-transparent`} />
            
            <div className="flex items-center gap-3 mb-6">
              <Warehouse className="w-4 h-4 text-cyan-500" />
              <h3 className="text-label-sm font-semibold uppercase tracking-wider text-foreground/70">
                {t('transfer_parameters')}
              </h3>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="from-warehouse-select" className="text-label-sm font-semibold uppercase text-muted-foreground/70 ms-1">
                  {t('from_warehouse')}
                </label>
                <SmartCombobox
                  items={warehouseItems}
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
                  triggerClassName="w-full bg-surface-container-highest/40 border-none h-11 px-6 text-label-sm font-bold rounded-2xl shadow-inner shadow-black/5 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="to-warehouse-select" className="text-label-sm font-semibold uppercase text-muted-foreground/70 ms-1">
                  {t('to_warehouse')}
                </label>
                <SmartCombobox
                  items={warehouseItems}
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
                  triggerClassName="w-full bg-surface-container-highest/40 border-none h-11 px-6 text-label-sm font-bold rounded-2xl shadow-inner shadow-black/5 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                />
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
          <div className="bg-surface-container-low/50 p-8 rounded-[2.5rem] border border-white/5 relative overflow-visible shadow-2xl">
            <div className={`absolute top-0 inset-x-0 h-1 rounded-t-[2.5rem] ${locale === 'ar' ? 'bg-gradient-to-l' : 'bg-gradient-to-r'} from-emerald-500/50 via-emerald-500/20 to-transparent`} />
            
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <PackagePlus className="w-5 h-5 text-emerald-500" />
                <h3 className="text-label-sm font-semibold uppercase tracking-wider text-foreground/70">
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
                <div className="flex items-center gap-2 px-4 py-1.5 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-label-xxs font-semibold uppercase text-emerald-500">
                    {lines.length} {tCommon('items')}
                  </span>
                </div>
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
                  getPrimaryLabel={(item) => item.name}
                  placeholder={locale === 'ar' ? 'ابحث عن صنف لإضافته...' : 'Search item to add...'}
                  disabled={!fromWarehouseId || isBalanceLoading || isBalanceError}
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
                renderQty={(line) => {
                  const balance = inventoryBalances?.data?.find(b => b.itemId === line.itemId);
                  const availableQty = balance ? balance.qtyAvailable : 0;
                  const isExceeded = balance ? line.qty > availableQty : false;
                  return (
                    <div className="flex flex-col items-center gap-1">
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
                          className={cn(
                            "w-24 bg-surface-container-highest/60 border rounded-lg text-center py-1.5 font-mono text-body-md font-semibold focus:ring-2 focus:ring-cyan-500/30 outline-none transition-all hover:bg-surface-container-highest/80 disabled:opacity-50",
                            isExceeded ? "border-status-error focus:ring-status-error/30" : "border-white/5"
                          )}
                        />
                      </div>
                      <span className={cn("text-label-xxs font-semibold", isExceeded ? "text-status-error font-bold animate-pulse" : "text-muted-foreground")}>
                        {locale === 'ar' ? `المتوفر: ${availableQty}` : `Available: ${availableQty}`}
                      </span>
                    </div>
                  );
                }}
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
        isLocked={isEitherLocked}
        saveLabel={t('save_transfer')}
      />

    </form>
  );
}

