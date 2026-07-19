'use client';

import { Input } from '@/components/ui/input';
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations, useLocale } from 'next-intl';
import { useUnsavedChangesGuard } from '@/lib/unsaved-changes/useUnsavedChangesGuard';
import { useForm, Controller, useWatch, useFieldArray, type UseFormRegister } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { SmartCombobox } from '@/components/shared/SmartCombobox';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
   TrendingUp,
   Wallet,
   PackageSearch,
   MessageSquare,
   Send,
   Scan
} from 'lucide-react';
import { DocumentLockBanner, DocumentLockWrapper } from '@/components/shared/DocumentLockBanner';
import { DocumentReadOnlyOverlay } from '@/components/shared/DocumentReadOnlyOverlay';
import { FormFooter } from '@/components/layouts/FormLayout';
import { ScanInput } from '@/components/shared/ScanInput/ScanInput';
import { DocumentLineItemTable } from '@/components/shared/DocumentLineItemTable/DocumentLineItemTable';
import { toast } from 'sonner';
import { onFormError } from '@/hooks/useFormError';
import { ActionGuard } from '@/core/workflow/ActionGuard';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { useSearchParams } from 'next/navigation';
import { useCurrencies } from '@/features/purchasing/hooks/useCurrencies';
import { useFXRates } from '@/features/purchasing/hooks/useFXRates';
import { usePO } from '@/features/purchasing/hooks/usePO';
import { usePOList } from '@/features/purchasing/hooks/usePOList';
import { apiClient } from '@/lib/api/client';
import { useAuth } from '@/providers/AuthProvider';
import { type GRNDetail, LineItemSchema } from '@/features/purchasing/hooks/useGRN';
import { isDocumentLocked, type DocumentStatus } from '@logirest/shared-types';
import { GRN_STATUS } from '@logirest/shared-types';
import { useSuppliers } from '@/features/purchasing/hooks/useSuppliers';
import { useWarehouses } from '@/features/warehouses/hooks/useWarehouses';
import { useCreateGRN } from '@/features/purchasing/hooks/useCreateGRN';
import { useUpdateGRN } from '@/features/purchasing/hooks/useUpdateGRN';
import { CreateCustomItemDialog } from '@/components/shared/CreateCustomItemDialog';
import { useBaseCurrency } from '@/hooks/useBaseCurrency';
import { formatCurrency } from '@/utils/currency';
import { useMasterDataList } from '@/features/master-data/hooks/useMasterDataCRUD';
import { Item, ItemSchema } from '@/types/master-data';
import { useWarehouseLock } from '@/hooks/useWarehouseLock';
import { LockBanner } from '@/components/shared/LockBanner';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { useAudioFeedback } from '@/hooks/useAudioFeedback';
import { LotAllocationDialog, type LotAllocation } from './LotAllocationDialog';
import { cn } from '@/lib/utils';

const isExpiryInPast = (date: string) => new Date(date) < new Date(new Date().toDateString());

const grnFormSchema = z.object({
   poId: z.string().min(1, 'Required'),
   supplierId: z.string().min(1, 'Required'),
   currencyId: z.string().min(1, 'Required'),
   exchangeRate: z.coerce.number().positive().min(0.000001).optional().or(z.literal('')),
   warehouseId: z.string().min(1, 'Required'),
   notes: z.string().optional(),
   lines: z.array(LineItemSchema)
});

type GRNFormValues = z.infer<typeof grnFormSchema>;
type LineItem = z.infer<typeof LineItemSchema>;

interface GRNFormProps {
   actions?: React.ReactNode;
   initialData?: GRNDetail;
   id: string;
   onConflict?: () => void;
}

interface GRNReceivedQtyCellProps {
 register: UseFormRegister<GRNFormValues>;
 index: number;
 isLocked: boolean;
 isWarehouseLocked: boolean;
 qty: number;
 receivedQty: number;
 hasError: boolean;
}

function GRNReceivedQtyCell({
 register,
 index,
 isLocked,
 isWarehouseLocked,
 qty,
 receivedQty,
 hasError
}: GRNReceivedQtyCellProps) {
 const isOver = receivedQty > qty;
 return (
  <Input
   type="number"
   dir="ltr"
   lang="en"
   style={{ WebkitLocale: '"en"' }}
   disabled={isLocked || isWarehouseLocked}
   className={cn(
    "w-16 md:w-20 h-7 rounded-sm border text-center px-2 py-0.5 font-mono text-xs outline-none transition-all disabled:opacity-50",
    hasError
     ? "border-destructive ring-1 ring-destructive bg-destructive/10 text-destructive focus:border-destructive"
     : isOver
       ? "border-amber-500 ring-1 ring-amber-500 bg-amber-500/10 text-amber-500 focus:border-amber-400"
        : "bg-white dark:bg-slate-800/50 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-brand-gold/50 focus:border-brand-gold shadow-none placeholder:text-gray-400 dark:placeholder:text-muted-foreground"
   )}
   {...register(`lines.${index}.receivedQty` as const, { valueAsNumber: true })}
  />
 );
}

