"use client";

import * as React from "react";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useUnsavedChangesGuard } from "@/lib/unsaved-changes/useUnsavedChangesGuard";
import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import {
  Plus,
  PackageCheck,
  Trash2,
  Settings2,
  Warehouse,
  Building2,
  FileText,
  Calculator,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  ListFilter
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LockBanner } from "@/components/ui/lock-banner";
import { FEFOLotAllocator } from "@/components/ui/fefo-lot-allocator";
import { PostConfirmDialog } from "@/components/shared/PostConfirmDialog";
import { useCreateIssue, type CreateIssuePayload } from "@/features/operations/hooks/useCreateIssue";
import { useKitchenRequestList, useKitchenRequest } from "@/features/operations/hooks/useKitchenRequests";
import { IssueLot } from "@/features/operations/types";
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useWarehouses } from "@/features/warehouses/hooks/useWarehouses";
import { useDepartments } from "@/features/departments/hooks/useDepartments";
import { useItems } from "@/features/items/hooks/useItems";
import { useLotsByItem } from "@/features/operations/hooks/useLotsByItem";
import { type Item, isItemBatchTracked } from "@/types/master-data";
import { SmartCombobox } from "@/components/shared/SmartCombobox";
import { ScanInput } from "@/components/shared/ScanInput/ScanInput";
import { toast } from "sonner";
import { useWarehouseLock } from "@/hooks/useWarehouseLock";
import { DocumentLineItemTable, type LineItem, type ExtraColumn } from "@/components/shared/DocumentLineItemTable/DocumentLineItemTable";
import { cn } from "@/lib/utils";
import { useAudioFeedback } from '@/hooks/useAudioFeedback';
import { onFormError } from "@/hooks/useFormError";
import { Textarea } from "@/components/ui/textarea";

const buildLineSchema = (t: (k: string) => string) => z.object({
  itemId: z.string().min(1, t('validation.item_required')),
  requestedQty: z.number().min(0.01, t('validation.qty_positive')),
  qty: z.number(),
  lotAllocations: z.array(z.custom<IssueLot>()),
  notes: z.string().optional(),
});

const buildFormSchema = (t: (k: string) => string) => z.object({
  warehouseId: z.string().min(1, t('validation.warehouse_required')),
  destinationDeptId: z.string().min(1, t('validation.department_required')),
  lines: z.array(buildLineSchema(t)).min(1, t('validation.items_required')),
  notes: z.string().optional(),
});

type IssueFormValues = z.infer<ReturnType<typeof buildFormSchema>>;

interface CustomLineItem extends LineItem {
  qtyAllocated: number;
  index: number;
  selectedItem?: Item;
}



interface QuantityInputProps {
  value: number | string;
  onChange: (val: number | "") => void;
  disabled?: boolean;
  isInvalid?: boolean;
  className?: string;
}

