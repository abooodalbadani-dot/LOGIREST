"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useUnsavedChangesGuard } from "@/lib/unsaved-changes/useUnsavedChangesGuard";

import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ArrowRightLeft, Plus, Trash2, Package, Search, FileDown, AlertTriangle, Loader2, ArrowLeft, Send, Save } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api/client";
import { onFormError } from "@/hooks/useFormError";
import { useAudioFeedback } from '@/hooks/useAudioFeedback';
import { useMasterDataList } from "@/features/master-data/hooks/useMasterDataCRUD";
import { ScanInput } from "@/components/shared/ScanInput/ScanInput";
import { type ComboboxItem } from "@/components/shared/SmartCombobox";
import { Item, ItemSchema } from "@/types/master-data";

import { cn } from "@/lib/utils";
import { DocumentExportMenu } from "@/components/shared/DocumentExportMenu";
import { RelationalName } from "@/components/shared/RelationalName";
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format, parseISO, isValid } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
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
import { FormFooter } from "@/components/layouts/FormLayout";
import { isDocumentLocked, type DocumentStatus } from "@logirest/shared-types";
import { resolveBarcodeAndUom } from '@/utils/barcode-resolver';
import type { LotAllocation } from '@/types/documents';
import type { POStatus } from '@logirest/shared-types';
import { PO_STATUS } from "@logirest/shared-types";

export const lineItemSchema = z.object({
  itemId: z.string().min(1),
  itemName: z.string().optional(),
  itemCode: z.string().optional(),
  quantity: z.coerce.number().min(0),
  unitPrice: z.coerce.number().min(0),
  uomId: z.string().min(1),
  notes: z.string().nullable().optional().or(z.literal('')),
});

export const formSchema = z.object({
  supplierId: z.string().min(1),
  prId: z.string().optional().or(z.literal('')),
  currencyId: z.string().min(1),
  exchangeRate: z.coerce.number().positive().min(0.000001),
  expectedDate: z.string().min(1),
  targetWarehouseId: z.string().optional().or(z.literal('')),
  notes: z.string().nullable().optional().or(z.literal('')),
  lines: z.array(lineItemSchema).min(1),
});

export type PurchaseOrderFormValues = z.infer<typeof formSchema>;



interface PurchaseOrderFormProps {
  initialData?: PODetail;
  mode?: "create" | "edit";
  onConflict?: () => void;
  actions?: React.ReactNode;
  onDelete?: () => void;
  isDeletePending?: boolean;
  onSubmitForApproval?: () => void;
  isSubmitPending?: boolean;
  onCancel?: () => void;
}

