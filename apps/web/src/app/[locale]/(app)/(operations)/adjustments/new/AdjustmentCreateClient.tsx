'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { Textarea } from '@/components/ui/textarea';
import { useCreateAdjustment } from '@/features/operations/hooks/useCreateAdjustment';
import { useWarehouses } from '@/features/warehouses/hooks/useWarehouses';
import { useItems } from '@/features/items/hooks/useItems';
import { useUoMs } from '@/features/uoms/hooks/useUoMs';
import { useVarianceReasons } from '@/features/operations/api/useVarianceReasons';
import { useWarehouseLock } from '@/hooks/useWarehouseLock';
import { useAuth } from '@/providers/AuthProvider';
import { LockBanner } from '@/components/shared/LockBanner';
import { DocumentLineItemTable, type LineItem } from '@/components/shared/DocumentLineItemTable/DocumentLineItemTable';
import { ScanInput } from '@/components/shared/ScanInput/ScanInput';
import { SmartCombobox, type ComboboxItem } from '@/components/shared/SmartCombobox';
import { resolveUomCode, getScaledQtyBefore } from '@/utils/uom-helper';
import { resolveBarcodeAndUom } from '@/utils/barcode-resolver';
import { FormFooter } from '@/components/layouts/FormLayout';
import { toast } from 'sonner';
import { audioAlerts } from '@/utils/audio';
import { Info, ArrowUp, ArrowDown, Warehouse, PackagePlus, Zap, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUnsavedChangesGuard } from '@/lib/unsaved-changes/useUnsavedChangesGuard';
import { useAbortController } from '@/hooks/useAbortController';
import { type Item } from '@/features/items/types';
import { z } from 'zod';
import { apiClient } from '@/lib/api/client';

import { CreateCustomItemDialog } from '@/components/shared/CreateCustomItemDialog';
import { AdjustmentLotSelector } from '@/features/operations/components/AdjustmentLotSelector';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';