interface GRNLotAllocationCellProps {
 field: LineItem;
 hasLot: boolean;
 label: string;
 onClick: () => void;
}

function GRNLotAllocationCell({ field, hasLot, label, onClick }: GRNLotAllocationCellProps) {
 return (
  <button
   type="button"
   className={cn(
    'inline-flex items-center justify-center transition-all text-[10px] font-bold uppercase rounded px-2 md:px-2.5 py-0.5 md:py-1 h-7 border',
    hasLot
       ? 'bg-operational-cyan/10 text-operational-cyan hover:bg-operational-cyan/20 border-operational-cyan/30 w-auto font-mono gap-1.5'
       : 'border-[#b48e67] text-[#b48e67] hover:bg-[#b48e67] hover:text-black w-auto'
   )}
   onClick={onClick}
  >
   {hasLot ? (
      <>
       <span className="w-1.5 h-1.5 rounded-full bg-operational-cyan shrink-0" />
       <span dir="ltr" className="font-mono">{field.lot!.lotNumber}</span>
      </>
   ) : (
      label
   )}
  </button>
 );
}

export function GRNForm({ initialData, id, onConflict, actions }: GRNFormProps) {
   const t = useTranslations('procurement.grn');
   const tc = useTranslations('common');
   const ts = useTranslations('operations.stocktake');
   const locale = useLocale();
   const { user } = useAuth();
   const queryClient = useQueryClient();

   const searchParams = useSearchParams();
   const queryPoId = searchParams ? searchParams.get('po_id') : null;

   const { handleSubmit, reset, control, register, getValues, setValue, formState: { errors, isDirty } } = useForm<GRNFormValues>({
      resolver: zodResolver(grnFormSchema),
      defaultValues: {
         poId: initialData?.poId || queryPoId || '',
         supplierId: initialData?.supplierId || '',
         currencyId: initialData?.currencyId || '',
         exchangeRate: initialData?.fxRate || '',
         warehouseId: initialData?.warehouseId || '',
         notes: initialData?.notes || '',
         lines: initialData?.lines || []
      }
   });

   const watchedPoId = useWatch({ control, name: 'poId' });
   const { data: poResponse, isLoading: isLoadingPO } = usePO(watchedPoId || queryPoId || '');
   const poData = poResponse;
   const hasPo = !!watchedPoId;

   const isNew = id === 'new';
   const lastResetId = useRef<string | null>(null);
   const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());
   const { playSound } = useAudioFeedback()

   const { data: suppliers } = useSuppliers();
   const { data: warehousesData } = useWarehouses(); const warehouses = warehousesData?.data || [];
   const { data: currencies } = useCurrencies();

   const { data: poListResponse } = usePOList({ status: 'APPROVED' });
   const approvedPOs = poListResponse?.data || [];

   const poItems = useMemo(() => {
      return approvedPOs?.map(po => ({
         id: po.id,
         name: po.documentNumber || '',
         name_en: po.documentNumber || '',
         name_ar: po.documentNumber || '',
      })) ?? [];
   }, [approvedPOs]);

   const supplierItems = useMemo(() => {
      return suppliers?.map(s => {
         const displayName = s.name || '';
         return {
            id: s.id,
            name: displayName,
            name_en: `${displayName} (${s.code})`,
            name_ar: `${displayName} (${s.code})`,
         };
      }) ?? [];
   }, [suppliers]);

   const warehouseItems = useMemo(() => {
      return warehouses?.map(w => ({
         id: w.id,
         name: w.name || '',
         name_en: w.name || '',
         name_ar: w.name || '',
      })) ?? [];
   }, [warehouses]);

   const currencyItems = useMemo(() => {
      return currencies?.map(c => {
         const displayName = c.name || '';
         return {
            id: c.id,
            name: displayName,
            name_en: `${c.code} — ${displayName}`,
            name_ar: `${c.code} — ${displayName}`,
         };
      }) ?? [];
   }, [currencies]);

   const createMutation = useCreateGRN({ onConflict });
   const updateMutation = useUpdateGRN({ onConflict });

   const [lotDialogState, setLotDialogState] = useState<{
      open: boolean;
      lineId: string;
      lineIndex: number;
      itemName: string;
      receivedQty: number;
      currentLot: LotAllocation | null;
   } | null>(null);

   const [scanError, setScanError] = useState('');
   const [overrideReason, setOverrideReason] = useState('');
   const [expiredLineIds, setExpiredLineIds] = useState<string[]>([]);

   const status = (initialData?.status || GRN_STATUS.DRAFT) as DocumentStatus;
   const isLocked = isDocumentLocked('GRN', status);
   const isSaved = status && (
      status.toLowerCase() === 'saved' ||
      status.toLowerCase() === 'received' ||
      status.toLowerCase() === 'posted'
   );

   const [isCustomItemDialogOpen, setIsCustomItemDialogOpen] = useState(false);
   const [customItemBarcode, setCustomItemBarcode] = useState('');

   const { fields, append, remove, update } = useFieldArray({
      control,
      name: "lines"
   });

    const handleLotClick = useCallback((line: LineItem) => {
       const index = fields.findIndex(f => f.id === line.id);
       if (index < 0) return;
       setLotDialogState({
          open: true,
          lineId: line.id,
          lineIndex: index,
          itemName: line.item.name || line.item.nameEn || line.item.nameAr || '',
          receivedQty: line.receivedQty,
          currentLot: line.lot,
       });
    }, [fields]);



   const { router } = useUnsavedChangesGuard(isDirty);

   const currencyId = useWatch({ control, name: 'currencyId' });
   const warehouseId = useWatch({ control, name: 'warehouseId' });
   const { data: warehouseLock } = useWarehouseLock(warehouseId || null);
   const isWarehouseLocked = !!warehouseLock?.isLocked;
   const watchedLines = useWatch({ control, name: 'lines' });

   const extraColumns = useMemo(() => [
      {
         header: tc('table_headers.received_qty'),
         cell: (field: LineItem) => {
            const index = fields.findIndex(f => f.id === field.id);
            const hasError = !!errors.lines?.[index]?.receivedQty;
            return (
               <GRNReceivedQtyCell
                  register={register}
                  index={index}
                  isLocked={isLocked}
                  isWarehouseLocked={isWarehouseLocked}
                  qty={field.qty}
                  receivedQty={field.receivedQty}
                  hasError={hasError}
               />
            );
         }
      },
      {
         header: tc('table_headers.lot_allocation'),
         isAction: true,
         cell: (field: LineItem) => {
            const hasLot = !!field.lot;
            return (
               <GRNLotAllocationCell
                  field={field}
                  hasLot={hasLot}
                  label={t('allocate_lot')}
                  onClick={() => handleLotClick(field)}
               />
            );
         }
      }
   ], [tc, fields, errors.lines, isLocked, isWarehouseLocked, register, t, handleLotClick]);

   const selectedCurrencyCode = useMemo(() => {
      return currencies?.find(c => c.id === currencyId)?.code || '';
   }, [currencies, currencyId]);

    const { currency: baseCurrency } = useBaseCurrency();
    const { data: fxRates } = useFXRates(selectedCurrencyCode, baseCurrency);
    const watchedExchangeRate = useWatch({ control, name: 'exchangeRate' });
    const currentFxRate = typeof watchedExchangeRate === 'number'
       ? watchedExchangeRate
       : (watchedExchangeRate && !isNaN(parseFloat(watchedExchangeRate)))
          ? parseFloat(watchedExchangeRate)
          : (fxRates?.[0]?.rate || 1);

   const { data: itemsData } = useMasterDataList<Item>('items', ItemSchema);

   const totalForeign = useMemo(() => {
      return (watchedLines || []).reduce((acc, line) => acc + (line.receivedQty * (line.unitCostForeign || 0)), 0);
   }, [watchedLines]);

   useEffect(() => {
      if (initialData && initialData.id !== lastResetId.current) {
         lastResetId.current = initialData.id;
         reset({
            poId: initialData.poId || '',
            supplierId: initialData.supplierId || '',
            currencyId: initialData.currencyId || '',
            exchangeRate: initialData.fxRate || '',
            warehouseId: initialData.warehouseId || '',
            notes: initialData.notes || '',
            lines: initialData.lines || []
         }, {
            keepDirty: false,
            keepTouched: false
         });
         setIdempotencyKey(crypto.randomUUID());
      }
   }, [initialData, reset]);

   useEffect(() => {
      if (isNew && poData) {
         reset({
            poId: poData.id,
            supplierId: poData.supplierId || '',
            currencyId: poData.currencyId || '',
            exchangeRate: poData.exchangeRate || 1,
            warehouseId: poData.targetWarehouseId || '',
            notes: poData.notes || '',
            lines: poData.lines.map(line => {
               const itemId = line.item?.id || line.itemId || '';
               const itemCode = line.item?.code || line.itemSku || '';
               const itemName = line.item?.name || line.itemName || '';
               const uomId = line.item?.primaryUom?.id || line.uomId || '';
               const uomCode = line.item?.primaryUom?.code || line.uomId || '';
               const itemImage = line.item?.image || line.item?.imageUrl || itemsData?.data?.find(i => i.id === itemId)?.image || itemsData?.data?.find(i => i.id === itemId)?.imageUrl || null;
               return {
                  id: line.id,
                  item: {
                     id: itemId,
                     code: itemCode,
                     name: itemName,
                     nameAr: line.item?.nameAr || itemName,
                     nameEn: line.item?.nameEn || itemName,
                     image: itemImage,
                     primaryUom: {
                        id: uomId,
                        code: uomCode
                     }
                  },
                  lot: null,
                  qty: line.quantity || 0,
                  receivedQty: line.quantity || 0,
                  uomId: uomId,
                  unitCostForeign: line.unitPrice || 0,
                  unitCostBase: 0
               };
            })
         }, {
            keepDirty: false,
            keepTouched: false
         });
         setIdempotencyKey(crypto.randomUUID());
      }
   }, [isNew, poData, reset, itemsData]);

   useEffect(() => {
      if (isNew && !initialData && !watchedPoId) {
         setValue('supplierId', '');
         const defaultCurrency = currencies?.find(c => c.isBase || c.code === baseCurrency);
         setValue('currencyId', defaultCurrency?.id || '');
         setValue('exchangeRate', 1);
         setValue('lines', []);
      }
   }, [isNew, initialData, watchedPoId, currencies, baseCurrency, setValue]);

   useEffect(() => {
      const expired = (watchedLines || [])
         .filter(line => line.lot?.expiryDate && isExpiryInPast(line.lot.expiryDate))
         .map(line => line.id);
      setExpiredLineIds(expired);
   }, [watchedLines]);


   const handleScan = async (barcode: string) => {
      if (isWarehouseLocked) {
         playSound('error');
         toast.error(ts('warehouse_locked_mutation_blocked') || "Warehouse is locked. Scan mutation blocked.");
         throw new Error('WarehouseLocked');
      }
      const item = itemsData?.data?.find(i => i.code === barcode || i.barcode === barcode);

      if (item) {
         const currentLines = getValues("lines") || [];
         const index = currentLines.findIndex(l => l.item.id === item.id);

         if (index >= 0) {
            const existing = currentLines[index];
            update(index, {
               ...existing,
               receivedQty: (existing.receivedQty || 0) + 1
            });
            playSound('success');
            toast.success(tc('item_added_quantity_updated', { name: item.name }));
         } else {
            append({
               id: `new-${Date.now()}`,
               item: {
                  id: item.id,
                  code: item.code,
                  name: item.name,
                  nameAr: item.name,
                  nameEn: item.name,
                  image: item.image || item.imageUrl || null,
                  primaryUom: {
                     id: item.primaryUom?.id || 'EA',
                     code: item.primaryUom?.code || 'EA'
                  }
               },
               lot: null,
               qty: 1,
               receivedQty: 1,
               uomId: item.primaryUom?.id || 'EA',
               unitCostForeign: item.lastPurchasePrice || 0,
               unitCostBase: 0
            });
            playSound('success');
            toast.success(tc('item_added', { name: item.name }));
         }
         setScanError('');
      } else {
         setScanError(t('no_item_found'));
         setCustomItemBarcode(barcode);
         setIsCustomItemDialogOpen(true);
         playSound('error');
         toast.error(tc('item_not_found'));
         throw new Error('ItemNotFound');
      }
   };

   const handleLotConfirm = (lot: LotAllocation) => {
      if (!lotDialogState) return;
      const existing = fields[lotDialogState.lineIndex];
      update(lotDialogState.lineIndex, { ...existing, lot });
   };

   const handleLotClear = () => {
      if (!lotDialogState) return;
      const existing = fields[lotDialogState.lineIndex];
      update(lotDialogState.lineIndex, { ...existing, lot: null });
   };


   const workflowActions = (
      <div className="flex items-center gap-3">
         <ActionGuard documentType="GRN" status={status} action="POST" role={user?.role}>
            <PermissionGate action="post" resource="grn">
               <Button
                  disabled={isLocked || isWarehouseLocked}
                  onClick={() => router.push(`/goods-received/${id}/post`)}
                  className="h-12 px-8 bg-operational-cyan hover:brightness-110 text-white text-label-xs font-semibold uppercase shadow-xl shadow-operational-cyan/20 transition-all rounded-xl disabled:opacity-50"
               >
                  <Send className="w-4 h-4 me-2" />
                  {t('post_grn')}
               </Button>
            </PermissionGate>
         </ActionGuard>
      </div>
   );

   const isPending = createMutation.isPending || updateMutation.isPending;
   const isMutationSuccess = createMutation.isSuccess || updateMutation.isSuccess;
   const isScannerEnabled = status === GRN_STATUS.DRAFT && !isLocked && !isWarehouseLocked && !isPending && !isMutationSuccess;

   const onSubmit = async (values: GRNFormValues) => {
      if (!currencies || currencies.length === 0) {
         playSound('error');
         toast.error(t('errors.no_currencies_available'));
         return;
      }

      const expiredLines = values.lines
         .filter(line => line.lot?.expiryDate && isExpiryInPast(line.lot.expiryDate));

      if (expiredLines.length > 0) {
         const role = user?.role;
         if (role === 'WH_KEEPER') {
            toast.error(t('expiry_date_in_past'));
            return;
         }
         if (role === 'INV_MGR' || role === 'ADMIN') {
            if (!overrideReason.trim()) {
               toast.warning(t('expiry_date_in_past_warning'));
               return;
            }
         }
      }
      try {
         const payload = {
            poId: values.poId,
            currencyId: values.currencyId,
            warehouseId: values.warehouseId,
            notes: values.notes,
            lines: (values.lines || []).map(l => ({
               id: (l.id && l.id.startsWith('new-')) ? undefined : l.id,
               itemId: l.item.id,
               lotId: l.lot?.id || null,
               lotNumber: l.lot?.lotNumber || null,
               expiryDate: l.lot?.expiryDate || null,
               receivedQty: isNaN(Number(l.receivedQty)) ? 0 : Number(l.receivedQty),
               unitCostForeign: isNaN(Number(l.unitCostForeign)) ? 0 : Number(l.unitCostForeign || 0),
            }))
         };

         const headers = { 'X-Idempotency-Key': idempotencyKey };

         if (isNew) {
            const result = await createMutation.mutateAsync({ payload, headers });
            playSound('success');
            toast.success(t('create_success'));
            router.push(`/goods-received/${result.id}`, { skipGuard: true });
         } else if (initialData) {
            await updateMutation.mutateAsync({
               id: initialData.id,
               payload: {
                  ...payload,
                  version: initialData.version
               },
               headers
            });
            playSound('success');
            toast.success(t('update_success'));
            queryClient.invalidateQueries({ queryKey: ['grn', initialData.id] });
            queryClient.invalidateQueries({ queryKey: ['grns'] });
         }
      } catch (error) {
         const isConflict = error && typeof error === 'object' && 'name' in error && error.name === 'ConflictError';
         if (!isConflict) {
            // Extract real message from ApiError POJO (not an Error instance — logs as {} otherwise)
            const apiMessage = error && typeof error === 'object'
               ? (error as { message?: string }).message
               : undefined;
            const apiCode = error && typeof error === 'object'
               ? (error as { code?: string }).code
               : undefined;
            console.error('[GRNForm] Submit Error:', { code: apiCode, message: apiMessage, raw: error });
            playSound('error');
            const isToastShown = error && typeof error === 'object' && (error as Record<string, unknown>)._isToastShown === true;
            if (!isToastShown) {
               toast.error(apiMessage || tc('error_occurred'));
            }
         }
      }
   };

   if (isNew && queryPoId && isLoadingPO) {
      return <PageSkeleton variant="detail" />;
   }

   return (
      <div className="flex flex-col min-h-screen pb-32">
         <DocumentLockBanner status={status} isLocked={isLocked} />
         <LockBanner lockState={warehouseLock} />

         <form onSubmit={handleSubmit(onSubmit, onFormError)} className="flex-1 w-full max-w-[1400px] mx-auto px-0 sm:px-4 md:px-8 py-4 md:py-8 space-y-8">
            <Input type="hidden" {...register('poId')} />
            <div className="flex items-center justify-between px-4 sm:px-2 gap-4">
               <div className="flex flex-col flex-1 min-w-0">
                  <h1 className="text-2xl font-black text-foreground tracking-widest uppercase whitespace-nowrap truncate max-w-full block">
                     {isNew ? t('create_new') : `#${initialData?.documentNumber}`}
                  </h1>
                  <p className="text-xs font-bold tracking-[0.2em] text-muted-foreground uppercase mt-1">
                     {isNew ? t('new_manifest_sub') : t('detail_sub')}
                  </p>
               </div>
               {!isNew && (
                  <Button
                     type="button"
                     onClick={(e) => {
                        e.preventDefault();
                        router.push(`/goods-received/${id}/scan-mode`, { skipGuard: true });
                     }}
                     variant="outline"
                     className="h-10 px-6 text-label-xs font-semibold uppercase rounded-lg border-primary/20 text-primary hover:bg-primary/5 transition-all flex items-center gap-2"
                  >
                     <Scan className="w-4 h-4" />
                     {t('scan_mode')}
                  </Button>
               )}
            </div>

            {isCustomItemDialogOpen && (
               <CreateCustomItemDialog
                  isOpen={isCustomItemDialogOpen}
                  onClose={() => setIsCustomItemDialogOpen(false)}
                  defaultName={customItemBarcode}
                  initialBarcode={customItemBarcode}
                  onCreate={async (newItem) => {
                     try {
                        await apiClient.post('/master-data/items', z.unknown(), {
                           id: newItem.id,
                           code: newItem.code,
                           barcode: newItem.barcode,
                           name_en: newItem.name_en,
                           name_ar: newItem.name_ar,
                           primary_uom: newItem.primary_uom,
                           track_lots: false,
                           is_active: true,
                           version: 1
                        });
                        append({
                           id: `new-${Date.now()}`,
                           item: {
                              id: newItem.id,
                              code: newItem.code,
                              name: newItem.name_en || newItem.name_ar || '',
                              nameAr: newItem.name_ar,
                              nameEn: newItem.name_en,
                              primaryUom: {
                                 id: newItem.primary_uom.id,
                                 code: newItem.primary_uom.code
                              }
                           },
                           lot: null,
                           qty: 1,
                           receivedQty: 1,
                           uomId: newItem.primary_uom.id,
                           unitCostForeign: 0,
                           unitCostBase: 0
                        });
                        playSound('success');
                        toast.success(tc('item_added', { name: locale === 'ar' ? newItem.name_ar : newItem.name_en }));
                     } catch (err) {
                        playSound('error');
                        toast.error(tc('error_generic'));
                     }
                  }}
               />
            )}

            {lotDialogState && (
               <LotAllocationDialog
                  open={lotDialogState.open}
                  onClose={() => setLotDialogState(null)}
                  itemName={lotDialogState.itemName}
                  receivedQty={lotDialogState.receivedQty}
                  currentLot={lotDialogState.currentLot}
                  onConfirm={handleLotConfirm}
                  onClear={handleLotClear}
               />
            )}

            <DocumentLockWrapper isLocked={isLocked || isWarehouseLocked}>
               <DocumentReadOnlyOverlay isPosted={isLocked || isWarehouseLocked}>
                  <div className="space-y-10">
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                        <div className="bg-card border-y border-x-0 sm:border border-border shadow-sm px-4 py-6 sm:p-6 rounded-none sm:rounded-2xl flex flex-col gap-1 group relative overflow-visible">
                           <Label htmlFor="supplier-select" className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">{tc('supplier')}</Label>
                           <Controller
                              name="supplierId"
                              control={control}
                              render={({ field }) => (
                                 <SmartCombobox
                                    items={supplierItems}
                                    value={field.value}
                                    onSelect={(item) => field.onChange(item.id)}
                                    placeholder={tc('select_supplier')}
                                    className="mt-2"
                                    triggerClassName={cn(
                                       "w-full h-12 px-4 bg-gray-50 border border-gray-200 text-[#0B1220] dark:bg-transparent dark:border-border dark:text-white rounded-xl uppercase",
                                       hasPo && "bg-slate-100 dark:bg-slate-800 cursor-not-allowed opacity-70"
                                    )}
                                    disabled={isLocked || isWarehouseLocked || hasPo}
                                 />
                              )}
                           />
                           {errors.supplierId && <span className="text-label-xs text-destructive mt-1 font-bold">{errors.supplierId.message}</span>}
                        </div>

                        <div className="bg-card border-y border-x-0 sm:border border-border shadow-sm px-4 py-6 sm:p-6 rounded-none sm:rounded-2xl flex flex-col gap-1 group relative overflow-visible">
                           <div className="absolute top-0 end-0 p-4 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity">
                              <Wallet className="w-12 h-12" />
                           </div>
                           <Label htmlFor="currency-select" className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">{tc('order_currency')}</Label>
                           <Controller
                              name="currencyId"
                              control={control}
                              render={({ field }) => (
                                 <SmartCombobox
                                    items={currencyItems}
                                    value={field.value}
                                    onSelect={(item) => field.onChange(item.id)}
                                    placeholder={tc('select_currency')}
                                    className="mt-2"
                                    triggerClassName={cn(
                                       "w-full h-12 px-4 bg-gray-50 border border-gray-200 text-[#0B1220] dark:bg-transparent dark:border-border dark:text-white rounded-xl uppercase",
                                       hasPo && "bg-slate-100 dark:bg-slate-800 cursor-not-allowed opacity-70"
                                    )}
                                    disabled={isLocked || isWarehouseLocked || hasPo}
                                 />
                              )}
                           />
                           {errors.currencyId && <span className="text-label-xs text-destructive mt-1 font-bold">{errors.currencyId.message}</span>}
                        </div>

                        <div className="bg-card border-y border-x-0 sm:border border-border shadow-sm px-4 py-6 sm:p-6 rounded-none sm:rounded-2xl flex flex-col gap-1 group relative overflow-visible">
                           <div className="absolute top-0 end-0 p-4 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity">
                              <TrendingUp className="w-12 h-12" />
                           </div>
                           <Label htmlFor="exchange-rate-input" className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">
                              {t('exchange_rate') || 'Exchange Rate'}
                           </Label>
                           <Controller
                              name="exchangeRate"
                              control={control}
                              render={({ field }) => (
                                 <Input
                                    id="exchange-rate-input"
                                    type="text"
                                    inputMode="decimal"
                                    disabled={isLocked || isWarehouseLocked || hasPo}
                                    className={cn(
                                       "w-full h-12 px-4 bg-gray-50 border border-gray-200 text-[#0B1220] dark:bg-transparent dark:border-border dark:text-white rounded-xl font-mono mt-2",
                                       hasPo && "bg-slate-100 dark:bg-slate-800 cursor-not-allowed opacity-70"
                                    )}
                                    placeholder="1.00"
                                    {...field}
                                    value={field.value === undefined || field.value === null || (typeof field.value === 'number' && Number.isNaN(field.value)) ? "" : field.value}
                                    onChange={(e) => {
                                       let val = e.target.value.replace(/[^0-9.]/g, '');
                                       const parts = val.split('.');
                                       if (parts.length > 2) {
                                          val = parts[0] + '.' + parts.slice(1).join('');
                                       }
                                       field.onChange(val);
                                    }}
                                 />
                              )}
                           />
                           {errors.exchangeRate && <span className="text-label-xs text-destructive mt-1 font-bold">{errors.exchangeRate.message}</span>}
                        </div>

                        <div className="bg-card border-y border-x-0 sm:border border-border shadow-sm px-4 py-6 sm:p-6 rounded-none sm:rounded-2xl flex flex-col gap-1 group relative overflow-hidden">
                           <div className="absolute top-0 end-0 p-4 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity">
                              <PackageSearch className="w-12 h-12" />
                           </div>
                           <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">{tc('ref_document')}</p>
                           <div className="mt-2">
                              {initialData?.poNumber || poData?.documentNumber ? (
                                 <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="h-8 px-4 bg-primary/5 text-primary border-primary/20 text-label-xs font-semibold uppercase rounded-xl">
                                       <span dir="ltr" className="font-mono">{initialData?.poNumber || poData?.documentNumber}</span>
                                    </Badge>
                                    {isNew && !initialData && (
                                       <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive text-xs"
                                          onClick={() => {
                                             setValue('poId', '');
                                             router.replace('/goods-received/new', { skipGuard: true });
                                          }}
                                       >
                                          ✕
                                       </Button>
                                    )}
                                 </div>
                              ) : isNew ? (
                                 <SmartCombobox
                                    items={poItems}
                                    value=""
                                    onSelect={(item) => {
                                       router.replace(`/goods-received/new?po_id=${item.id}`, { skipGuard: true });
                                    }}
                                    placeholder={t('select_po') || "Select Purchase Order"}
                                    triggerClassName="w-full h-12 px-4 bg-gray-50 border border-gray-200 text-[#0B1220] dark:bg-transparent dark:border-border dark:text-white rounded-xl uppercase"
                                 />
                              ) : (
                                 <p className="font-semibold text-title-sm text-primary/10 italic uppercase">{t('direct_receipt')}</p>
                              )}
                           </div>
                        </div>

                        <div className="bg-card border-y border-x-0 sm:border border-border shadow-sm px-4 py-6 sm:p-6 rounded-none sm:rounded-2xl flex flex-col gap-1 group relative overflow-visible">
                           <Label htmlFor="warehouse-select" className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">{tc('warehouse')}</Label>
                           <Controller
                              name="warehouseId"
                              control={control}
                              render={({ field }) => (
                                 <SmartCombobox
                                    items={warehouseItems}
                                    value={field.value}
                                    onSelect={(item) => field.onChange(item.id)}
                                    placeholder={tc('select_warehouse')}
                                    className="mt-2"
                                    triggerClassName="w-full h-12 px-4 bg-gray-50 border border-gray-200 text-[#0B1220] dark:bg-transparent dark:border-border dark:text-white rounded-xl uppercase"
                                    disabled={isLocked || isWarehouseLocked}
                                 />
                              )}
                           />
                           {errors.warehouseId && <span className="text-label-xs text-destructive mt-1 font-bold">{errors.warehouseId.message}</span>}
                        </div>

                        <div className="col-span-full bg-card border-y border-x-0 sm:border border-border shadow-sm px-4 py-6 sm:p-6 rounded-none sm:rounded-2xl flex flex-col gap-1 group relative overflow-hidden">
                           <div className="absolute top-0 end-0 p-4 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity">
                              <MessageSquare className="w-12 h-12" />
                           </div>
                           <Label htmlFor="notes-area" className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">{tc('notes')}</Label>
                           <Textarea
                              id="notes-area"
                              {...register('notes')}
                              disabled={isLocked || isWarehouseLocked}
                              className="mt-2 w-full min-h-[100px] bg-gray-50 border border-gray-200 text-[#0B1220] dark:bg-transparent dark:border-border dark:text-white placeholder:text-gray-400 dark:placeholder:text-muted-foreground/70 rounded-xl p-4 resize-none"
                              placeholder={tc('notes_placeholder')}
                           />
                        </div>
                     </div>

                     <div className="space-y-6">
                        <div className="bg-operational-cyan/[0.02] px-4 py-6 sm:p-8 rounded-none sm:rounded-2xl border-y border-x-0 sm:border border-operational-cyan/10">
                           <div className="flex items-center gap-6 mb-6">
                              <div className="p-3 bg-operational-cyan/10 rounded-xl text-operational-cyan">
                                 <PackageSearch className="w-6 h-6" />
                              </div>
                              <div>
                                 <h3 className="text-label-sm font-bold uppercase text-foreground">{t('scan_or_search')}</h3>
                                 <p className="text-label-xxs font-semibold text-muted-foreground/40 uppercase tracking-wider">{t('specification')}</p>
                              </div>
                           </div>

                           <ScanInput
                              onScan={handleScan}
                              scannerMode={isScannerEnabled}
                              disabled={!isScannerEnabled}
                              autoFocus={isScannerEnabled}
                              items={itemsData?.data || []}
                              placeholder={t('scan_placeholder')}
                              onError={(bc) => setScanError(t('no_item_found') + ': ' + bc)}
                              size="lg"
                           />
                           {scanError && <div dir="ltr" className="text-destructive text-label-xs font-bold uppercase ps-2 mt-4 flex items-center gap-2">
                              <span className="w-1.5 h-1.5 bg-destructive rounded-full animate-pulse" />
                              {scanError}
                           </div>}
                        </div>

                        <div className="bg-card border-y border-x-0 sm:border border-border shadow-sm rounded-none sm:rounded-2xl overflow-hidden shadow-sm">
                           <DocumentLineItemTable<LineItem>
                              lines={fields.map(f => ({
                                 id: f.id,
                                 qty: f.qty,
                                 receivedQty: f.receivedQty,
                                 uomId: f.uomId,
                                 unitCostForeign: f.unitCostForeign,
                                 unitCostBase: f.unitCostBase,
                                 item: {
                                    id: f.item.id,
                                    code: f.item.code,
                                    name: f.item.name || f.item.nameEn || f.item.nameAr || '',
                                    nameAr: f.item.nameAr,
                                    nameEn: f.item.nameEn,
                                    image: f.item.image || f.item.imageUrl || itemsData?.data?.find(i => i.id === f.item.id)?.image || itemsData?.data?.find(i => i.id === f.item.id)?.imageUrl || null,
                                    primaryUom: {
                                       id: f.item.primaryUom?.id || f.uomId || '',
                                       code: f.item.primaryUom?.code || f.uomId || ''
                                    },
                                 },
                                 lot: f.lot ? { id: f.lot.id, lotNumber: f.lot.lotNumber, expiryDate: f.lot.expiryDate } : null,
                              }))}
                              isReadOnly={isLocked || isWarehouseLocked}
                              dense={true}
                              layoutMode="table"
                              hideLotColumns={true}
                              hideUomColumn={true}
                              borderless={true}
                              noCollapse={true}
                              enableVirtualization={false}
                              rowClassName={(line) => expiredLineIds.includes(line.id) ? 'border-l-2 border-l-destructive bg-destructive/5' : ''}
                              onRemoveLine={(id) => {
                                 const idx = fields.findIndex(f => f.id === id);
                                 if (idx >= 0) remove(idx);
                              }}
                              extraColumns={extraColumns}
                           />
                        </div>
                     </div>
                  </div>
               </DocumentReadOnlyOverlay>

               {expiredLineIds.length > 0 && (user?.role === 'INV_MGR' || user?.role === 'ADMIN') && (
                  <div className="bg-card border border-border shadow-sm p-6 rounded-2xl shadow-sm flex flex-col gap-2 border border-amber-500/20">
                     <Label htmlFor="override-reason" className="text-label-xs font-semibold uppercase text-amber-500">
                        {t('override_reason')} *
                     </Label>
                     <Textarea
                        id="override-reason"
                        value={overrideReason}
                        onChange={(e) => setOverrideReason(e.target.value)}
                        disabled={isLocked || isWarehouseLocked}
                        placeholder={t('override_reason')}
                        className="w-full bg-gray-50 border border-gray-200 text-[#0B1220] dark:bg-transparent dark:border-border dark:text-white rounded-xl p-4 text-body-md font-medium min-h-[80px] resize-none placeholder:text-gray-400 dark:placeholder:text-muted-foreground"
                     />
                  </div>
               )}

               <div className="flex flex-col md:flex-row justify-end items-start md:items-center gap-8 pt-10">
                  <div className="flex flex-col items-end gap-1 px-6">
                     <p className="text-label-xs font-semibold uppercase text-muted-foreground/50">
                        {t('market_index_ref')}
                     </p>
                     <div className="flex items-center gap-2 text-primary">
                        <TrendingUp className="w-3 h-3" />
                        <p dir="ltr" className="text-label-sm font-mono font-semibold">
                           1 {selectedCurrencyCode} = {currentFxRate} {baseCurrency}
                        </p>
                     </div>
                  </div>

                  <div className="bg-card border border-border shadow-sm p-4 md:p-8 rounded-2xl shadow-xl relative overflow-hidden min-w-full md:min-w-[340px] group transition-all hover:shadow-2xl">
                     <div className="absolute top-0 end-0 w-1 h-full bg-primary/20 shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)] group-hover:bg-primary transition-all" />

                     <div className="space-y-6 relative z-10">
                        <div className="flex justify-between items-baseline gap-10">
                           <p className="text-label-xs font-semibold uppercase text-primary/30 group-hover:text-primary transition-colors">{t('receipt_total', { currency: selectedCurrencyCode || '' })}</p>
                           <p dir="ltr" className="text-headline-lg font-display font-semibold text-foreground">
                              {formatCurrency(totalForeign, selectedCurrencyCode, locale as 'ar' | 'en')}
                           </p>
                        </div>



                        <div className="flex justify-between items-center gap-10">
                           <p className="text-label-xs font-semibold uppercase text-primary/20">{t('base_value', { currency: baseCurrency || '' })}</p>
                           <p dir="ltr" className="text-title-lg font-mono font-semibold text-primary/60">
                              {formatCurrency(totalForeign * currentFxRate, baseCurrency, locale as 'ar' | 'en')}
                           </p>
                        </div>
                     </div>
                  </div>
               </div>
            </DocumentLockWrapper>

            <FormFooter
               isLocked={isLocked || isWarehouseLocked}
               onCancel={() => router.push('/goods-received', { skipGuard: !isDirty })}
               cancelLabel={isSaved ? tc('back') || 'BACK' : tc('cancel') || 'CANCEL'}
               actions={actions || workflowActions}
               onSubmit={handleSubmit(onSubmit, onFormError)}
               isPending={isPending}
               submitLabel={isNew ? t('actions.submit') : tc('save')}
            />
         </form>

      </div>
   );
}

