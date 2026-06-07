"use client";

import * as React from "react";
import { useUnsavedChangesGuard } from "@/lib/unsaved-changes/useUnsavedChangesGuard";

import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ArrowRightLeft, Plus, Trash2, Package, Search, FileDown } from "lucide-react";
import { toast } from "sonner";
import { onFormError } from "@/hooks/useFormError";
import { useAudioFeedback } from '@/hooks/useAudioFeedback';
import { useMasterDataList } from "@/features/master-data/hooks/useMasterDataCRUD";
import { ScanInput } from "@/components/shared/ScanInput/ScanInput";
import { type ComboboxItem } from "@/components/shared/SmartCombobox";
import { Item, ItemSchema } from "@/types/master-data";

import { DocumentExportMenu } from "@/components/shared/DocumentExportMenu";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { SmartCombobox } from "@/components/shared/SmartCombobox";
import { useCreatePO } from "@/features/purchasing/hooks/useCreatePO";
import { useUpdatePO } from "@/features/purchasing/hooks/useUpdatePO";
import { PODetail } from "@/features/purchasing/hooks/usePO";
import { useSuppliers } from "@/features/purchasing/hooks/useSuppliers";
import { useCurrencies } from "@/features/purchasing/hooks/useCurrencies";
import { useWarehouses } from "@/features/warehouses/hooks/useWarehouses";
import { useFXRates } from "@/features/purchasing/hooks/useFXRates";
import { useBaseCurrency } from "@/hooks/useBaseCurrency";
import { formatCurrency } from "@/utils/currency";
import { PurchaseOrderLineItems } from "./purchase-order-line-items";
import { usePRList } from "@/features/purchasing/hooks/usePRList";
import { usePR } from "@/features/purchasing/hooks/usePR";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";



import { DocumentLockBanner, DocumentLockWrapper } from "@/components/shared/DocumentLockBanner";
import { FormFooter } from "@/components/shared/FormFooter";
import { isDocumentLocked, type DocumentStatus } from "@logirest/shared-types";
import { PO_STATUS } from "@logirest/shared-types";

export const lineItemSchema = z.object({
  itemId: z.string().min(1),
  itemName: z.string().optional(),
  itemCode: z.string().optional(),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative(),
  uomId: z.string().min(1),
  notes: z.string().optional(),
});

export const formSchema = z.object({
  supplierId: z.string().min(1),
  prId: z.string().optional(),
  currencyId: z.string().min(1),
  exchangeRate: z.number().min(0.0001),
  expectedDate: z.string().min(1),
  targetWarehouseId: z.string().min(1),
  notes: z.string().optional(),
  lines: z.array(lineItemSchema).min(1),
});

export type PurchaseOrderFormValues = z.infer<typeof formSchema>;


interface PurchaseOrderFormProps {
  initialData?: PODetail;
  mode?: "create" | "edit";
  onConflict?: () => void;
  actions?: React.ReactNode;
}