const QuantityInput = React.memo(function QuantityInput({ value, onChange, disabled, isInvalid, className }: QuantityInputProps) {
  const [localValue, setLocalValue] = useState(value !== undefined && value !== null ? String(value) : "");

  useEffect(() => {
    setLocalValue(value !== undefined && value !== null ? String(value) : "");
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    if (rawVal === '' || /^\d*\.?\d*$/.test(rawVal)) {
      setLocalValue(rawVal);
      if (rawVal === '' || rawVal === '.') {
        onChange('');
      } else {
        const parsed = parseFloat(rawVal);
        onChange(isNaN(parsed) ? '' : parsed);
      }
    }
  };

  const handleBlur = () => {
    let finalVal = 1;
    if (localValue === '' || localValue === '.') {
      finalVal = 1;
    } else {
      const parsed = parseFloat(localValue);
      if (isNaN(parsed) || parsed <= 0) {
        finalVal = 1;
      } else {
        finalVal = parsed;
      }
    }
    setLocalValue(String(finalVal));
    onChange(finalVal);
  };

  return (
    <Input
      type="text"
      inputMode="decimal"
      aria-invalid={isInvalid}
      value={localValue}
      disabled={disabled}
      onChange={handleChange}
      onBlur={handleBlur}
      className={className}
      dir="ltr"
    />
  );
});

export function IssueForm() {
  const t = useTranslations("operations.issue");
  const tc = useTranslations("common");
  const locale = useLocale();
  const isAr = locale === "ar";
  const { router, registerDirty } = useUnsavedChangesGuard();
  const createIssue = useCreateIssue();
  const { playSound } = useAudioFeedback();

  const { data: warehousesData } = useWarehouses(); const warehouses = warehousesData?.data || [];
  const { data: deptData } = useDepartments();
  const departments = deptData?.data || [];
  const { data: itemsData } = useItems(); const items = itemsData?.data || [];

  const [allocatorOpen, setAllocatorOpen] = useState(false);
  const [activeLineIndex, setActiveLineIndex] = useState<number | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [selectedKitchenRequestId, setSelectedKitchenRequestId] = useState<string | null>(null);
  const { data: kitchenRequestsPaginated } = useKitchenRequestList({ status: "SUBMITTED" });
  const kitchenRequests = kitchenRequestsPaginated?.data || [];
  const { data: kitchenRequestData } = useKitchenRequest(selectedKitchenRequestId || "");

  const formSchema = buildFormSchema((k) => t(k as Parameters<typeof t>[0]));

  const form = useForm<IssueFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      warehouseId: "",
      destinationDeptId: "",
      lines: [],
      notes: "",
    },
  });

  // Sync kitchen request items and properties
  useEffect(() => {
    if (kitchenRequestData) {
      form.setValue("warehouseId", kitchenRequestData.warehouseId);
      form.setValue("destinationDeptId", kitchenRequestData.departmentId);
      const newLines = kitchenRequestData.items.map(item => ({
        itemId: item.itemId,
        requestedQty: item.quantity,
        qty: 0,
        lotAllocations: [],
        notes: "",
      }));
      form.setValue("lines", newLines, { shouldDirty: true, shouldValidate: true });
    }
  }, [kitchenRequestData, form]);

  // Register dirty state
  useEffect(() => {
    registerDirty(form.formState.isDirty);
  }, [form.formState.isDirty, registerDirty]);

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "lines",
  });

  const currentFields = fields || [];

  const watchedLines = useWatch({
    control: form.control,
    name: "lines",
  });

  const watchedWarehouse = useWatch({ control: form.control, name: "warehouseId" });
  const activeItemId = activeLineIndex !== null ? currentFields[activeLineIndex]?.itemId : undefined;
  const { data: availableLots } = useLotsByItem({
    itemId: activeItemId,
    warehouseId: watchedWarehouse,
  });

  const tableLines = React.useMemo<CustomLineItem[]>(() => {
    return currentFields.map((field, index) => {
      const lineVal = watchedLines?.[index];
      const selectedItem = items?.find(i => i.id === lineVal?.itemId);
      return {
        id: field.id,
        item: {
          id: lineVal?.itemId || '',
          code: selectedItem?.barcode || selectedItem?.code || '',
          name: selectedItem?.name || '',
          image: selectedItem?.image || null,
          primaryUom: {
            code: selectedItem?.primaryUom?.code || '',
          }
        },
        qty: lineVal?.requestedQty ?? 1,
        uomId: selectedItem?.primaryUom?.id || '',
        lotAllocations: (lineVal?.lotAllocations || []).map(lot => ({
          lotId: lot.lotNumber,
          lotNumber: lot.lotNumber,
          expiryDate: lot.expiryDate,
          allocatedQty: lot.allocatedQty,
        })),
        qtyAllocated: lineVal?.qty ?? 0,
        index,
        selectedItem,
      };
    });
  }, [fields, watchedLines, items]);

  const extraColumns = React.useMemo<ExtraColumn<CustomLineItem>[]>(() => [
    {
      header: t('fulfillment_status'),
      cell: (line: CustomLineItem) => {
        const isTracked = isItemBatchTracked(line.selectedItem);
        if (!isTracked) {
          return (
            <div className="flex justify-center w-full">
              <div className="h-8 px-3 rounded flex items-center justify-between gap-2 transition-all duration-300 font-mono text-[11px] font-bold w-full md:w-auto bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                <span>N/A (NON-TRACKED)</span>
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
            </div>
          );
        }

        const isAllocated = (line.qtyAllocated ?? 0) >= (line.qty ?? 0);
        return (
          <div className="flex justify-center w-full">
            <div className={cn(
              "h-8 px-3 rounded flex items-center justify-between gap-2 transition-all duration-300 font-mono text-[11px] font-bold w-full md:w-auto",
              isAllocated
                ? "bg-operational-cyan/15 text-operational-cyan border border-operational-cyan/30"
                : "bg-surface-container text-muted-foreground border-0"
            )}>
              <span>{line.qtyAllocated || 0} / {line.qty || 0}</span>
              {isAllocated ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5 opacity-30" />}
            </div>
          </div>
        );
      }
    },
    {
      header: tc('table_headers.actions') || 'Allocate',
      cell: (line: CustomLineItem) => {
        const isTracked = isItemBatchTracked(line.selectedItem);
        if (!isTracked) {
          return (
            <div className="flex justify-center w-full">
              <span className="text-[10px] font-bold uppercase text-muted-foreground/40 italic py-1.5">—</span>
            </div>
          );
        }

        const isAllocated = (line.qtyAllocated ?? 0) >= (line.qty ?? 0);
        const hasSelection = !!line.item.id;
        return (
          <div className="flex justify-center w-full">
            <Button
              type="button"
              disabled={!hasSelection}
              className={cn(
                "h-8 px-3 text-[10px] font-bold uppercase rounded transition-all whitespace-nowrap w-full md:w-auto",
                isAllocated
                  ? "border border-operational-cyan text-operational-cyan bg-operational-cyan/10 hover:bg-operational-cyan hover:text-foreground"
                  : "border border-border text-muted-foreground bg-transparent hover:border-operational-cyan hover:text-operational-cyan"
              )}
              onClick={() => handleOpenAllocator(line.index)}
            >
              {isAllocated ? t('redefine_batches') : t('sync_fefo')}
              <ChevronRight className="ms-1 w-3 h-3" />
            </Button>
          </div>
        );
      }
    }
  ], [t, tc]);

  const renderQty = React.useCallback((line: CustomLineItem) => (
    <div className="flex flex-col items-center gap-0.5 w-full">
      <div className="flex justify-center w-full">
        <QuantityInput
          value={form.watch(`lines.${line.index}.requestedQty`)}
          isInvalid={!!form.formState.errors.lines?.[line.index]?.requestedQty}
          onChange={(val) => {
            form.setValue(`lines.${line.index}.requestedQty`, val === '' ? 0 : val, { shouldDirty: true, shouldValidate: true });
          }}
          disabled={form.formState.isSubmitting}
          className="w-full text-center font-black text-xs h-7 px-1 bg-white dark:bg-card border border-[#b48e67]/40 text-[#0B1220] dark:text-white focus:border-[#b48e67] focus:ring-1 focus:ring-[#b48e67] rounded-md outline-none transition-all font-mono"
        />
      </div>
      {form.formState.errors.lines?.[line.index]?.requestedQty && (
        <p className="text-[9px] font-bold text-status-error uppercase text-center">
          {t('validation.qty_positive')}
        </p>
      )}
    </div>
  ), [form, t]);

  const renderUom = React.useCallback((line: CustomLineItem) => (
    <span className="text-label-xs font-semibold text-muted-foreground/40 uppercase">
      {line.selectedItem?.primaryUom?.code || '---'}
    </span>
  ), []);

  const { data: lockState } = useWarehouseLock(watchedWarehouse || null);
  const isWarehouseLocked = lockState?.isLocked ?? false;

  const handleOpenAllocator = (index: number) => {
    setActiveLineIndex(index);
    setAllocatorOpen(true);
  };

  const handleAllocate = (lotAllocations: IssueLot[]) => {
    if (activeLineIndex === null) return;
    const line = fields[activeLineIndex];
    const allocated = lotAllocations.reduce((s, l) => s + l.allocatedQty, 0);
    update(activeLineIndex, {
      ...line,
      qty: allocated,
      lotAllocations,
    });
  };

  const isLineFulfilled = React.useCallback((f: { itemId: string; qty?: number; requestedQty?: number }) => {
    const selectedItem = items?.find(i => i.id === f.itemId);
    if (!isItemBatchTracked(selectedItem)) return true;
    return (f.qty ?? 0) >= (f.requestedQty ?? 0);
  }, [items]);

  const allLinesAllocated = fields.length > 0 && fields.every(isLineFulfilled);

  const handleScan = (barcode: string) => {
    const matchedItem = items?.find(i => i.barcode === barcode || i.code === barcode);
    if (matchedItem) {
      const existingIndex = watchedLines?.findIndex(i => i?.itemId === matchedItem.id) ?? -1;
      if (existingIndex !== -1) {
        const currentQty = form.getValues(`lines.${existingIndex}.requestedQty`) || 0;
        form.setValue(`lines.${existingIndex}.requestedQty`, currentQty + 1, { shouldDirty: true, shouldValidate: true });
      } else {
        append({ itemId: matchedItem.id, requestedQty: 1, qty: 0, lotAllocations: [] });
      }
      playSound('success');
      toast.success(isAr ? `تمت إضافة ${matchedItem.name}` : `Added ${matchedItem.name}`);
    } else {
      playSound('error');
      toast.error(isAr ? 'الصنف غير موجود' : 'Item not found');
    }
  };

  const onSubmit = (data: IssueFormValues) => {
    if (!allLinesAllocated) return;
    const payload: CreateIssuePayload = {
      warehouseId: data.warehouseId,
      destinationDeptId: data.destinationDeptId,
      notes: data.notes,
      lines: data.lines.map(line => ({
        itemId: line.itemId,
        requestedQty: line.requestedQty,
        notes: line.notes,
        lotAllocations: line.lotAllocations.map(lot => ({
          lotId: lot.lotId,
          lotNumber: lot.lotNumber,
          expiryDate: lot.expiryDate,
          allocatedQty: lot.allocatedQty,
        })),
      })),
      kitchenRequestId: selectedKitchenRequestId || undefined,
    };
    createIssue.mutate(payload, {
      onSuccess: (issue: { id: string }) => {
        playSound('success');
        router.push(`/issues/${issue.id}`, { skipGuard: true });
      },
      onError: () => {
        playSound('error');
        console.error("Failed to create issue");
      },
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(() => setConfirmOpen(true), onFormError)} className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-200 pb-24">

        {/* Fulfillment Orchestration Header */}
        <div className={cn(
          "bg-surface-lowest dark:bg-card border-y border-x-0 sm:border border-border shadow-none sm:shadow-sm p-4 sm:p-6 rounded-none sm:rounded-2xl flex flex-col w-full text-left items-start",
          isAr && "text-right items-start"
        )}>
          <div className={cn(
            "flex items-center gap-4 mb-6 border-b border-border/20 pb-4 w-full",
            isAr ? "flex-row-reverse" : "flex-row"
          )}>
            <div className="p-2.5 rounded-xl bg-operational-cyan/10 text-operational-cyan transition-all duration-300">
              <Settings2 className="w-5 h-5" />
            </div>
            <div className={cn(
              "flex flex-col",
              isAr ? "items-end" : "items-start"
            )}>
              <h2 className="text-base md:text-lg font-bold text-foreground tracking-wide uppercase truncate">
                {t('title')}
              </h2>
              <p className="text-[10px] text-muted-foreground uppercase italic mt-0.5">
                {t('new_description')}
              </p>
            </div>
            <div className={cn(
              "ms-auto flex items-center gap-2",
              isAr ? "mr-auto ms-0" : "ms-auto mr-0"
            )}>
              <Badge className="bg-surface-container-high dark:bg-card text-muted-foreground border-none font-semibold text-[10px] uppercase px-3 py-1 rounded-lg">{tc('warehouses.main')}</Badge>
            </div>
          </div>

          {isWarehouseLocked && (
            <div className="mb-6 animate-in zoom-in-95 duration-300 w-full">
              <LockBanner message={t('validation.warehouse_locked')} />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 w-full">
            <FormItem>
              <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                {t('kitchen_request') || "Kitchen Request"}
              </FormLabel>
              <FormControl>
                <SmartCombobox
                  items={kitchenRequests.map(kr => ({
                    id: kr.id,
                    name: `${kr.requestNumber} (${kr.departmentName || kr.departmentId})`,
                  }))}
                  value={selectedKitchenRequestId || ""}
                  onSelect={(item) => setSelectedKitchenRequestId(item.id)}
                  placeholder={t('select_kitchen_request') || "Select Kitchen Request"}
                  triggerClassName="w-full bg-slate-50 dark:bg-surface-container border border-border/50 text-foreground placeholder-muted-foreground rounded-lg px-3 focus:border-brand-gold focus:ring-1 focus:ring-brand-gold outline-none transition-all shadow-sm h-11 text-xs font-bold"
                />
              </FormControl>
            </FormItem>

            <FormField<IssueFormValues, "warehouseId">
              control={form.control}
              name="warehouseId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 flex items-center gap-1.5">
                    <Warehouse className="w-3.5 h-3.5" />
                    {tc('warehouse')}
                  </FormLabel>
                  <FormControl>
                    <SmartCombobox
                      items={warehouses || []}
                      value={field.value}
                      onSelect={(item) => field.onChange(item.id)}
                      placeholder={tc('warehouse') || "Select Warehouse"}
                      disabled={!!selectedKitchenRequestId}
                      triggerClassName="w-full bg-slate-50 dark:bg-surface-container border border-border/50 text-foreground placeholder-muted-foreground rounded-lg px-3 focus:border-brand-gold focus:ring-1 focus:ring-brand-gold outline-none transition-all shadow-sm h-11 text-xs font-bold"
                    />
                  </FormControl>
                  <FormMessage className="text-[10px] font-semibold uppercase" />
                </FormItem>
              )}
            />

            <FormField<IssueFormValues, "destinationDeptId">
              control={form.control}
              name="destinationDeptId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5" />
                    {t('destination')}
                  </FormLabel>
                  <FormControl>
                    <SmartCombobox
                      items={departments}
                      value={field.value}
                      onSelect={(item) => field.onChange(item.id)}
                      placeholder={t('select_department')}
                      disabled={!!selectedKitchenRequestId}
                      triggerClassName="w-full bg-slate-50 dark:bg-surface-container border border-border/50 text-foreground placeholder-muted-foreground rounded-lg px-3 focus:border-brand-gold focus:ring-1 focus:ring-brand-gold outline-none transition-all shadow-sm h-11 text-xs font-bold"
                    />
                  </FormControl>
                  <FormMessage className="text-[10px] font-semibold uppercase" />
                </FormItem>
              )}
            />

            <FormField<IssueFormValues, "notes">
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem className="lg:col-span-3">
                  <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    {t('operational_notes')}
                  </FormLabel>
                  <FormControl>
                    <Textarea placeholder={t('notes_placeholder')} className="w-full bg-slate-50 dark:bg-surface-container border border-border/50 text-foreground placeholder-muted-foreground rounded-lg p-3 focus:border-brand-gold focus:ring-1 focus:ring-brand-gold outline-none transition-all min-h-[80px] text-xs font-bold" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Fulfillment Manifest Section */}
        <div className="col-span-1 md:col-span-12 space-y-5 w-full mt-2">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-4">
              <div className="bg-brand-gold/10 text-brand-gold border border-brand-gold/20 rounded-lg p-2">
                <Calculator className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold uppercase tracking-widest text-brand-gold">{t('ledger_title')}</h3>
                <p className="text-[10px] font-semibold text-muted-foreground/50 uppercase mt-0.5">{t('ledger_subtitle')}</p>
              </div>
            </div>
          </div>

          {/* Input Bars (Scanning + Combobox) */}
          <div className="mb-6 w-full grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <div className="space-y-2">
              <label className="text-label-xs font-semibold uppercase text-muted-foreground/40 ms-1 whitespace-nowrap block text-start">
                {isAr ? 'مسح الباركود' : 'Barcode Scanner'}
              </label>
              <ScanInput
                onScan={handleScan}
                placeholder={
                  !watchedWarehouse
                    ? (isAr ? 'يرجى تحديد المستودع أولاً...' : 'Please select a Warehouse first...')
                    : (isAr ? 'امسح باركود الصنف...' : "Scan item barcode...")
                }
                className="w-full"
                scannerMode={true}
                size="lg"
                disabled={!watchedWarehouse}
              />
            </div>
            <div className="space-y-2">
              <label className="text-label-xs font-semibold uppercase text-muted-foreground/40 ms-1 whitespace-nowrap block text-start">
                {isAr ? 'البحث عن صنف' : 'Search / Add Item'}
              </label>
              <SmartCombobox
                items={items || []}
                disabled={!watchedWarehouse}
                onSelect={(item) => {
                  const existingIndex = watchedLines?.findIndex(i => i?.itemId === item.id) ?? -1;
                  if (existingIndex !== -1) {
                    const currentQty = form.getValues(`lines.${existingIndex}.requestedQty`) || 0;
                    form.setValue(`lines.${existingIndex}.requestedQty`, currentQty + 1, { shouldDirty: true, shouldValidate: true });
                  } else {
                    append({ itemId: item.id, requestedQty: 1, qty: 0, lotAllocations: [] });
                  }
                }}
                placeholder={tc('select_item') || "Search and Select Item"}
                triggerClassName="bg-background border border-border shadow-sm h-[52px] px-4 rounded-xl text-label-xs font-semibold focus-visible:ring-operational-cyan/30 w-full"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5">
            {currentFields.length === 0 ? (
              <div className="py-24 text-center bg-card border border-border shadow-sm rounded-[3rem] border-2 border-dashed border-surface-container-high/50 animate-in fade-in duration-500">
                <div className="w-20 h-20 rounded-full bg-surface-container-high/30 flex items-center justify-center mx-auto mb-6 text-muted-foreground/60/20">
                  <ListFilter className="w-10 h-10" />
                </div>
                <p className="text-label-xs font-semibold text-muted-foreground/60/40 uppercase">{t('empty_manifest')}</p>
              </div>
            ) : (
              <DocumentLineItemTable
                lines={tableLines}
                extraColumns={extraColumns}
                onRemoveLine={(lineId) => {
                  const idx = tableLines.findIndex(l => l.id === lineId);
                  if (idx !== -1) remove(idx);
                }}
                renderQty={renderQty}
                renderUom={renderUom}
                hideLotColumns={true}
                hideUomColumn={true}
                noCollapse={false}
                dense={true}
                mobileLayoutPattern="issue-form"
                headers={{
                  code: tc('table_headers.code') || 'Code',
                  name: tc('table_headers.name') || 'Name',
                  qty: t('request_qty') || 'Requested Qty',
                  uom: tc('table_headers.uom') || 'UOM',
                }}
              />
            )}
          </div>
        </div>

        {/* Global Fulfillment Summary */}
        <div className="px-4 py-6 sm:p-10 bg-white dark:bg-card border-y border-x-0 sm:border border-gray-200 dark:border-gray-700 shadow-sm rounded-none sm:rounded-[3rem] flex flex-col md:flex-row items-center justify-between gap-6 md:gap-10 shadow-inner w-full">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 rounded-[1.75rem] bg-[#b48e67]/10 flex items-center justify-center border border-[#b48e67]/20 shadow-sm text-[#b48e67]">
              <PackageCheck className="w-8 h-8" />
            </div>
            <div>
              <div className="text-label-xs font-semibold uppercase text-muted-foreground/60/40 mb-1">{t('sync_commitment')}</div>
              <div className="text-title-lg font-bold text-foreground">
                {currentFields.filter(isLineFulfilled).length} / {currentFields.length} {t('protocol_validations')}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-2 bg-transparent border border-gray-300 text-gray-600 font-bold rounded-md hover:bg-gray-100 hover:text-[#0B1220] transition-colors uppercase text-sm tracking-wider"
            >
              CANCEL
            </button>
            <Button
              type="submit"
              disabled={createIssue.isPending || isWarehouseLocked || !allLinesAllocated || currentFields.length === 0}
              className="h-14 px-12 bg-[#b48e67] hover:bg-[#C5922F] text-[#0B1220] text-label-xs font-bold uppercase rounded-[1.5rem] transition-all shadow-[0_0_25px_rgba(180,142,103,0.3)] hover:shadow-[0_0_40px_rgba(180,142,103,0.5)] disabled:opacity-30 disabled:grayscale"
            >
              {createIssue.isPending ? t('finalizing_ledger') : t('authorize_protocol')}
            </Button>
          </div>
        </div>
      </form>

      {/* FEFO Allocator Overlay */}
      {activeLineIndex !== null && (
        <FEFOLotAllocator
          isOpen={allocatorOpen}
          onClose={() => setAllocatorOpen(false)}
          itemId={currentFields[activeLineIndex]?.itemId || ''}
          requestedQty={currentFields[activeLineIndex]?.requestedQty || 1}
          onAllocate={handleAllocate}
          lots={availableLots?.map(l => ({
            lotNumber: l.lotNumber,
            expiryDate: l.expiryDate ?? '',
            allocatedQty: 0,
            availableQty: l.qtyAvailable,
            isExpired: l.isExpired
          }))}
        />
      )}

      {/* Posting Confirmation Sequence */}
      <PostConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        onConfirm={() => {
          setConfirmOpen(false);
          form.handleSubmit(onSubmit, onFormError)();
        }}
        title={t('post_confirm_title')}
        description={t('post_confirm_desc')}
        confirmText={tc('confirm')}
        icon="info"
      />
    </Form>
  );
}