export function PurchaseOrderForm({
  initialData,
  mode = "create",
  onConflict,
  actions,
  onDelete,
  isDeletePending = false,
  onSubmitForApproval,
  isSubmitPending = false,
  onCancel,
}: PurchaseOrderFormProps) {
  const locale = useLocale();
  const t = useTranslations("procurement.po");
  const tc = useTranslations("common");
  const { router, setDirty } = useUnsavedChangesGuard();
  const queryClient = useQueryClient();

  const form = useForm<PurchaseOrderFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      supplierId: initialData?.supplierId || "",
      prId: initialData?.prId || "",
      currencyId: initialData?.currencyId || "",
      exchangeRate: initialData?.exchangeRate || 1,
      expectedDate: initialData?.expectedDate ? initialData.expectedDate.split("T")[0] : (initialData?.expectedDeliveryDate ? initialData.expectedDeliveryDate.split("T")[0] : new Date().toISOString().split("T")[0]),
      targetWarehouseId: initialData?.targetWarehouseId || (initialData as Record<string, unknown>)?.warehouseId as string || "",
      notes: initialData?.notes || "",
      lines: initialData?.lines ? initialData.lines.map(l => ({
        itemId: l.item?.id || l.itemId || "",
        itemName: l.item?.name || (locale === 'ar' ? l.item?.nameAr : l.item?.nameEn) || "",
        itemCode: l.item?.code || "",
        quantity: l.quantity || 1,
        unitPrice: l.unitPrice || 0,
        uomId: l.uomId || l.item?.primaryUom?.id || "PCS",
        notes: l.notes || ""
      })) : []
    },
  });

  // Re-hydrate form whenever initialData changes/loads
  React.useEffect(() => {
    if (initialData) {
      form.reset({
        supplierId: initialData.supplierId || "",
        prId: initialData.prId || "",
        currencyId: initialData.currencyId || "",
        exchangeRate: initialData.exchangeRate || 1,
        expectedDate: initialData.expectedDate ? initialData.expectedDate.split("T")[0] : (initialData.expectedDeliveryDate ? initialData.expectedDeliveryDate.split("T")[0] : new Date().toISOString().split("T")[0]),
        targetWarehouseId: initialData.targetWarehouseId || (initialData as Record<string, unknown>)?.warehouseId as string || "",
        notes: initialData.notes || "",
        lines: initialData.lines ? initialData.lines.map(l => ({
          itemId: l.item?.id || l.itemId || "",
          itemName: l.item?.name || (locale === 'ar' ? l.item?.nameAr : l.item?.nameEn) || "",
          itemCode: l.item?.code || "",
          quantity: l.quantity || 1,
          unitPrice: l.unitPrice || 0,
          uomId: l.uomId || l.item?.primaryUom?.id || "PCS",
          notes: l.notes || ""
        })) : []
      });
    }
  }, [initialData, form, locale]);


  // Sync dirty state
  React.useEffect(() => {
    setDirty(form.formState.isDirty);
  }, [form.formState.isDirty, setDirty]);

  const createMutation = useCreatePO();
  const updateMutation = useUpdatePO({ onConflict });
  const { playSound } = useAudioFeedback();

  const { fields, append, prepend, remove, update, replace } = useFieldArray({
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

    const resolved = await resolveBarcodeAndUom(barcode, itemsData?.data);
    const item = resolved?.item;
    const targetUomId = resolved?.uomId || item?.primaryUom?.id || '';

    if (item) {
      const currentLines = form.getValues('lines') as PurchaseOrderFormValues['lines'];
      // If the first line is empty, replace it instead of appending
      const isFirstLineEmpty = currentLines.length === 1 && !currentLines[0].itemId;

      const existingIndex = currentLines.findIndex(l => l.itemId === item.id && l.uomId === targetUomId);

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
          uomId: targetUomId,
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
          uomId: targetUomId,
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

  const supplierTotalAmount = (lines || []).reduce((sum, line) => sum + (((line && line.quantity) || 0) * ((line && line.unitPrice) || 0)), 0);
  const baseTotalAmount = supplierTotalAmount * (rate || 1);

  // Workflow Integration
  const status = (initialData?.status || PO_STATUS.DRAFT) as DocumentStatus;
  const isLocked = isDocumentLocked('PO', status);
  const isSaved = status && (
    status.toLowerCase() === 'saved' ||
    status.toLowerCase() === 'received' ||
    status.toLowerCase() === 'posted' ||
    status.toLowerCase() === 'approved' ||
    status.toLowerCase() === 'submitted'
  );


  async function handleSavePO(values: PurchaseOrderFormValues, isSubmitted = false) {
    try {
      if (mode === "edit" && initialData) {
        await updateMutation.mutateAsync({
          id: initialData.id,
          payload: { ...values, version: initialData.version ?? 0 }
        });

        form.reset(values);

        playSound('success');
        toast.success(t("edit_success"));
        queryClient.invalidateQueries({ queryKey: ['purchase-orders', initialData.id] });
        queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      } else {
        if (!currencies || currencies.length === 0) {
          playSound('error');
          toast.error(t('errors.no_currencies_available'));
          return;
        }
        const result = await createMutation.mutateAsync({ payload: { ...values, isSubmitted } });
        playSound('success');
        toast.success(isSubmitted ? (t("submit_success") || "Purchase order submitted for approval") : (t("draft_success") || "Draft saved successfully"));
        router.push(`/purchase-orders/${result.id}`, { skipGuard: true });
      }
    } catch (error) {
      console.error('[PO Submit Error Details] ' + JSON.stringify(error));
      playSound('error');
      const isToastShown = error && typeof error === 'object' && (error as Record<string, unknown>)._isToastShown === true;
      if (!isToastShown) {
        toast.error(tc("error_occurred"));
      }
    }
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const isMutationSuccess = createMutation.isSuccess || updateMutation.isSuccess;
  const isScannerEnabled = status === 'DRAFT' && !isSubmitting && !isMutationSuccess;

  const { data: suppliers, isLoading: loadingSuppliers, isError: suppliersError, error: suppliersErrorDetail } = useSuppliers();
  const { data: currencies, isLoading: loadingCurrencies, isError: currenciesError, error: currenciesErrorDetail } = useCurrencies();
  const { data: warehousesData, isLoading: loadingWarehouses, isError: warehousesError, error: warehousesErrorDetail } = useWarehouses(); const warehouses = warehousesData?.data || [];

  React.useEffect(() => {
    if (suppliersError && suppliersErrorDetail) {
      console.error("[PO_FORM_MASTER_DATA_ERROR] Suppliers query failed:", suppliersErrorDetail);
    }
    if (currenciesError && currenciesErrorDetail) {
      console.error("[PO_FORM_MASTER_DATA_ERROR] Currencies query failed:", currenciesErrorDetail);
    }
    if (warehousesError && warehousesErrorDetail) {
      console.error("[PO_FORM_MASTER_DATA_ERROR] Warehouses query failed:", warehousesErrorDetail);
    }
  }, [suppliersError, suppliersErrorDetail, currenciesError, currenciesErrorDetail, warehousesError, warehousesErrorDetail]);

  const [importDialogOpen, setImportDialogOpen] = React.useState(false);
  const searchParams = useSearchParams();
  const prIdFromUrl = searchParams.get('prId') || searchParams.get('pr_id');
  const [selectedPRId, setSelectedPRId] = React.useState<string | null>(prIdFromUrl || initialData?.prId || null);
  const { data: approvedPRs, isLoading: loadingPRs } = usePRList({ status: 'APPROVED', unconverted: true });
  const { data: selectedPR, isLoading: loadingSelectedPR, isError: prError, error: prErrorDetail } = usePR(selectedPRId);
  const hasAutoImported = React.useRef(false);
  const initialCurrencyId = React.useRef(initialData?.currencyId || "");
  const lastCurrencyIdRef = React.useRef(currencyId);

  React.useEffect(() => {
    if (prError && prErrorDetail) {
      console.error('[PO_FORM_HYDRATION_ERROR] Failed to fetch Purchase Request:', prErrorDetail);
    }
  }, [prError, prErrorDetail]);

  // Sync query parameter to selected PR state once hydrated to resolve Next.js dynamic search parameter mismatch
  React.useEffect(() => {
    if (prIdFromUrl && !hasAutoImported.current) {
      setSelectedPRId(prIdFromUrl);
    }
  }, [prIdFromUrl]);

  React.useEffect(() => {
    if (selectedPR && prIdFromUrl && !hasAutoImported.current && mode === "create") {
      try {
        const prLines = (selectedPR.lines || []).map(l => ({
          itemId: l.item?.id || '',
          itemName: l.item?.name || (locale === 'ar' ? l.item?.nameAr : l.item?.nameEn) || '',
          itemCode: l.item?.code || '',
          quantity: l.reqQty || 0,
          unitPrice: 0,
          uomId: l.uomId || l.item?.primaryUom?.id || '',
          notes: '',
        }));
        replace(prLines);
        form.setValue('prId', selectedPR.id);
        if (selectedPR.departmentId) {
          form.setValue('targetWarehouseId', selectedPR.departmentId);
        }
        if (selectedPR.expectedDate) {
          form.setValue('expectedDate', selectedPR.expectedDate.split("T")[0]);
        }
        hasAutoImported.current = true;
      } catch (err) {
        console.error('[PO_FORM_HYDRATION_ERROR] Failed during auto-import of PR lines:', err);
        toast.error(t('errors.pr_lines_import_failed') || 'Failed to auto-import Purchase Request lines');
      }
    }
  }, [selectedPR, prIdFromUrl, mode, form, locale, replace, t]);

  const handleImportPR = React.useCallback(() => {
    if (!selectedPR) return;
    try {
      const prLines = (selectedPR.lines || []).map(l => ({
        itemId: l.item?.id || '',
        itemName: l.item?.name || (locale === 'ar' ? l.item?.nameAr : l.item?.nameEn) || '',
        itemCode: l.item?.code || '',
        quantity: l.reqQty || 0,
        unitPrice: 0,
        uomId: l.uomId || l.item?.primaryUom?.id || '',
        notes: '',
      }));
      replace(prLines);
      form.setValue('prId', selectedPR.id);
      if (selectedPR.departmentId) {
        form.setValue('targetWarehouseId', selectedPR.departmentId);
      }
      if (selectedPR.expectedDate) {
        form.setValue('expectedDate', selectedPR.expectedDate.split("T")[0]);
      }
      setImportDialogOpen(false);
    } catch (err) {
      console.error('[PO_FORM_HYDRATION_ERROR] Failed during manual import of PR lines:', err);
      toast.error(t('errors.pr_lines_import_failed') || 'Failed to import Purchase Request lines');
    }
  }, [selectedPR, form, locale, replace, t]);

  const selectedCurrencyCode = React.useMemo(() => {
    return currencies?.find(c => c.id === currencyId)?.code || '';
  }, [currencies, currencyId]);

  const { currency: baseCurrencySetting, isLoading: loadingSettings } = useBaseCurrency();
  const baseCurrency = React.useMemo(() => {
    const baseCurrencyObj = currencies?.find(c => c.isBase);
    return baseCurrencyObj?.code || baseCurrencySetting || 'SAR';
  }, [currencies, baseCurrencySetting]);

  const { data: fxRates, isLoading: loadingFXRates } = useFXRates(selectedCurrencyCode, baseCurrency);

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
    if (!selectedCurrencyCode || !baseCurrency) return;

    if (selectedCurrencyCode === baseCurrency) {
      form.setValue("exchangeRate", 1, { shouldValidate: true, shouldDirty: true });
      form.clearErrors("currencyId");
      form.clearErrors("exchangeRate");
      return;
    }

    if (loadingFXRates) return;

    if (fxRates && fxRates.length > 0) {
      const baseCurrId = currencies?.find(c => c.code === baseCurrency)?.id;

      const directMatch = fxRates.find(r => {
        const fromCode = r.fromCurrency?.code || currencies?.find(c => c.id === r.fromCurrencyId)?.code;
        const toCode = r.toCurrency?.code || currencies?.find(c => c.id === r.toCurrencyId)?.code;
        return (fromCode === selectedCurrencyCode || r.fromCurrencyId === currencyId) &&
          (toCode === baseCurrency || (baseCurrId && r.toCurrencyId === baseCurrId));
      });

      const inverseMatch = !directMatch ? fxRates.find(r => {
        const fromCode = r.fromCurrency?.code || currencies?.find(c => c.id === r.fromCurrencyId)?.code;
        const toCode = r.toCurrency?.code || currencies?.find(c => c.id === r.toCurrencyId)?.code;
        return (fromCode === baseCurrency || (baseCurrId && r.fromCurrencyId === baseCurrId)) &&
          (toCode === selectedCurrencyCode || r.toCurrencyId === currencyId);
      }) : undefined;

      let fetchedRate: number | undefined;
      if (directMatch?.rate) {
        fetchedRate = directMatch.rate;
      } else if (inverseMatch?.rate && inverseMatch.rate > 0) {
        fetchedRate = Math.round((1 / inverseMatch.rate) * 100000) / 100000;
      } else if (fxRates[0]?.rate) {
        fetchedRate = fxRates[0].rate;
      }

      if (fetchedRate && !Number.isNaN(fetchedRate) && fetchedRate > 0) {
        form.setValue("exchangeRate", fetchedRate, { shouldValidate: true, shouldDirty: true });
        form.clearErrors("currencyId");
        form.clearErrors("exchangeRate");
        return;
      }
    }

    // ❌ Clear stale FX rate and block submission if foreign currency has no FX rate
    form.setValue("exchangeRate", "" as unknown as number, { shouldValidate: true, shouldDirty: true });
    form.setError("currencyId", {
      type: "manual",
      message: locale === 'ar'
        ? "هذه العملة لا تملك سعر صرف مسجل مقابل العملة الأساسية. يرجى تسجيل سعر الصرف أولاً."
        : "Selected currency has no registered exchange rate to the base currency.",
    });
  }, [fxRates, loadingFXRates, form, selectedCurrencyCode, baseCurrency, currencyId, currencies, locale]);

  React.useEffect(() => {
    const numRate = typeof rate === 'number'
      ? rate
      : (typeof rate === 'string' ? parseFloat(rate) : 0);

    if (numRate && !Number.isNaN(numRate) && numRate > 0) {
      form.clearErrors("currencyId");
      form.clearErrors("exchangeRate");
    }
  }, [rate, form]);

  React.useEffect(() => {
    if (currencies && baseCurrency && !form.getValues('currencyId') && !initialData) {
      const baseCurr = currencies.find(c => c.code === baseCurrency);
      if (baseCurr) {
        form.setValue('currencyId', baseCurr.id, { shouldValidate: true, shouldDirty: true });
        form.setValue('exchangeRate', 1, { shouldValidate: true, shouldDirty: true });
      }
    }
  }, [currencies, baseCurrency, form, initialData]);

  React.useEffect(() => {
    if (warehousesData?.data && warehousesData.data.length > 0 && !form.getValues('targetWarehouseId') && !initialData) {
      form.setValue('targetWarehouseId', warehousesData.data[0].id, { shouldValidate: true });
    }
  }, [warehousesData, form, initialData]);

  const hasMasterDataError = !!(suppliersError || currenciesError || warehousesError);

  if (hasMasterDataError) {
    return (
      <div className="px-4 md:px-8 pt-4 md:pt-8">
        <div className="bg-destructive/10 border border-destructive/20 text-destructive p-4 md:p-8 rounded-2xl shadow-xl flex items-start gap-4">
          <AlertTriangle className="w-8 h-8 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-title-md font-bold uppercase mb-2">
              {t('errors.master_data_failed') || 'System Initialization Failed'}
            </h3>
            <p className="text-muted-foreground/80 text-body-sm font-medium">
              {tc('error_occurred') || 'An error occurred while loading system configurations or lookup registries. Please check your network connection and reload the page.'}
            </p>
            <div className="mt-4 flex gap-4">
              <Button onClick={() => window.location.reload()} variant="outline" className="border-destructive/20 text-destructive hover:bg-destructive/10">
                {tc('retry') || 'Retry'}
              </Button>
              <Button onClick={() => router.push('/purchase-orders')} variant="ghost" className="text-muted-foreground">
                {tc('back') || 'Go Back'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loadingSuppliers || loadingCurrencies || loadingWarehouses || loadingSettings || (prIdFromUrl && loadingSelectedPR)) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-64 bg-card border border-border shadow-sm rounded-2xl" />
        <div className="h-96 bg-card border border-border shadow-sm rounded-2xl" />
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={mode === "edit" ? form.handleSubmit((v) => handleSavePO(v, false), onFormError) : form.handleSubmit((v) => handleSavePO(v, true), onFormError)} className="space-y-0 w-full min-h-screen flex flex-col pb-32">
        <DocumentLockBanner isLocked={isLocked} status={status} />

        <div className="px-0 sm:px-6 md:px-8 pt-0 sm:pt-6 md:pt-8 max-w-6xl mx-auto w-full">
          <div className="bg-card text-card-foreground border-y border-x-0 sm:border border-border shadow-sm px-4 py-6 sm:p-6 md:p-8 rounded-none sm:rounded-2xl relative">
            <div className="flex flex-wrap items-center justify-between pb-6 mb-6 gap-4 min-w-0 w-full">
              <div className="flex items-center gap-3 min-w-0">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => router.push('/purchase-orders')}
                  className="rounded-lg shrink-0 hover:bg-surface-container-high"
                  aria-label="Back"
                >
                  <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
                </Button>
                <h3 className="text-lg md:text-title-lg font-semibold text-operational-cyan uppercase truncate flex-1 min-w-0">
                  {isLocked ? t('detail_title') : (mode === "edit" ? t('specification') : t('new_intent'))}
                </h3>
              </div>
              <div className="flex gap-2 items-center flex-shrink-0 min-w-0 max-w-full">
                {initialData?.id && (
                  <DocumentExportMenu
                    documentType="PO"
                    documentId={initialData.id}
                    documentNumber={initialData.documentNumber}
                  />
                )}
                <span className="px-3 py-1 bg-operational-cyan/5 text-operational-cyan rounded-full text-label-xs font-semibold uppercase shrink-0">{/* i18n-ignore */}PO_ENGINE_V2</span>
                {initialData?.documentNumber && (
                  <span className="px-3 py-1 bg-surface-container-high text-muted-foreground rounded-full text-label-xs font-mono font-bold uppercase tracking-tight whitespace-nowrap truncate max-w-full block">
                    {initialData.documentNumber}
                  </span>
                )}
              </div>
            </div>

            <DocumentLockWrapper isLocked={isLocked}>
              {prError && (
                <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl flex items-start gap-3 text-label-xs font-semibold">
                  <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold uppercase mb-1">{t('errors.pr_load_failed') || 'Failed to load Purchase Request'}</p>
                    <p className="text-muted-foreground/80 font-normal">{tc('error_occurred') || 'An error occurred while loading the linked Purchase Request details. You can proceed with creating a manual Purchase Order.'}</p>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
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
                          onSelect={(item) => {
                            field.onChange(item.id);
                            const selectedSupplier = suppliers?.find(s => s.id === item.id);
                            if (selectedSupplier?.currencyId) {
                              form.setValue('currencyId', selectedSupplier.currencyId, { shouldValidate: true, shouldDirty: true });
                            }
                          }}
                          placeholder={t('select_supplier')}
                          className="bg-gray-50 dark:bg-card border border-gray-200 dark:border-gray-700 text-[#0B1220] dark:text-white h-9 rounded-md text-sm font-semibold uppercase focus:border-[#b48e67] focus:ring-[#b48e67]"
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
                          <Input
                            placeholder={t('linked_pr_placeholder')}
                            disabled={isLocked}
                            className="bg-gray-50 dark:bg-card border border-gray-200 dark:border-gray-700 text-[#0B1220] dark:text-white uppercase font-mono h-9 rounded-md flex-1 focus:border-[#b48e67] focus:ring-[#b48e67]"
                            value={loadingSelectedPR ? tc('loading') : (selectedPR?.documentNumber || field.value || '')}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                            name={field.name}
                            ref={field.ref}
                            readOnly
                          />
                        </FormControl>
                        {!isLocked && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setImportDialogOpen(true)}
                            className="h-9 px-3 text-label-xs font-semibold border-operational-cyan/20 text-operational-cyan hover:bg-operational-cyan/10"
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
                  <DialogContent className="max-w-2xl w-full inset-x-0 bottom-0 mb-0 sm:mb-auto sm:bottom-auto rounded-b-none sm:rounded-b-xl bg-white dark:bg-card shadow-2xl z-50 border border-gray-200 dark:border-gray-800">
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
                            className={`w-full text-start p-4 rounded-xl border transition-all ${selectedPRId === pr.id
                              ? 'border-operational-cyan bg-operational-cyan/5'
                              : 'border-surface-variant/10 hover:border-surface-variant/30 bg-card border border-border shadow-sm'
                              }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="min-w-0">
                                <span className="font-mono font-bold text-label-sm text-foreground truncate block">{pr.documentNumber}</span>
                                <RelationalName name={pr.warehouseName} rawId={pr.departmentId} className="text-label-xxs text-muted-foreground/60 ms-2 truncate inline-block max-w-full align-bottom" />
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
                        onClick={() => {
                          setImportDialogOpen(false);
                          setSelectedPRId(form.getValues('prId') || null);
                        }}
                      >
                        {tc('cancel')}
                      </Button>
                      <Button
                        type="button"
                        disabled={!selectedPRId || loadingPRs || loadingSelectedPR}
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
                  render={({ field }) => {
                    const selectedDate = field.value ? parseISO(field.value) : undefined;
                    const isValidDate = selectedDate && isValid(selectedDate);

                    return (
                      <FormItem>
                        <FormLabel className="text-muted-foreground/40 text-label-xs uppercase font-semibold">{t('expected_date')}</FormLabel>
                        <FormControl>
                          <Popover>
                            <PopoverTrigger asChild>
                              <button
                                type="button"
                                disabled={isLocked}
                                className={cn(
                                  "flex h-9 w-full rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-card px-3 font-mono text-label-xs uppercase shadow-sm focus:outline-none focus:border-[#b48e67] focus:ring-1 focus:ring-[#b48e67] items-center justify-between font-semibold text-[#0B1220] dark:text-white transition-colors disabled:opacity-50 disabled:pointer-events-none",
                                  !field.value && "text-muted-foreground/60"
                                )}
                              >
                                <span lang="en" dir="ltr" className="force-latin-numbers inline-block text-start font-mono text-label-xs">
                                  {isValidDate ? format(selectedDate, "dd/MM/yyyy") : (tc('select_date') || 'Select Date')}
                                </span>
                                <CalendarIcon className="w-4 h-4 text-muted-foreground/60 shrink-0 ms-2" />
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 border border-border bg-card shadow-xl rounded-xl" align="start">
                              <CalendarComponent
                                mode="single"
                                selected={isValidDate ? selectedDate : undefined}
                                onSelect={(date) => {
                                  field.onChange(date ? format(date, "yyyy-MM-dd") : "");
                                }}
                                disabled={isLocked}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
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
                          className="bg-gray-50 dark:bg-card border border-gray-200 dark:border-gray-700 text-[#0B1220] dark:text-white h-9 rounded-md text-sm font-semibold uppercase focus:border-[#b48e67] focus:ring-[#b48e67]"
                          disabled={isLocked}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Group Supplier Currency & Exchange Rate in a single 2-column grid row */}
                <div className="grid grid-cols-2 gap-2 w-full md:col-span-2">
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
                            className="bg-gray-50 dark:bg-card border border-gray-200 dark:border-gray-700 text-[#0B1220] dark:text-white h-9 rounded-md text-xs font-semibold uppercase font-mono focus:border-[#b48e67] focus:ring-[#b48e67]"
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
                        <FormLabel className="text-muted-foreground/40 text-label-xs uppercase font-semibold">{t('fx_rate', { currency: baseCurrency })}</FormLabel>
                        <div className="relative">
                          {loadingFXRates ? (
                            <Loader2 className="absolute start-3 top-2.5 h-4 w-4 text-operational-cyan animate-spin" />
                          ) : (
                            <ArrowRightLeft className="absolute start-3 top-2.5 h-4 w-4 text-muted-foreground/40" />
                          )}
                          <FormControl>
                            <Input
                              type="text"
                              inputMode="decimal"
                              disabled={isLocked}
                              readOnly={selectedCurrencyCode === baseCurrency}
                              className={cn(
                                "bg-gray-50 dark:bg-card border border-gray-200 dark:border-gray-700 text-[#0B1220] dark:text-white h-9 ps-10 rounded-md focus:border-[#b48e67] focus:ring-[#b48e67] force-latin-numbers font-mono text-xs",
                                selectedCurrencyCode === baseCurrency && "opacity-80 cursor-not-allowed bg-gray-100 dark:bg-card"
                              )}
                              dir="ltr"
                              lang="en"
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
                          </FormControl>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2 text-start">
                      <FormLabel className="text-muted-foreground/40 text-label-xs uppercase font-semibold">{t('general_notes')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('notes_placeholder')} disabled={isLocked} className="bg-gray-50 dark:bg-card border border-gray-200 dark:border-gray-700 text-[#0B1220] dark:text-white h-11 rounded-md focus:border-[#b48e67] focus:ring-[#b48e67]" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="pt-10">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 bg-white dark:bg-card border border-gray-200 dark:border-gray-800 shadow-sm p-4 md:p-6 rounded-2xl">
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
                    <div className="flex-1 w-full max-w-2xl">
                      <ScanInput
                        onScan={handleScan}
                        scanStatus={scanStatus}
                        statusMessage={statusMessage}
                        items={itemsData?.data as ComboboxItem[] || []}
                        placeholder={tc('select_item')}
                        size="lg"
                        label={t('scan_or_search')}
                        scannerMode={isScannerEnabled}
                        disabled={!isScannerEnabled}
                        autoFocus={isScannerEnabled}
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


                {/* ── Totals ─────────────────────────────────────────────────── */}
                <div className="mt-10 flex flex-col md:flex-row justify-end gap-4 md:gap-6">
                  <div className="bg-gray-50 dark:bg-card border border-gray-200 dark:border-gray-800 px-4 md:px-8 py-3 md:py-5 rounded-xl md:rounded-2xl flex items-center justify-between gap-4 md:min-w-[300px]">
                    <span className="text-label-xs uppercase font-semibold text-muted-foreground/40">{t('supplier_total')}</span>
                    <span className="text-body-md md:text-title-lg font-mono font-semibold text-foreground" dir="ltr">
                      {formatCurrency(supplierTotalAmount, selectedCurrencyCode, locale as 'ar' | 'en')}
                    </span>
                  </div>
                  <div className="bg-operational-cyan/[0.03] dark:bg-operational-cyan/[0.01] border border-operational-cyan/10 px-4 md:px-8 py-3 md:py-5 rounded-xl md:rounded-2xl flex items-center justify-between gap-4 md:min-w-[300px] backdrop-blur-sm relative overflow-hidden">
                    <div className="absolute top-0 start-0 w-1 h-full bg-operational-cyan/20" />
                    <span className="text-label-xs uppercase font-semibold text-operational-cyan/60">{t('base_total', { currency: baseCurrency })}</span>
                    <span className="text-body-md md:text-headline-lg font-mono font-semibold text-operational-cyan" dir="ltr">
                      {formatCurrency(baseTotalAmount, baseCurrency, locale as 'ar' | 'en')}
                    </span>
                  </div>
                </div>
              </div>
            </DocumentLockWrapper>
          </div>
        </div>

        <FormFooter
          isLocked={isLocked}
          isPending={isSubmitting || isSubmitPending || isDeletePending}
          onCancel={onCancel || (() => router.push('/purchase-orders'))}
          cancelLabel={(tc.has('actions.cancel') ? tc('actions.cancel') : null) || (locale === 'ar' ? 'إلغاء' : 'Cancel')}
          actions={
            !isLocked && (
              <>
                {/* 1. Delete Button (for existing draft) */}
                {mode === "edit" && onDelete && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onDelete}
                    disabled={isDeletePending || isSubmitting}
                    isLoading={isDeletePending}
                    className="h-10 px-4 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20 text-label-xs font-bold uppercase border border-destructive/20 transition-all flex items-center"
                  >
                    <Trash2 className="w-4 h-4 me-1.5" />
                    {(tc.has('actions.delete') ? tc('actions.delete') : null) || (locale === 'ar' ? 'حذف' : 'Delete')}
                  </Button>
                )}

                {/* 2. Save Draft / Save Changes Button */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={form.handleSubmit((values) => handleSavePO(values, false), onFormError)}
                  disabled={!form.formState.isDirty || !form.formState.isValid || isSubmitting}
                  isLoading={isSubmitting}
                  className="h-10 px-4 rounded-xl border-border text-foreground hover:bg-muted text-label-xs font-bold uppercase transition-all flex items-center"
                >
                  <Save className="w-4 h-4 me-1.5" />
                  {mode === "edit"
                    ? ((tc.has('save') ? tc('save') : null) || (locale === 'ar' ? 'حفظ' : 'Save Changes'))
                    : ((t.has('save_draft') ? t('save_draft') : null) || (locale === 'ar' ? 'حفظ كمسودة' : 'Save as Draft'))}
                </Button>

                {/* 3. Submit for Approval Button */}
                <Button
                  type="button"
                  onClick={
                    onSubmitForApproval
                      ? async () => {
                          if (form.formState.isDirty) {
                            await form.handleSubmit((values) => handleSavePO(values, false), onFormError)();
                          }
                          onSubmitForApproval();
                        }
                      : form.handleSubmit((values) => handleSavePO(values, true), onFormError)
                  }
                  disabled={isSubmitting || isSubmitPending}
                  isLoading={isSubmitting || isSubmitPending}
                  className="h-10 px-5 rounded-xl bg-operational-cyan hover:brightness-110 text-white text-label-xs font-bold uppercase shadow-md shadow-operational-cyan/20 border-none transition-all active:scale-95 flex items-center"
                >
                  <Send className="w-4 h-4 me-1.5" />
                  {(t.has('actions.submit') ? t('actions.submit') : null) || (locale === 'ar' ? 'إرسال' : 'Submit')}
                </Button>
              </>
            )
          }
        />
      </form>
    </Form>
  );
}