export function PurchaseOrderForm({ initialData, mode = "create", onConflict, actions }: PurchaseOrderFormProps) {
  const locale = useLocale();
  const t = useTranslations("procurement.po");
  const tc = useTranslations("common");
  const { router, setDirty } = useUnsavedChangesGuard();
  
  const form = useForm<PurchaseOrderFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      supplierId: initialData?.supplierId || "",
      prId: initialData?.prId || "",
      currencyId: initialData?.currencyId || "",
      exchangeRate: initialData?.exchangeRate || 1,
      expectedDate: initialData?.expectedDate || "",
      targetWarehouseId: initialData?.targetWarehouseId || "",
      notes: initialData?.notes || "",
      lines: initialData?.lines.map(l => ({
        itemId: l.item?.id || "",
        itemName: l.item?.name || (locale === 'ar' ? l.item?.nameAr : l.item?.nameEn),
        itemCode: l.item?.code || "",
        quantity: l.quantity || 1,
        unitPrice: l.unitPrice || 0,
        uomId: l.uomId,
        notes: l.notes || ""
      })) || [{ itemId: "", itemName: "", itemCode: "", quantity: 1, unitPrice: 0, uomId: "PCS", notes: "" }]
    },
  });

  // Sync dirty state
  React.useEffect(() => {
    setDirty(form.formState.isDirty);
  }, [form.formState.isDirty, setDirty]);
  
  const createMutation = useCreatePO();
  const updateMutation = useUpdatePO({ onConflict });
  const { playSound } = useAudioFeedback();

  const { fields, append, prepend, remove, update } = useFieldArray({
    control: form.control,
    name: "lines",
  });

  const lines = useWatch({
    control: form.control,
    name: "lines",
  });
  const currencyId = useWatch({
    control: form.control,
    name: "currencyId",
  });
  const rate = useWatch({
    control: form.control,
    name: "exchangeRate",
  });

  const [scanStatus, setScanStatus] = React.useState<"idle" | "success" | "error">("idle");
  const [statusMessage, setStatusMessage] = React.useState("");

  const { data: itemsData, isLoading: loadingItems } = useMasterDataList<Item>('items', ItemSchema);

  const handleScan = async (barcode: string) => {
    if (loadingItems) {
      toast.info(tc('loading_data'));
      return;
    }

    const cleanBarcode = barcode.trim().toLowerCase();
    const item = itemsData?.data?.find(i => 
      i.code?.toLowerCase() === cleanBarcode || 
      i.barcode?.toLowerCase() === cleanBarcode
    );
    if (item) {
      const currentLines = form.getValues('lines') as PurchaseOrderFormValues['lines'];
      // If the first line is empty, replace it instead of appending
      const isFirstLineEmpty = currentLines.length === 1 && !currentLines[0].itemId;
      
      const existingIndex = currentLines.findIndex(l => l.itemId === item.id);
      
      if (existingIndex >= 0 && !isFirstLineEmpty) {
        const qty = (currentLines[existingIndex].quantity || 0) + 1;
        update(existingIndex, { ...currentLines[existingIndex], quantity: qty });
        setScanStatus("success");
        setStatusMessage(tc('item_added_quantity_updated', { name: item.name }));
      } else if (isFirstLineEmpty) {
        update(0, {
          itemId: item.id,
          itemName: item.name,
          itemCode: item.code,
          quantity: 1,
          unitPrice: item.lastPurchasePrice || 0,
          uomId: item.primaryUom?.id || 'PCS',
          notes: ''
        });
        setScanStatus("success");
        setStatusMessage(tc('item_added', { name: item.name }));
      } else {
        prepend({
          itemId: item.id,
          itemName: item.name,
          itemCode: item.code,
          quantity: 1,
          unitPrice: item.lastPurchasePrice || 0,
          uomId: item.primaryUom?.id || 'PCS',
          notes: ''
        });
        setScanStatus("success");
        setStatusMessage(tc('item_added', { name: item.name }));
      }

      setTimeout(() => {
        setScanStatus("idle");
        setStatusMessage("");
      }, 2000);
    } else {
      setScanStatus("error");
      setStatusMessage(tc('item_not_found'));
      setTimeout(() => {
        setScanStatus("idle");
        setStatusMessage("");
      }, 3000);
    }
  };

  const supplierTotalAmount = lines.reduce((sum, line) => sum + ((line.quantity || 0) * (line.unitPrice || 0)), 0);
  const baseTotalAmount = supplierTotalAmount * (rate || 1);

  // Workflow Integration
  const status = (initialData?.status || PO_STATUS.DRAFT) as DocumentStatus;
  const isLocked = isDocumentLocked('PO', status);


  async function onSubmit(values: PurchaseOrderFormValues) {
    try {
      if (mode === "edit" && initialData) {
        await updateMutation.mutateAsync({ 
          id: initialData.id,
          payload: { ...values, version: initialData.version ?? 0 } 
        });
        playSound('success');
        toast.success(t("edit_success"));
      } else {
        if (!currencies || currencies.length === 0) {
          playSound('error');
          toast.error(t('errors.no_currencies_available'));
          return;
        }
        const result = await createMutation.mutateAsync({ payload: values });
        playSound('success');
        toast.success(t("submit_success"));
        router.push(`/purchase-orders/${result.id}`, { skipGuard: true });
      }
    } catch (error) {
      console.error(error);
      playSound('error');
      toast.error(tc("error_occurred"));
    }
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const { data: suppliers, isLoading: loadingSuppliers } = useSuppliers();
  const { data: currencies, isLoading: loadingCurrencies } = useCurrencies();
  const { data: warehousesData, isLoading: loadingWarehouses } = useWarehouses(); const warehouses = warehousesData?.data || [];

  const [importDialogOpen, setImportDialogOpen] = React.useState(false);
  const [selectedPRId, setSelectedPRId] = React.useState<string | null>(null);
  const { data: approvedPRs, isLoading: loadingPRs } = usePRList({ status: 'APPROVED' });
  const { data: selectedPR } = usePR(selectedPRId);

  const handleImportPR = React.useCallback(() => {
    if (!selectedPR) return;
    const prLines = selectedPR.lines.map(l => ({
      itemId: l.item.id,
      itemName: l.item.name || (locale === 'ar' ? l.item.nameAr : l.item.nameEn) || '',
      itemCode: l.item.code,
      quantity: l.reqQty,
      unitPrice: 0,
      uomId: l.uomId,
      notes: '',
    }));
    form.setValue('lines', prLines);
    form.setValue('prId', selectedPR.id);
    setImportDialogOpen(false);
    setSelectedPRId(null);
  }, [selectedPR, form, locale]);

  const selectedCurrencyCode = React.useMemo(() => {
    return currencies?.find(c => c.id === currencyId)?.code || '';
  }, [currencies, currencyId]);

  const { currency: baseCurrency, isLoading: loadingSettings } = useBaseCurrency();
  const { data: fxRates } = useFXRates(selectedCurrencyCode, baseCurrency || 'SAR');

  const supplierItems = React.useMemo(() => {
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

  const warehouseItems = React.useMemo(() => {
    return warehouses?.map(w => ({
      id: w.id,
      name: w.name || '',
      name_en: w.name || '',
      name_ar: w.name || '',
    })) ?? [];
  }, [warehouses]);

  const currencyItems = React.useMemo(() => {
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
  
  React.useEffect(() => {
    if (fxRates?.[0]?.rate && !initialData) {
      form.setValue("exchangeRate", fxRates[0].rate);
    }
  }, [fxRates, form, initialData]);

  if (loadingSuppliers || loadingCurrencies || loadingWarehouses || loadingSettings) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-64 bg-surface-container-low rounded-2xl" />
        <div className="h-96 bg-surface-container-low rounded-2xl" />
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit, onFormError)} className="space-y-0 w-full min-h-screen bg-surface-container-low flex flex-col pb-32">
        <DocumentLockBanner isLocked={isLocked} status={status} />

        <div className="px-8 pt-8">
          <div className="bg-surface-container-lowest p-8 rounded-2xl relative shadow-2xl shadow-black/5">
            <div className="flex items-center justify-between pb-6 mb-6">
              <h3 className="text-title-lg font-semibold text-operational-cyan uppercase">
                {isLocked ? t('detail_title') : (mode === "edit" ? t('specification') : t('new_intent'))}
              </h3>
              <div className="flex gap-2 items-center">
                <DocumentExportMenu />
                <span className="px-3 py-1 bg-operational-cyan/5 text-operational-cyan rounded-full text-label-xs font-semibold uppercase">{/* i18n-ignore */}PO_ENGINE_V2</span>
                {initialData?.documentNumber && (
                  <span className="px-3 py-1 bg-surface-container-high text-muted-foreground rounded-full text-label-xs font-mono font-bold uppercase tracking-tight">
                    {initialData.documentNumber}
                  </span>
                )}
              </div>
            </div>

            <DocumentLockWrapper isLocked={isLocked}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <FormField
                  control={form.control}
                  name="supplierId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground/40 text-label-xs uppercase font-semibold">{t('supplier')}</FormLabel>
                      <FormControl>
                        <SmartCombobox
                          items={supplierItems}
                          value={field.value}
                          onSelect={(item) => field.onChange(item.id)}
                          placeholder={t('select_supplier')}
                          className="bg-surface-container-low border-none h-11 rounded-xl focus:ring-1 focus:ring-operational-cyan/30 text-label-xs font-semibold uppercase"
                          disabled={isLocked}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="prId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground/40 text-label-xs uppercase font-semibold">{t('linked_pr')}</FormLabel>
                      <div className="flex gap-2">
                        <FormControl>
                          <Input placeholder={t('linked_pr_placeholder')} disabled={isLocked} className="bg-surface-container-low uppercase font-mono border-none h-11 rounded-xl focus-visible:ring-operational-cyan/30 flex-1" {...field} />
                        </FormControl>
                        {!isLocked && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setImportDialogOpen(true)}
                            className="h-11 px-3 text-label-xs font-semibold border-operational-cyan/20 text-operational-cyan hover:bg-operational-cyan/10"
                          >
                            <FileDown className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>{t('import_from_pr') || 'Import from Purchase Request'}</DialogTitle>
                    </DialogHeader>
                    <div className="max-h-80 overflow-y-auto space-y-2">
                      {loadingPRs ? (
                        <div className="text-center py-8 text-label-xs text-muted-foreground/60">{tc('loading')}</div>
                      ) : !approvedPRs?.data?.length ? (
                        <div className="text-center py-8 text-label-xs text-muted-foreground/60">{t('no_approved_prs') || 'No approved purchase requests found'}</div>
                      ) : (
                        approvedPRs.data.map(pr => (
                          <button
                            key={pr.id}
                            type="button"
                            onClick={() => setSelectedPRId(pr.id === selectedPRId ? null : pr.id)}
                            className={`w-full text-start p-4 rounded-xl border transition-all ${
                              selectedPRId === pr.id
                                ? 'border-operational-cyan bg-operational-cyan/5'
                                : 'border-surface-variant/10 hover:border-surface-variant/30 bg-surface-container-low'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="font-mono font-bold text-label-sm text-foreground">{pr.documentNumber}</span>
                                <span className="text-label-xxs text-muted-foreground/60 ms-2">{pr.departmentId}</span>
                              </div>
                              <span className="text-label-xxs font-semibold uppercase text-muted-foreground/40">{pr.createdAt?.split('T')[0]}</span>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                    <DialogFooter>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => { setImportDialogOpen(false); setSelectedPRId(null); }}
                      >
                        {tc('cancel')}
                      </Button>
                      <Button
                        type="button"
                        disabled={!selectedPRId || loadingPRs}
                        onClick={handleImportPR}
                        className="bg-operational-cyan hover:brightness-110 text-white"
                      >
                        {t('import_lines') || 'Import Lines'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <FormField
                  control={form.control}
                  name="expectedDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground/40 text-label-xs uppercase font-semibold">{t('expected_date')}</FormLabel>
                      <FormControl>
                        <Input type="date" disabled={isLocked} className="bg-surface-container-low border-none h-11 rounded-xl focus-visible:ring-operational-cyan/30" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="targetWarehouseId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground/40 text-label-xs uppercase font-semibold">{t('target_warehouse')}</FormLabel>
                      <FormControl>
                        <SmartCombobox
                          items={warehouseItems}
                          value={field.value}
                          onSelect={(item) => field.onChange(item.id)}
                          placeholder={t('select_warehouse')}
                          className="bg-surface-container-low border-none h-11 rounded-xl focus:ring-1 focus:ring-operational-cyan/30 text-label-xs font-semibold uppercase"
                          disabled={isLocked}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 mt-4">
                <FormField
                  control={form.control}
                  name="currencyId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground/40 text-label-xs uppercase font-semibold">{t('supplier_currency')}</FormLabel>
                      <FormControl>
                        <SmartCombobox
                          items={currencyItems}
                          value={field.value}
                          onSelect={(item) => field.onChange(item.id)}
                          placeholder={t('currency_placeholder')}
                          className="bg-surface-container-low border-none h-11 rounded-xl focus:ring-1 focus:ring-operational-cyan/30 text-label-xs font-semibold uppercase font-mono"
                          disabled={isLocked}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="exchangeRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground/40 text-label-xs uppercase font-semibold">{t('fx_rate')}</FormLabel>
                      <div className="relative">
                        <ArrowRightLeft className="absolute start-3 top-3.5 h-4 w-4 text-muted-foreground/40" />
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.0001" 
                            min="0" 
                            disabled={isLocked}
                            className="bg-surface-container-low border-none h-11 ps-10 rounded-xl focus-visible:ring-operational-cyan/30" 
                            dir="ltr" 
                            {...field} 
                            onChange={(e) => field.onChange(e.target.valueAsNumber)}
                          />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem className="md:col-span-3 text-start">
                      <FormLabel className="text-muted-foreground/40 text-label-xs uppercase font-semibold">{t('general_notes')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('notes_placeholder')} disabled={isLocked} className="bg-surface-container-low border-none h-11 rounded-xl focus-visible:ring-operational-cyan/30" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="pt-10">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 bg-surface-container-low/20 p-6 rounded-2xl">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-operational-cyan/10 rounded-2xl flex items-center justify-center text-operational-cyan">
                      <Package className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-label-xs font-semibold uppercase text-muted-foreground/70">{tc('items')}</h3>
                      <p className="text-label-xxs font-semibold text-muted-foreground/30 uppercase mt-0.5">{t('specification')}</p>
                    </div>
                  </div>

                  {!isLocked && (
                    <div className="flex-1 max-w-2xl">
                      <ScanInput
                        onScan={handleScan}
                        scanStatus={scanStatus}
                        statusMessage={statusMessage}
                        items={itemsData?.data as ComboboxItem[] || []}
                        placeholder={tc('select_item')}
                        size="lg"
                        label={t('scan_or_search')}
                        scannerMode={true}
                      />
                    </div>
                  )}
                </div>

                <PurchaseOrderLineItems 
                  form={form}
                  itemsData={itemsData}
                  isLocked={isLocked}
                  currency={selectedCurrencyCode}
                  fields={fields}
                  remove={remove}
                  update={update}
                  prepend={prepend}
                />

                
                <div className="mt-10 flex flex-col md:flex-row justify-end gap-6">
                  <div className="bg-surface-container-high/20 px-8 py-5 rounded-2xl border-none flex items-center justify-between gap-10 min-w-[300px]">
                    <span className="text-label-xs uppercase font-semibold text-muted-foreground/40">{t('supplier_total')}</span>
                    <span className="text-title-lg font-mono font-semibold text-foreground" dir="ltr">
                      {formatCurrency(supplierTotalAmount, selectedCurrencyCode, locale as 'ar' | 'en')}
                    </span>
                  </div>
                  <div className="bg-operational-cyan/[0.03] px-8 py-5 rounded-2xl border-none flex items-center justify-between gap-10 min-w-[300px] backdrop-blur-sm relative overflow-hidden">
                    <div className="absolute top-0 start-0 w-1 h-full bg-operational-cyan/20" />
                    <span className="text-label-xs uppercase font-semibold text-operational-cyan/60">{t('base_total')}</span>
                    <span className="text-headline-lg font-mono font-semibold text-operational-cyan" dir="ltr">
                      {formatCurrency(baseTotalAmount, baseCurrency || 'SAR', locale as 'ar' | 'en')}
                    </span>
                  </div>
                </div>
              </div>
            </DocumentLockWrapper>
          </div>
        </div>

        <FormFooter 
          isLocked={isLocked}
          onCancel={() => router.push('/purchase-orders', { skipGuard: !form.formState.isDirty })}
          onSubmit={form.handleSubmit(onSubmit, onFormError)}
          isPending={isSubmitting}
          submitLabel={mode === "edit" ? tc('save') : t('actions.submit')}
          actions={actions}
        />
      </form>
    </Form>
  );
}