function UnitCostInput({
  value,
  onChange,
  disabled,
  placeholder,
  className
}: {
  value: number | null | undefined;
  onChange: (val: number | null) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}) {
  const [localValue, setLocalValue] = useState<string>(value !== null && value !== undefined ? String(value) : '');

  useEffect(() => {
    const numVal = value !== null && value !== undefined ? Number(value) : null;
    const localNum = localValue !== '' ? Number(localValue) : null;
    if (numVal !== localNum) {
      setLocalValue(value !== null && value !== undefined ? String(value) : '');
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    if (rawVal === '' || /^\d*\.?\d*$/.test(rawVal)) {
      setLocalValue(rawVal);
      if (rawVal === '' || rawVal === '.') {
        onChange(null);
      } else {
        const parsed = parseFloat(rawVal);
        onChange(isNaN(parsed) ? null : parsed);
      }
    }
  };

  const handleBlur = () => {
    if (localValue === '' || localValue === '.') {
      setLocalValue('0');
      onChange(0);
    } else {
      const parsed = parseFloat(localValue);
      if (isNaN(parsed)) {
        setLocalValue('0');
        onChange(0);
      } else {
        setLocalValue(String(parsed));
        onChange(parsed);
      }
    }
  };

  return (
    <Input
      type="text"
      inputMode="decimal"
      value={localValue}
      disabled={disabled}
      placeholder={placeholder}
      onChange={handleChange}
      onBlur={handleBlur}
      className={className}
    />
  );
}

interface NewAdjustmentLine extends LineItem {
  itemId: string;
  direction: 'INCREASE' | 'DECREASE';
  lotNumber?: string;
  lotId?: string;
  unitCost?: number | null;
  qtyBefore?: number;
  /** Quantity in the item's base UOM — always sent to the API */
  baseQty: number;
}

interface ItemOption {
  id: string;
  code: string;
  barcode: string;
  name: string;
  nameEn?: string;
  nameAr?: string;
  image?: string | null;
  qtyOnHand?: number;
  qty_on_hand?: number;
  primaryUom: { id: string; code: string; name?: string };
  uomConversions?: { fromUomId: string; toUomId: string; factor: number; fromUomCode?: string; toUomCode?: string }[];
}

const isDecreaseOnlyReason = (reason: string) => {
  if (!reason) return false;
  const r = reason.trim().toLowerCase();
  return r.includes('damage') || r.includes('spoilage') || r.includes('theft') || r.includes('loss');
};

const isIncreaseOnlyReason = (reason: string) => {
  if (!reason) return false;
  const r = reason.trim().toLowerCase();
  return r.includes('found') || r.includes('initial') || r.includes('gain') || r.includes('addition');
};

export function AdjustmentCreateClient({ locale }: { locale: 'ar' | 'en' }) {
  const t = useTranslations('operations.adjustment');
  const tCommon = useTranslations('common');
  const abortController = useAbortController();
  const searchParams = useSearchParams();
  const { activeScope } = useAuth();

  const [warehouseId, setWarehouseId] = useState('');
  const [reasonCategory, setReasonCategory] = useState('DAMAGE');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<NewAdjustmentLine[]>([]);

  useEffect(() => {
    const r = String(reasonCategory || "").trim().toLowerCase();
    const isDecreaseOnly =
      r.includes("damage") ||
      r.includes("spoilage") ||
      r.includes("theft") ||
      r.includes("loss") ||
      r.includes("telf") ||
      r.includes("expiry");

    const isIncreaseOnly =
      r.includes("found") ||
      r.includes("initial") ||
      r.includes("opening");

    if (isDecreaseOnly) {
      setLines((prevLines) =>
        prevLines.map((line) =>
          line.direction !== "DECREASE" ? { ...line, direction: "DECREASE" } : line
        )
      );
    } else if (isIncreaseOnly) {
      setLines((prevLines) =>
        prevLines.map((line) =>
          line.direction !== "INCREASE" ? { ...line, direction: "INCREASE" } : line
        )
      );
    }
  }, [reasonCategory]);

  const { data: warehousesData } = useWarehouses(); const warehouses = warehousesData?.data || [];
  const { data: itemsData, isLoading: isLoadingItems } = useItems(
    warehouseId ? { warehouse_id: warehouseId } : { warehouse_id: 'none' }
  ); const items = itemsData?.data || [];
  const { data: uomsResult } = useUoMs();
  const { data: varianceReasonsData, isLoading: isLoadingReasons } = useVarianceReasons();
  const createAdjustment = useCreateAdjustment();

  const [customItems, setCustomItems] = useState<ItemOption[]>([]);
  const [isCustomItemDialogOpen, setIsCustomItemDialogOpen] = useState(false);
  const [customItemNameQuery, setCustomItemNameQuery] = useState('');
  const [isSuggestingFIFO, setIsSuggestingFIFO] = useState(false);
  const [creatingLotForLineId, setCreatingLotForLineId] = useState<string | null>(null);

  const handleSuggestFIFO = async () => {
    if (!warehouseId) {
      toast.error(t('select_warehouse_error') || "Please select a warehouse first.");
      return;
    }

    const emptyLines = lines.filter(l => !l.lotNumber && l.direction === 'DECREASE');
    if (emptyLines.length === 0) {
      toast.info(locale === 'ar' ? 'لا توجد أسطر خصم بحاجة لتخصيص دفعات FIFO تلقائية' : 'No unallocated decrease lines found for FIFO suggestion');
      return;
    }

    const itemIds = [...new Set(emptyLines.map(l => l.itemId))];

    setIsSuggestingFIFO(true);
    try {
      const fetchPromises = itemIds.map(async (itemId) => {
        const qs = new URLSearchParams();
        qs.append('warehouseId', warehouseId);
        qs.append('itemId', itemId);

        const res = await apiClient.get(`/operations/lots-available?${qs.toString()}`, z.object({
          data: z.array(z.object({
            id: z.string(),
            itemId: z.string().optional(),
            item_id: z.string().optional(),
            lotNumber: z.string().optional(),
            lot_number: z.string().optional(),
            expiryDate: z.string().nullable().optional(),
            expiry_date: z.string().nullable().optional(),
            totalQty: z.number().optional(),
            total_qty: z.number().optional(),
            qtyAvailable: z.number().optional(),
            qty_available: z.number().optional(),
          }))
        }));

        return (res.data || []).map(lot => ({
          id: lot.id,
          itemId: lot.itemId || lot.item_id || itemId,
          lotNumber: lot.lotNumber || lot.lot_number || lot.id,
          expiryDate: lot.expiryDate || lot.expiry_date || null,
          totalQty: lot.totalQty ?? lot.total_qty ?? 0,
          qtyAvailable: lot.qtyAvailable ?? lot.qty_available ?? 0,
        }));
      });

      const lotsAvailableNested = await Promise.all(fetchPromises);
      const lotsAvailable = lotsAvailableNested.flat();

      const lotsByItem = lotsAvailable.reduce((acc, lot) => {
        if (!acc[lot.itemId]) acc[lot.itemId] = [];
        acc[lot.itemId].push({
          id: lot.id,
          lotNumber: lot.lotNumber,
          qtyAvailable: lot.totalQty ?? lot.qtyAvailable ?? 0,
          expiryDate: lot.expiryDate
        });
        return acc;
      }, {} as Record<string, { id: string, lotNumber: string, qtyAvailable: number, expiryDate?: string | null }[]>);

      const manualLines = lines.filter(l => l.lotId || l.lotNumber || l.direction === 'INCREASE');
      manualLines.forEach(l => {
        if (l.direction === 'DECREASE' && (l.lotId || l.lotNumber)) {
          const itemLots = lotsByItem[l.itemId];
          if (itemLots) {
            const lot = itemLots.find(il => il.id === l.lotId || il.id === l.lotNumber || il.lotNumber === l.lotNumber);
            if (lot) {
              lot.qtyAvailable = Math.max(0, lot.qtyAvailable - l.qty);
            }
          }
        }
      });

      Object.keys(lotsByItem).forEach(itemId => {
        lotsByItem[itemId].sort((a, b) => {
          if (!a.expiryDate && !b.expiryDate) return 0;
          if (!a.expiryDate) return 1;
          if (!b.expiryDate) return -1;
          return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
        });
      });

      let hasShortage = false;
      let totalShortage = 0;

      const newLines: NewAdjustmentLine[] = [];
      const linesToKeep = [...manualLines];

      emptyLines.forEach((emptyLine, index) => {
        const itemLots = lotsByItem[emptyLine.itemId] || [];
        let remainingQty = emptyLine.qty;

        for (const lot of itemLots) {
          if (remainingQty <= 0) break;
          if (lot.qtyAvailable <= 0) continue;

          const qtyToAllocate = Math.min(remainingQty, lot.qtyAvailable);

          newLines.push({
            ...emptyLine,
            id: `clone-${emptyLine.id}-${lot.id}-${index}-${Date.now()}`,
            lotId: lot.id,
            lotNumber: lot.lotNumber || lot.id,
            qty: qtyToAllocate
          });

          lot.qtyAvailable -= qtyToAllocate;
          remainingQty -= qtyToAllocate;
        }

        if (remainingQty > 0) {
          hasShortage = true;
          totalShortage += remainingQty;
          newLines.push({
            ...emptyLine,
            id: `clone-${emptyLine.id}-unalloc-${index}-${Date.now()}`,
            qty: remainingQty
          });
        }
      });

      setLines([...linesToKeep, ...newLines]);

      if (hasShortage) {
        toast.warning(t('shortage_warning', { qty: totalShortage }) || `عجز جزئي: تعذر تخصيص ${totalShortage} وحدة لعدم كفاية الرصيد في المباشرة.`);
      } else {
        toast.success(t('fifo_applied') || "تم تطبيق اقتراح FIFO بنجاح");
        audioAlerts.playScanSuccess();
      }
    } catch (err) {
      console.error(err);
      toast.error(tCommon('error_generic') || "حدث خطأ أثناء جلب اقتراح FIFO");
    } finally {
      setIsSuggestingFIFO(false);
    }
  };

  const [idempotencyKey] = useState(() => crypto.randomUUID());

  // Unsaved changes guard
  const isDirty = warehouseId !== '' || notes !== '' || lines.length > 0;
  const { router, setDirty } = useUnsavedChangesGuard(isDirty);

  // Warehouse locking guard
  const { data: lockState } = useWarehouseLock(warehouseId);
  const isLocked = !!lockState?.isLocked;

  const uoms = uomsResult?.data || [];
  const activeUoMs = uoms;

  const warehouseItems = useMemo(() => {
    return (warehouses || []).map(w => ({
      id: w.id,
      name: w.name || w.code,
      code: w.code,
    }));
  }, [warehouses]);

  const getLocalizedReasonName = useCallback((rawName: string) => {
    if (locale !== 'ar') return rawName;
    const nameLower = rawName.trim().toLowerCase();
    if (nameLower.includes('damage') || nameLower === 'telf') return 'تلف';
    if (nameLower.includes('spoilage') || nameLower.includes('expiry')) return 'إفساد / انتهاء صلاحية';
    if (nameLower.includes('theft') || nameLower.includes('loss')) return 'سرقة / فقدان';
    if (nameLower.includes('inventory correction') || nameLower.includes('correction')) return 'تصحيح مخزني';
    if (nameLower.includes('opening_stock') || nameLower.includes('opening stock') || nameLower.includes('initial')) return 'مخزون أول المدة (رصيد افتتاحي)';
    if (nameLower.includes('admin override') || nameLower.includes('override')) return 'تعديل إداري';
    if (nameLower.includes('found')) return 'بضاعة عُثر عليها';
    return rawName;
  }, [locale]);

  const fallbackReasons = useMemo(() => [
    { id: 'Damage', name: getLocalizedReasonName('Damage') },
    { id: 'Spoilage', name: getLocalizedReasonName('Spoilage') },
    { id: 'Theft / Loss', name: getLocalizedReasonName('Theft / Loss') },
    { id: 'Inventory Correction', name: getLocalizedReasonName('Inventory Correction') },
    { id: 'Admin Override', name: getLocalizedReasonName('Admin Override') },
    { id: 'OPENING_STOCK', name: getLocalizedReasonName('OPENING_STOCK') },
  ], [getLocalizedReasonName]);

  const reasonItems = useMemo(() => {
    const reasons = varianceReasonsData?.data;
    if (reasons && reasons.length > 0) {
      const mapped = reasons.map(r => ({
        id: r.code || r.name,
        name: getLocalizedReasonName(r.name || r.code),
      }));
      if (!mapped.some((i) => i.id === 'OPENING_STOCK' || i.id === 'Opening Stock')) {
        mapped.push({
          id: 'OPENING_STOCK',
          name: getLocalizedReasonName('OPENING_STOCK'),
        });
      }
      return mapped;
    }
    return fallbackReasons;
  }, [varianceReasonsData, fallbackReasons, getLocalizedReasonName]);



  const allItems = useMemo<ItemOption[]>(() => {
    if (!warehouseId) return [];
    // `items` now carries qtyOnHand / qty_on_hand from the ItemSchema (populated
    // by the backend when warehouse_id is passed as a filter).
    const mappedItems: ItemOption[] = (items || []).map((i) => ({
      id: i.id,
      code: i.code,
      barcode: i.barcode,
      name: i.name,
      image: i.image,
      qtyOnHand: i.qtyOnHand ?? i.qty_on_hand ?? 0,
      qty_on_hand: i.qty_on_hand ?? i.qtyOnHand ?? 0,
      primaryUom: {
        id: i.primaryUom?.id || '',
        code: i.primaryUom?.code || '',
        name: i.primaryUom?.name || i.primaryUom?.code || '',
      },
      uomConversions: i.uomConversions || [],
    }));
    return [...mappedItems, ...customItems];
  }, [items, customItems, warehouseId]);


  useEffect(() => {
    if (isDecreaseOnlyReason(reasonCategory)) {
      setLines(prev =>
        prev.map(l => (l.direction !== 'DECREASE' ? { ...l, direction: 'DECREASE', lotNumber: '', lotId: undefined } : l))
      );
    } else if (isIncreaseOnlyReason(reasonCategory)) {
      setLines(prev =>
        prev.map(l => (l.direction !== 'INCREASE' ? { ...l, direction: 'INCREASE' } : l))
      );
    }
  }, [reasonCategory]);

  // Parse query parameters to pre-populate expiring item disposal
  const paramItemId = searchParams.get('itemId');
  const paramBatch = searchParams.get('batch');
  const paramReason = searchParams.get('reason');

  useEffect(() => {
    if (paramReason === 'damage') {
      setReasonCategory('DAMAGE');
    }
  }, [paramReason]);

  useEffect(() => {
    if (!paramItemId || allItems.length === 0) return;

    setLines(prev => {
      const alreadyAdded = prev.some(l => l.itemId === paramItemId);
      if (alreadyAdded) return prev;

      const item = allItems.find(i => i.id === paramItemId || i.code === paramItemId);
      if (item) {
        return [{
          id: `temp-${item.id}-${Date.now()}`,
          itemId: item.id,
          item: {
            id: item.id,
            code: item.code,
            name: item.name,
            image: item.image,
            primaryUom: {
              code: item.primaryUom.code
            }
          },
          qty: 1,
          baseQty: 1,
          qtyBefore: item.qtyOnHand ?? item.qty_on_hand ?? 0,
          uomId: item.primaryUom.id,
          direction: 'DECREASE',
          lotNumber: paramBatch || '',
          unitCost: 0
        }];
      }
      return prev;
    });
  }, [paramItemId, paramBatch, allItems]);

  const handleAddItem = async (barcode: string) => {
    const resolved = await resolveBarcodeAndUom(barcode, allItems);
    if (!resolved) {
      audioAlerts.playScanInvalid();
      toast.error(tCommon('no_item_found') || "Item not found.");
      return;
    }

    const { item: resolvedItem, uomId: scannedUomId } = resolved;
    const item = allItems.find(i => i.id === resolvedItem.id) || resolvedItem;
    const itemWithStock = item as unknown as { id: string; code: string; name: string; image?: string | null; primaryUom?: { id?: string; code?: string }; uomId?: string; qtyOnHand?: number; qty_on_hand?: number };
    const targetUomId = scannedUomId || itemWithStock.primaryUom?.id || itemWithStock.uomId || '';

    setLines(prev => {
      const existing = prev.find(l => l.itemId === itemWithStock.id && l.uomId === targetUomId);
      if (existing) {
        return prev.map(l => (l.itemId === itemWithStock.id && l.uomId === targetUomId) ? { ...l, qty: l.qty + 1 } : l);
      }
      return [...prev, {
        id: `temp-${itemWithStock.id}-${Date.now()}`,
        itemId: itemWithStock.id,
        item: {
          id: itemWithStock.id,
          code: itemWithStock.code,
          name: itemWithStock.name,
          image: itemWithStock.image || null,
          primaryUom: {
            id: itemWithStock.primaryUom?.id || targetUomId,
            code: itemWithStock.primaryUom?.code || targetUomId
          }
        },
        qty: 1,
        baseQty: 1,
        qtyBefore: itemWithStock.qtyOnHand ?? itemWithStock.qty_on_hand ?? 0,
        uomId: targetUomId,
        direction: isDecreaseOnlyReason(reasonCategory) ? 'DECREASE' : 'INCREASE',
        lotNumber: '',
        unitCost: 0
      }];
    });

    audioAlerts.playScanSuccess();
  };

  const handleSave = () => {
    if (!warehouseId || lines.length === 0) return;

    const selectedWarehouse = warehouses.find(w => w.id === warehouseId);

    createAdjustment.mutate({
      payload: {
        warehouseId: warehouseId,
        reason: reasonCategory,
        notes,
        lines: lines.map(l => {
          const targetLotId = l.lotId || l.lotNumber;
          return {
            itemId: l.itemId,
            quantity: l.qty,
            qty: l.qty,
            uomId: l.uomId,
            direction: l.direction,
            lotId: targetLotId || undefined,
            lotAllocations: targetLotId ? [{ lotId: targetLotId, qty: l.qty }] : undefined,
            isCustom: l.itemId.startsWith('cust-') ? true : undefined,
            unitCost: l.direction === 'INCREASE' ? l.unitCost : null
          };
        })
      },
      signal: abortController.signal,
      headers: {
        'X-Idempotency-Key': idempotencyKey,
        'x-warehouse-id': warehouseId,
        'x-branch-id': selectedWarehouse?.branchId ?? activeScope?.branchId ?? ''
      }
    }, {
      onSuccess: (data) => {
        setDirty(false);
        router.push(`/adjustments/${data.id}`, { skipGuard: true });
      }
    });
  };

  const showNotesError = notes.length > 0 && notes.length < 10;

  const hasInvalidCosts = lines.some(
    l => l.direction === 'INCREASE' && (l.unitCost === null || l.unitCost === undefined || l.unitCost < 0)
  );

  const isValid = !!(
    warehouseId &&
    reasonCategory &&
    notes.length >= 10 &&
    notes.length <= 1000 &&
    lines.length > 0 &&
    lines.every(l => l.qty > 0) &&
    !hasInvalidCosts
  );

  const extraColumns = useMemo(() => [
    {
      header: t('direction') || 'Direction',
      headerClassName: "min-w-[130px]",
      cellClassName: "min-w-[130px]",
      cell: (line: NewAdjustmentLine) => {
        const isStrictDecrease = isDecreaseOnlyReason(reasonCategory);
        return (
          <div className="flex justify-center w-full min-w-0">
            <div className="inline-flex items-center rounded p-0.5 bg-muted border border-border shadow-inner">
              <button
                type="button"
                disabled={isStrictDecrease}
                onClick={() => {
                  setLines(prev => prev.map(l => l.id === line.id ? { ...l, direction: 'INCREASE', lotNumber: '', lotId: undefined } : l));
                }}
                className={cn(
                  "px-2 py-1 text-[10px] font-bold rounded-sm transition-all flex items-center gap-1 whitespace-nowrap active:scale-[0.95] disabled:opacity-50 disabled:cursor-not-allowed",
                  line.direction === 'INCREASE'
                    ? "bg-brand-gold text-slate-950 shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <ArrowUp className="w-3 h-3" />
                {t('direction_increase') || (locale === 'ar' ? 'زيادة' : 'INC')}
              </button>
              <button
                type="button"
                disabled={isStrictDecrease}
                onClick={() => {
                  setLines(prev => prev.map(l => l.id === line.id ? { ...l, direction: 'DECREASE', lotNumber: '', lotId: undefined } : l));
                }}
                className={cn(
                  "px-2 py-1 text-[10px] font-bold rounded-sm transition-all flex items-center gap-1 whitespace-nowrap active:scale-[0.95] disabled:opacity-50 disabled:cursor-not-allowed",
                  line.direction === 'DECREASE'
                    ? "bg-destructive text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <ArrowDown className="w-3 h-3" />
                {t('direction_decrease') || (locale === 'ar' ? 'نقص' : 'DEC')}
              </button>
            </div>
          </div>
        );
      }
    },
    {
      header: locale === 'ar' ? 'تكلفة الوحدة' : 'Unit Cost',
      headerClassName: "min-w-[100px] md:min-w-[120px] text-center whitespace-nowrap",
      cellClassName: "min-w-[100px] md:min-w-[120px] text-center",
      cell: (line: NewAdjustmentLine) => {
        const isIncrease = line.direction === 'INCREASE';
        return (
          <div className="flex justify-center w-full min-w-0">
            <UnitCostInput
              value={line.unitCost}
              disabled={!isIncrease}
              placeholder={isIncrease ? '0' : '-'}
              onChange={(val) => {
                setLines(prev => prev.map(l => l.id === line.id ? { ...l, unitCost: val } : l));
              }}
              className={cn(
                "w-full md:w-28 text-center font-black text-sm h-9 bg-surface-container-highest/30 border border-border/70 text-foreground focus:border-brand-gold focus:ring-1 focus:ring-brand-gold rounded-md outline-none transition-all shadow-sm disabled:opacity-30 disabled:bg-transparent disabled:border-transparent disabled:shadow-none min-w-0 px-1 force-latin-numbers",
                isIncrease && (line.unitCost === null || line.unitCost === undefined || line.unitCost < 0) && "border-destructive/40 focus-visible:ring-1 focus-visible:ring-destructive/30"
              )}
            />
          </div>
        );
      }
    },
    {
      header: t('qty_before') || (locale === 'ar' ? 'قبل' : 'Qty Before'),
      headerClassName: "min-w-[80px] max-w-[95px] text-center whitespace-nowrap",
      cellClassName: "min-w-[80px] max-w-[95px] text-center",
      cell: (line: NewAdjustmentLine) => {
        const scaledQtyBefore = getScaledQtyBefore(
          line.qtyBefore,
          line.uomId,
          line.item,
          allItems,
        );
        return (
          <div className="flex flex-col items-center gap-0.5 tabular-nums">
            <span className="text-body-md font-bold text-muted-foreground/45" lang="en" dir="ltr">
              {Number(scaledQtyBefore).toLocaleString("en-US", {
                maximumFractionDigits: 4,
              })}
            </span>
          </div>
        );
      },
    },
    {
      header: tCommon('table_headers.lot') || tCommon('lot_number') || (locale === 'ar' ? 'رقم الدفعة' : 'Lot Number'),
      headerClassName: "min-w-[220px] md:min-w-[260px] text-center whitespace-nowrap",
      cellClassName: "min-w-[220px] md:min-w-[260px] text-center",
      cell: (line: NewAdjustmentLine) => (
        <div className="flex justify-center w-full min-w-0">
          <AdjustmentLotSelector
            itemId={line.itemId}
            warehouseId={warehouseId}
            value={line.lotId}
            lotNumber={line.lotNumber}
            direction={line.direction}
            locale={locale}
            onChange={(lotId, lotNumber) => {
              setLines(prev => prev.map(l => l.id === line.id ? { ...l, lotId, lotNumber } : l));
            }}
          />
        </div>
      )
    },
    {
      header: t('qty_after') || (locale === 'ar' ? 'بعد' : 'Qty After'),
      headerClassName: "min-w-[80px] max-w-[95px] text-center whitespace-nowrap",
      cellClassName: "min-w-[80px] max-w-[95px] text-center",
      cell: (line: NewAdjustmentLine) => {
        const scaledQtyBefore = getScaledQtyBefore(
          line.qtyBefore,
          line.uomId,
          line.item,
          allItems,
        );
        const qAdj = line.qty || 0;
        const after = line.direction === "INCREASE" ? scaledQtyBefore + qAdj : scaledQtyBefore - qAdj;
        return (
          <div className="flex flex-col items-center justify-center gap-0 sm:gap-1.5 tabular-nums min-w-0 text-center whitespace-normal">
            <span
              className={cn(
                "font-mono font-bold",
                after < 0 ? "text-status-error" : "text-foreground"
              )}
              lang="en"
              dir="ltr"
            >
              {Number(after).toLocaleString("en-US", {
                maximumFractionDigits: 4,
              })}
            </span>
            {after < 0 && (
              <span className="qty-error absolute top-[calc(100%+6px)] ltr:right-0 rtl:left-0 sm:static sm:top-auto sm:right-auto sm:left-auto w-max sm:w-auto text-[10px] md:text-xs text-status-error leading-tight font-semibold uppercase mt-0 sm:mt-1 z-10">
                {t("errors.exceeds_available_stock")}
              </span>
            )}
          </div>
        );
      },
    }
  ], [locale, t, tCommon, reasonCategory, warehouseId, allItems]);


  return (
    <div className="flex flex-col min-h-[calc(100vh-5rem)] w-full max-w-[1920px] mx-auto fade-in duration-1000 animate-in pb-32">
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
              {tCommon('submission_failed')}
            </p>
            <p className="text-body-sm text-status-error/80 leading-relaxed">
              {createAdjustment.error instanceof Error ? createAdjustment.error.message : tCommon('error_generic')}
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
        subtitle={t('subtitle')}
      />

      <LockBanner lockState={lockState} />

      <div className={cn("grid grid-cols-1 w-full flex-1", createAdjustment.isPending && "opacity-60 pointer-events-none transition-opacity")}>
        {/* Unified Master Deck Container - Document Details + Items Section */}
        <div className="lg:col-span-12 flex flex-col gap-6">
          <div className="bg-card backdrop-blur-3xl p-3.5 sm:p-6 lg:p-8 rounded-2xl sm:rounded-[2.5rem] relative overflow-hidden shadow-2xl border border-border/80 space-y-8 transition-all duration-500 hover:border-brand-gold/30 group">
            {/* Decorative ambient background glow */}
            <div className="absolute top-0 end-0 w-96 h-96 bg-brand-gold/5 blur-[100px] pointer-events-none rounded-full" />
            <div className="absolute bottom-0 start-0 w-80 h-80 bg-brand-gold/5 blur-[90px] pointer-events-none rounded-full" />

            {/* SECTION 1: Document Details (تفاصيل المستند) */}
            <div className="relative border-b border-border/60 pb-8 space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-2xl bg-brand-gold/10 dark:bg-brand-gold/15 flex items-center justify-center border border-brand-gold/30 shadow-sm">
                  <Warehouse className="w-5.5 h-5.5 text-brand-gold" />
                </div>
                <div>
                  <h3 className="text-body-lg font-black uppercase tracking-widest text-foreground">
                    {t('details_section')}
                  </h3>
                  <p className="text-xs text-muted-foreground/70 font-semibold mt-0.5">
                    {locale === 'ar' ? 'حدد المستودع والسبب والتفاصيل' : 'Warehouse & Document Specification'}
                  </p>
                </div>
              </div>

              {/* 3-Column Responsive Header Inputs */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Warehouse Selection */}
                <div className="space-y-2">
                  <label htmlFor="warehouse-select" className="text-label-xs font-bold uppercase tracking-wider text-muted-foreground/70 ms-1 flex items-center gap-1">
                    {tCommon('warehouse')} <span className="text-destructive font-bold">*</span>
                  </label>
                  <SmartCombobox
                    items={warehouseItems}
                    value={warehouseId}
                    onSelect={(item) => setWarehouseId(item.id)}
                    placeholder={tCommon('select_warehouse') || "Select Warehouse"}
                    triggerClassName="w-full bg-surface-container-highest/30 backdrop-blur-md border border-border/70 shadow-sm h-12 px-5 rounded-xl text-label-sm font-semibold focus-visible:ring-2 focus-visible:ring-brand-gold/30 transition-all hover:bg-surface-container-highest/60 text-foreground"
                  />
                </div>

                {/* Reason Category */}
                <div className="space-y-2">
                  <label htmlFor="reason-select" className="text-label-xs font-bold uppercase tracking-wider text-muted-foreground/70 ms-1 flex items-center gap-1">
                    {t('reason')} <span className="text-destructive font-bold">*</span>
                  </label>
                  <SmartCombobox
                    items={reasonItems}
                    value={reasonCategory}
                    onSelect={(item) => setReasonCategory(item.id)}
                    placeholder={t('reason') || "Select Reason"}
                    triggerClassName="w-full bg-surface-container-highest/30 backdrop-blur-md border border-border/70 shadow-sm h-12 px-5 rounded-xl text-label-sm font-semibold focus-visible:ring-2 focus-visible:ring-brand-gold/30 transition-all hover:bg-surface-container-highest/60 text-foreground"
                  />
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <label htmlFor="notes-area" className="text-label-xs font-bold uppercase tracking-wider text-muted-foreground/70 ms-1 flex items-center gap-1">
                    {tCommon('notes')} <span className="text-destructive font-bold">*</span>
                  </label>
                  <Textarea
                    id="notes-area"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={t('notes_placeholder')}
                    className="w-full bg-surface-container-highest/30 backdrop-blur-md border border-border/70 shadow-sm rounded-xl p-3 text-body-sm transition-all outline-none resize-none h-12 leading-snug focus:ring-2 focus:ring-brand-gold/30 text-foreground placeholder:text-muted-foreground/50"
                  />
                  {showNotesError && (
                    <p className="text-[10px] font-bold text-status-error uppercase px-1 mt-1">
                      {t('validation.notes_min_length') || 'Reason details must be at least 10 characters'}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* SECTION 2: Items Table & Scanning Section */}
            <div className="relative space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-2xl bg-brand-gold/10 dark:bg-brand-gold/15 flex items-center justify-center border border-brand-gold/30 shadow-sm">
                    <PackagePlus className="w-5.5 h-5.5 text-brand-gold" />
                  </div>
                  <div>
                    <h3 className="text-body-lg font-black uppercase tracking-widest text-foreground">
                      {t('lines_section')}
                    </h3>
                    <span className="text-xs font-mono font-bold text-brand-gold">
                      {lines.length} {tCommon('items') || 'Items'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleSuggestFIFO}
                    disabled={isSuggestingFIFO || lines.length === 0}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-brand-gold/10 to-brand-gold/5 hover:from-brand-gold/20 hover:to-brand-gold/10 border border-brand-gold/30 rounded-full transition-all duration-300 group disabled:opacity-50 disabled:grayscale shadow-sm hover:shadow-brand-gold/20"
                  >
                    <Zap className="w-4 h-4 text-brand-gold group-hover:scale-110 transition-transform" />
                    <span className="text-label-xs font-bold uppercase text-brand-gold tracking-wider">
                      {isSuggestingFIFO ? t('fetching_lots') : t('suggest_fifo')}
                    </span>
                  </button>
                  <div className="flex items-center gap-2 px-5 py-2.5 bg-surface-container-highest/30 rounded-full border border-brand-gold/30 backdrop-blur-sm">
                    <div className="w-2 h-2 rounded-full bg-brand-gold animate-pulse shadow-[0_0_8px_rgba(212,175,55,0.8)]" />
                    <span className="text-label-xs font-bold uppercase text-brand-gold tracking-wider">
                      {lines.length} {tCommon('items') || 'Items'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Input Bars (Scanning + Combobox) */}
              <div className="flex flex-col md:flex-row items-end gap-4 w-full">
                <div className="flex-1 space-y-2 w-full text-center md:text-start">
                  <label className="text-label-xs font-semibold uppercase text-muted-foreground/40 ms-1 whitespace-nowrap block text-center md:text-start">
                    {locale === 'ar' ? 'مسح الباركود' : 'Barcode Scanner'}
                  </label>
                  <ScanInput
                    onScan={handleAddItem}
                    disabled={!warehouseId}
                    placeholder={
                      !warehouseId
                        ? (locale === 'ar' ? 'يرجى اختيار المستودع أولاً...' : 'Please select a warehouse first...')
                        : (t('scan_item_placeholder') || 'Scan item barcode...')
                    }
                    className="w-full bg-surface-container-highest/30 backdrop-blur-md border border-border/70 shadow-sm h-[52px] px-5 rounded-xl text-label-sm font-semibold focus-within:ring-2 focus-within:ring-brand-gold/30 transition-all hover:bg-surface-container-highest/60 text-foreground"
                  />
                </div>
                <div className="flex-1 space-y-2 w-full text-center md:text-start">
                  <label className="text-label-xs font-semibold uppercase text-muted-foreground/40 ms-1 whitespace-nowrap block text-center md:text-start">
                    {locale === 'ar' ? 'البحث عن صنف' : 'Search / Add Item'}
                  </label>
                  <SmartCombobox
                    items={allItems}
                    onSelect={(item: ItemOption) => handleAddItem(item.code)}
                    placeholder={
                      !warehouseId
                        ? (locale === 'ar' ? 'يرجى اختيار المستودع أولاً...' : 'Please select a warehouse first...')
                        : (locale === 'ar' ? 'ابحث عن صنف لإضافته...' : 'Search item to add...')
                    }
                    disabled={!warehouseId || isLoadingItems}
                    triggerClassName="w-full bg-surface-container-highest/30 backdrop-blur-md border border-border/70 shadow-sm h-[52px] px-5 rounded-xl text-label-sm font-semibold focus-visible:ring-2 focus-visible:ring-brand-gold/30 transition-all hover:bg-surface-container-highest/60 text-foreground text-center md:text-start justify-center md:justify-start"
                    onAddCustomItem={(query) => {
                      setCustomItemNameQuery(query);
                      setIsCustomItemDialogOpen(true);
                    }}
                  />
                </div>
              </div>

              {/* High-density interactive virtualized table */}
              <div className="bg-card backdrop-blur-xl shadow-xl rounded-[2rem] border border-border/70 mt-4">
                <DocumentLineItemTable<NewAdjustmentLine>
                  lines={lines}
                  locale={locale}
                  isReadOnly={false}
                  onRemoveLine={(id) => setLines(prev => prev.filter(l => l.id !== id))}
                  hideLotColumns={true}
                  dense={true}
                  enableVirtualization={true}
                  maxHeight="650px"
                  noCollapse={false}
                  mobileLayoutPattern="adjustment-form"
                  extraColumns={extraColumns}
                  headers={{
                    code: tCommon('table_headers.code'),
                    name: tCommon('table_headers.name'),
                    qty: tCommon('table_headers.qty'),
                    uom: tCommon('table_headers.uom'),
                  }}
                  renderQty={(line) => (
                    <div className="flex justify-center w-full min-w-0">
                      <Input
                        type="number"
                        min="0.001"
                        step="0.001"
                        value={line.qty}
                        lang="en"
                        dir="ltr"
                        style={{ direction: "ltr" }}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          const safeVal = isNaN(val) ? 0 : val;
                          const matchedItemForQty = items.find(i => i.id === line.itemId || i.code === line.itemId);
                          const baseUomIdForQty = matchedItemForQty?.primaryUom?.id ?? line.uomId ?? '';
                          const conversionsForQty = (matchedItemForQty?.uomConversions ?? []).map(c => ({
                            fromUomId: c.fromUomId,
                            toUomId: c.toUomId,
                            factor: Number(c.factor),
                          }));
                          import('@logirest/shared-types').then(({ getConversionFactor }) => {
                            const factor = getConversionFactor(line.uomId ?? baseUomIdForQty, baseUomIdForQty, conversionsForQty);
                            const newBaseQty = parseFloat((safeVal * factor).toFixed(4));
                            setLines(prev => prev.map(l => l.id === line.id ? { ...l, qty: safeVal, baseQty: newBaseQty } : l));
                          });
                        }}
                        className="w-full md:w-28 text-center font-black text-sm h-9 bg-surface-container-highest/30 backdrop-blur-md border border-border/70 text-foreground focus:border-brand-gold focus:ring-1 focus:ring-brand-gold rounded-md outline-none transition-all shadow-sm min-w-0 px-1 force-latin-numbers"
                      />
                    </div>
                  )}
                  renderUom={(line) => {
                    const matchedItem = allItems.find(i => i.id === line.itemId || i.code === line.itemId) || items.find(i => i.id === line.itemId || i.code === line.itemId) || line.item;

                    const allowedUomIds = new Set<string>();
                    if (matchedItem?.primaryUom?.id) allowedUomIds.add(matchedItem.primaryUom.id);
                    const lineUomId = (line.item?.primaryUom as unknown as { id?: string })?.id;
                    if (lineUomId) allowedUomIds.add(lineUomId);
                    if (line.uomId) allowedUomIds.add(line.uomId);

                    const matchedConversions = (matchedItem as unknown as { uomConversions?: Array<{ fromUomId?: string; toUomId?: string }> })?.uomConversions || [];
                    matchedConversions.forEach((conv: { fromUomId?: string; toUomId?: string }) => {
                      if (conv.fromUomId) allowedUomIds.add(conv.fromUomId);
                      if (conv.toUomId) allowedUomIds.add(conv.toUomId);
                    });

                    const itemUoMs = uoms.filter(u => allowedUomIds.has(u.id));

                    // If item has no conversion UOMs (or only 1 UOM), render as a clean non-editable badge
                    if (itemUoMs.length <= 1) {
                      const resolvedCode = resolveUomCode(line.uomId, matchedItem || line.item, uoms);
                      return (
                        <div className="flex items-center justify-center w-full min-w-0">
                          <span className="h-9 px-3 text-xs font-bold font-mono text-brand-gold bg-brand-gold/10 border border-brand-gold/20 rounded-xl flex items-center justify-center min-w-[70px]">
                            {resolvedCode}
                          </span>
                        </div>
                      );
                    }

                    const comboboxItems = itemUoMs.map(u => ({
                      id: u.id,
                      name: u.name || u.code,
                      code: u.code,
                    }));

                    return (
                      <div className="flex items-center justify-center w-full min-w-0">
                        <SmartCombobox
                          items={comboboxItems}
                          value={line.uomId}
                          onSelect={(uom) => {
                            setLines(prev => prev.map(l =>
                              l.id === line.id ? { ...l, uomId: uom.id } : l
                            ));
                          }}
                          placeholder={line.item?.primaryUom?.code || "UOM"}
                          triggerClassName="h-9 px-3 text-xs border border-border/70 bg-surface-container-highest/30 backdrop-blur-md text-foreground text-center rounded-xl w-full md:min-w-[140px] font-semibold shadow-sm focus-visible:ring-brand-gold transition-all"
                        />
                      </div>
                    );
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="static md:sticky md:bottom-0 z-40 md:z-50 bg-card/95 backdrop-blur-2xl border border-border md:border-x-0 md:border-b-0 md:border-t p-4 md:px-8 md:py-5 mt-6 md:mt-auto flex flex-col md:flex-row items-center justify-between gap-4 w-full shadow-lg md:shadow-2xl rounded-2xl md:rounded-none">
        {/* 1. The Dynamic Warning Message */}
        {!isValid && (
          <div className="flex items-center gap-3 text-sm font-bold text-brand-gold bg-brand-gold/10 px-5 py-3 rounded-2xl animate-pulse border border-brand-gold/20">
            <Info className="w-5 h-5 shrink-0" />
            <span>{locale === 'ar' ? 'يرجى كتابة الملاحظات واختيار مستودع لتفعيل زر الحفظ' : 'Please write notes and choose a warehouse to enable saving'}</span>
          </div>
        )}
        {isValid && <div />} {/* spacer */}

        {/* 2. The Action Buttons */}
        <div className="grid grid-cols-2 sm:flex sm:items-center gap-3 w-full sm:w-auto">
          {/* Back Button */}
          <button
            type="button"
            onClick={() => router.push('/adjustments')}
            disabled={createAdjustment.isPending}
            className="col-span-2 sm:w-auto px-6 py-3 rounded-2xl border border-border bg-surface-container-highest/40 hover:bg-surface-container-highest text-foreground font-bold uppercase tracking-widest text-xs transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4 shrink-0 rtl:rotate-180" />
            {locale === "ar" ? "عودة" : "Back"}
          </button>

          {/* Save Button */}
          <Button
            type="button"
            onClick={handleSave}
            disabled={!isDirty || !isValid || createAdjustment.isPending || isLocked}
            isLoading={createAdjustment.isPending}
            className="col-span-2 sm:w-auto px-8 py-6 rounded-2xl bg-gradient-to-r from-brand-gold to-amber-400 hover:from-brand-gold/90 hover:to-amber-400/90 text-brand-black text-sm font-black uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3 shadow-lg shadow-brand-gold/20 hover:shadow-brand-gold/40 hover:-translate-y-0.5"
          >
            {t('save_draft') || 'Save Adjustment'}
          </Button>
        </div>
      </div>

      <CreateCustomItemDialog
        key={isCustomItemDialogOpen ? customItemNameQuery : 'closed'}
        isOpen={isCustomItemDialogOpen}
        onClose={() => setIsCustomItemDialogOpen(false)}
        defaultName={customItemNameQuery}
        onCreate={async (newItem) => {
          try {
            await apiClient.post('/master-data/items', z.unknown(), {
              id: newItem.id,
              code: newItem.code,
              barcode: newItem.barcode,
              nameEn: newItem.name_en,
              nameAr: newItem.name_ar,
              primaryUom: newItem.primary_uom,
              trackLots: false,
              isActive: true,
              version: 1
            });
          } catch (err) {
            console.error('Failed to register custom item', err);
          }

          setCustomItems(prev => [...prev, {
            id: newItem.id,
            code: newItem.code,
            barcode: newItem.barcode,
            name: newItem.name_en || newItem.name_ar || '',
            primaryUom: newItem.primary_uom,
          }]);
          setLines(prev => {
            const existing = prev.find(l => l.itemId === newItem.id);
            if (existing) return prev;
            return [...prev, {
              id: newItem.id,
              itemId: newItem.id,
              item: {
                id: newItem.id,
                code: newItem.code,
                name: newItem.name_en || newItem.name_ar || '',
                primaryUom: {
                  code: newItem.primary_uom.code
                }
              },
              qty: 1,
              uomId: newItem.primary_uom.id,
              direction: 'INCREASE',
              lotNumber: '',
              unitCost: 0,
              baseQty: 1
            }];
          });
        }}
      />

    </div>
  );
}
