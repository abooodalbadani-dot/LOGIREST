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
import { useCreateIssue } from "@/features/operations/api/useIssues";
import { IssueLot } from "@/features/operations/types";
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useWarehouses } from "@/features/warehouses/api/useWarehouses";
import { useDepartments } from "@/features/departments/hooks/useDepartments";
import { useItems } from "@/features/items/api/useItems";
import { type Item } from "@/features/items/types";
import { SmartCombobox } from "@/components/shared/SmartCombobox";
import { DocumentLineItemTable, type LineItem, type ExtraColumn } from "@/components/shared/DocumentLineItemTable/DocumentLineItemTable";
import { cn } from "@/lib/utils";
import { useAudioFeedback } from '@/hooks/useAudioFeedback';

const buildLineSchema = (t: (k: string) => string) => z.object({
  item_id: z.string().min(1, t('validation.item_required')),
  requested_qty: z.number().min(0.01, t('validation.qty_positive')),
  qty: z.number(),
  lot_allocations: z.array(z.custom<IssueLot>()),
  notes: z.string().optional(),
});

const buildFormSchema = (t: (k: string) => string) => z.object({
  warehouse_id: z.string().min(1, t('validation.warehouse_required')),
  destination_dept_id: z.string().min(1, t('validation.department_required')),
  lines: z.array(buildLineSchema(t)).min(1, t('validation.items_required')),
  notes: z.string().optional(),
});

type IssueFormValues = z.infer<ReturnType<typeof buildFormSchema>>;

interface CustomLineItem extends LineItem {
  qtyAllocated: number;
  index: number;
  selectedItem?: Item;
}

// Simulated locked warehouse IDs for demo
const LOCKED_WAREHOUSES = new Set(["wh-locked-01", "wh-3"]);

export function IssueForm() {
  const t = useTranslations("operations.issue");
  const tc = useTranslations("common");
  const locale = useLocale();
  const { router, registerDirty } = useUnsavedChangesGuard();
  const createIssue = useCreateIssue();
  const { playSound } = useAudioFeedback();

  const { data: warehouses } = useWarehouses();
  const { data: deptData } = useDepartments();
  const departments = deptData?.data || [];
  const { data: items } = useItems();

 const [allocatorOpen, setAllocatorOpen] = useState(false);
 const [activeLineIndex, setActiveLineIndex] = useState<number | null>(null);
 const [confirmOpen, setConfirmOpen] = useState(false);

 const formSchema = buildFormSchema((k) => t(k as Parameters<typeof t>[0]));

 const form = useForm<IssueFormValues>({
  resolver: zodResolver(formSchema),
  defaultValues: {
    warehouse_id: "",
    destination_dept_id: "",
    lines: [],
    notes: "",
  },
 });

 // Register dirty state
 useEffect(() => {
   registerDirty(form.formState.isDirty);
 }, [form.formState.isDirty, registerDirty]);

 const { fields, append, remove, update } = useFieldArray({
  control: form.control,
  name: "lines",
 });

 const watchedLines = useWatch({
  control: form.control,
  name: "lines",
 });

  const tableLines = React.useMemo<CustomLineItem[]>(() => {
    return fields.map((field, index) => {
      const lineVal = watchedLines?.[index];
      const selectedItem = items?.find(i => i.id === lineVal?.item_id);
      return {
        id: field.id,
        item: {
          id: lineVal?.item_id || '',
          code: selectedItem?.barcode || selectedItem?.code || '',
          name_ar: selectedItem?.name_ar || '',
          name_en: selectedItem?.name_en || '',
          primary_uom: {
            code: selectedItem?.primary_uom?.code || '',
          }
        },
        qty: lineVal?.requested_qty ?? 1,
        uom_id: selectedItem?.primary_uom?.id || '',
        lot_allocations: (lineVal?.lot_allocations || []).map(lot => ({
          lot_id: lot.lot_number,
          lot_number: lot.lot_number,
          expiry_date: lot.expiry_date,
          allocated_qty: lot.allocated_qty,
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
        const isAllocated = (line.qtyAllocated ?? 0) >= (line.qty ?? 0);
        return (
          <div className="flex justify-center">
            <div className={cn(
              "h-10 px-4 rounded-xl flex items-center justify-between gap-3 transition-all duration-300 font-mono text-label-xs font-bold",
              isAllocated 
                ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" 
                : "bg-surface-container-high/30 text-muted-foreground/60 border border-transparent"
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
        const isAllocated = (line.qtyAllocated ?? 0) >= (line.qty ?? 0);
        const hasSelection = !!line.item.id;
        return (
          <div className="flex justify-center">
            <Button
              type="button"
              variant={isAllocated ? "outline" : "default"}
              disabled={!hasSelection}
              className={cn(
                "h-10 px-4 rounded-xl text-label-xs font-semibold uppercase transition-all duration-300",
                isAllocated 
                  ? "border-emerald-500/30 text-emerald-500 bg-emerald-500/5 hover:bg-emerald-500 hover:text-white" 
                  : "bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-500/10"
              )}
              onClick={() => handleOpenAllocator(line.index)}
            >
              {isAllocated ? t('redefine_batches') : t('sync_fefo')}
              <ChevronRight className="ms-2 w-3.5 h-3.5" />
            </Button>
          </div>
        );
      }
    }
  ], [t, tc]);

  const renderQty = React.useCallback((line: CustomLineItem) => (
    <div className="flex flex-col items-center gap-1">
      <div className="flex justify-center">
        <Input 
          type="number"
          step="0.01"
          dir="ltr"
          {...form.register(`lines.${line.index}.requested_qty`, { valueAsNumber: true })}
          className="w-24 bg-surface-container-highest/60 border border-white/5 rounded-lg text-center py-1.5 font-mono text-body-md font-semibold focus:ring-2 focus:ring-cyan-500/30 outline-none transition-all hover:bg-surface-container-highest/80 disabled:opacity-50"
        />
      </div>
      {form.formState.errors.lines?.[line.index]?.requested_qty && (
        <p className="text-label-xxs font-bold text-red-500 uppercase text-center mt-1">
          {t('validation.qty_positive')}
        </p>
      )}
    </div>
  ), [form, t]);

  const renderUom = React.useCallback((line: CustomLineItem) => (
    <span className="text-label-xs font-semibold text-muted-foreground/40 uppercase">
      {line.selectedItem?.primary_uom?.code || '---'}
    </span>
  ), []);

 const watchedWarehouse = useWatch({
  control: form.control,
  name: "warehouse_id",
 });
 const isWarehouseLocked = LOCKED_WAREHOUSES.has(watchedWarehouse);

 const handleOpenAllocator = (index: number) => {
 setActiveLineIndex(index);
 setAllocatorOpen(true);
 };

 const handleAllocate = (lot_allocations: IssueLot[]) => {
  if (activeLineIndex === null) return;
  const line = fields[activeLineIndex];
  const allocated = lot_allocations.reduce((s, l) => s + l.allocated_qty, 0);
  update(activeLineIndex, {
    ...line,
    qty: allocated,
    lot_allocations,
  });
 };

 const allLinesAllocated = fields.length > 0 && fields.every(
  (f) => (f.qty ?? 0) >= (f.requested_qty ?? 0)
 );

 const onSubmit = (data: IssueFormValues) => {
 if (!allLinesAllocated) return;
  createIssue.mutate(data, {
  onSuccess: (issue) => {
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
 <form onSubmit={form.handleSubmit(() => setConfirmOpen(true))} className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-24">
 
 {/* Fulfillment Orchestration Header */}
 <div className="bg-surface-container-low p-10 rounded-[2.5rem] border border-surface-container-high/20 shadow-2xl shadow-primary/5">
 <div className="flex items-center gap-6 mb-10 border-b border-surface-container-high/50 pb-8">
 <div className="p-4 rounded-[1.5rem] bg-cyan-600/10 text-cyan-500 border border-cyan-500/20 shadow-[0_0_20px_rgba(8,145,178,0.1)]">
 <Settings2 className="w-8 h-8" />
 </div>
 <div>
 <h2 className="text-headline-lg font-semibold text-foreground">{t('title')}</h2>
 <p className="text-label-xs font-semibold text-muted-foreground/60/40 uppercase mt-1 italic">{t('new_description')}</p>
 </div>
 <div className="ms-auto flex items-center gap-2">
 <Badge className="bg-surface-container-high text-muted-foreground/60 border-none font-semibold text-label-xxs uppercase px-4 h-9 rounded-xl">{tc('warehouses.main')}</Badge>
 </div>
 </div>

 {isWarehouseLocked && (
 <div className="mb-10 animate-in zoom-in-95 duration-300">
 <LockBanner message={t('warehouse_locked')} />
 </div>
 )}

 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-10">
  <FormField<IssueFormValues, "warehouse_id">
  control={form.control}
  name="warehouse_id"
  render={({ field }) => (
  <FormItem>
  <FormLabel className="text-label-xs font-semibold uppercase text-muted-foreground/60/40 mb-3 flex items-center gap-2">
  <Warehouse className="w-3.5 h-3.5" />
  {tc('warehouse')}
  </FormLabel>
  <FormControl>
  <SmartCombobox
  items={warehouses || []}
  value={field.value}
  onSelect={(item) => field.onChange(item.id)}
  placeholder={tc('warehouse') || "Select Warehouse"}
  triggerClassName="bg-surface-container-high/30 border-none h-14 px-6 text-label-xs font-bold rounded-2xl shadow-inner shadow-black/5 focus:ring-2 focus:ring-cyan-500/20 w-full"
  />
  </FormControl>
  <FormMessage className="text-label-xxs font-semibold uppercase" />
  </FormItem>
  )}
  />

  <FormField<IssueFormValues, "destination_dept_id">
  control={form.control}
  name="destination_dept_id"
  render={({ field }) => (
  <FormItem>
  <FormLabel className="text-label-xs font-semibold uppercase text-muted-foreground/60/40 mb-3 flex items-center gap-2">
  <Building2 className="w-3.5 h-3.5" />
  {t('destination')}
  </FormLabel>
  <FormControl>
  <SmartCombobox
  items={departments}
  value={field.value}
  onSelect={(item) => field.onChange(item.id)}
  placeholder={t('select_department')}
  triggerClassName="bg-surface-container-high/30 border-none h-14 px-6 text-label-xs font-bold rounded-2xl shadow-inner shadow-black/5 focus:ring-2 focus:ring-cyan-500/20 w-full"
  />
  </FormControl>
  <FormMessage className="text-label-xxs font-semibold uppercase" />
  </FormItem>
  )}
  />

 <FormField<IssueFormValues, "notes">
 control={form.control}
 name="notes"
 render={({ field }) => (
 <FormItem className="lg:col-span-3">
 <FormLabel className="text-label-xs font-semibold uppercase text-muted-foreground/60/40 mb-3 flex items-center gap-2">
 <FileText className="w-3.5 h-3.5" />
 {t('operational_notes')}
 </FormLabel>
 <FormControl>
 <Input placeholder={t('notes_placeholder')} className="bg-surface-container-high/30 border-none h-14 px-6 text-label-xs font-bold rounded-2xl shadow-inner shadow-black/5 focus:ring-2 focus:ring-cyan-500/20" {...field} />
 </FormControl>
 <FormMessage />
 </FormItem>
 )}
 />
 </div>
 </div>

 {/* Fulfillment Manifest Section */}
 <div className="space-y-8">
 <div className="flex items-center justify-between px-6">
 <div className="flex items-center gap-5">
 <div className="p-3.5 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
 <Calculator className="w-5 h-5" />
 </div>
 <div>
 <h3 className="text-body-md font-semibold uppercase text-muted-foreground/60/70">{t('ledger_title')}</h3>
 <p className="text-label-xxs font-semibold text-muted-foreground/60/20 uppercase mt-1">{t('ledger_subtitle')}</p>
 </div>
 </div>
  </div>

  <div className="mb-8 w-full max-w-xl mx-auto space-y-2">
    <label className="text-label-xs font-semibold uppercase text-muted-foreground/40 ms-1 block text-center whitespace-nowrap">
      {tc('select_item') || "Search Item"}
    </label>
    <SmartCombobox
      items={items || []}
      onSelect={(item) => {
        const existingIndex = watchedLines?.findIndex(i => i?.item_id === item.id) ?? -1;
        if (existingIndex !== -1) {
          const currentQty = form.getValues(`lines.${existingIndex}.requested_qty`) || 0;
          form.setValue(`lines.${existingIndex}.requested_qty`, currentQty + 1, { shouldDirty: true, shouldValidate: true });
        } else {
          append({ item_id: item.id, requested_qty: 1, qty: 0, lot_allocations: [] });
        }
      }}
      placeholder={tc('select_item') || "Search and Select Item"}
    />
  </div>

  <div className="grid grid-cols-1 gap-5">
  {fields.length === 0 ? (
  <div className="py-24 text-center bg-surface-container-low rounded-[3rem] border-2 border-dashed border-surface-container-high/50 animate-in fade-in duration-500">
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
 <div className="p-6 md:p-10 bg-surface-container-low rounded-[3rem] border border-surface-container-high/20 shadow-inner flex flex-col md:flex-row items-center justify-between gap-6 md:gap-10">
 <div className="flex items-center gap-6">
 <div className="w-16 h-16 rounded-[1.75rem] bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20 shadow-lg shadow-cyan-500/5">
 <PackageCheck className="w-8 h-8 text-cyan-500" />
 </div>
  <div>
  <div className="text-label-xs font-semibold uppercase text-muted-foreground/60/40 mb-1">{t('sync_commitment')}</div>
  <div className="text-title-lg font-bold text-foreground">
  {fields.filter(f => (f.qty ?? 0) >= (f.requested_qty ?? 0)).length} / {fields.length} {t('protocol_validations')}
  </div>
  </div>
 </div>
 
 <div className="flex items-center gap-6">
 <Button 
 type="button" 
 variant="ghost" 
 onClick={() => router.back()} 
 className="text-label-xs font-semibold uppercase text-muted-foreground/60/40 hover:text-foreground h-14 px-10 rounded-2xl"
 >
 {t('discard_sequence')}
 </Button>
 <Button
 type="submit"
 disabled={createIssue.isPending || isWarehouseLocked || !allLinesAllocated || fields.length === 0}
 className="h-14 px-12 bg-cyan-600 hover:bg-cyan-500 text-white text-label-xs font-semibold uppercase rounded-[1.5rem] transition-all shadow-[0_0_25px_rgba(6,182,212,0.3)] hover:shadow-[0_0_40px_rgba(6,182,212,0.5)] disabled:opacity-30 disabled:grayscale"
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
  itemId={fields[activeLineIndex].item_id}
  requestedQty={fields[activeLineIndex].requested_qty || 1}
  onAllocate={handleAllocate}
  />
  )}

 {/* Posting Confirmation Sequence */}
 <PostConfirmDialog
 open={confirmOpen}
 onOpenChange={setConfirmOpen}
 onConfirm={() => {
 setConfirmOpen(false);
 form.handleSubmit(onSubmit)();
 }}
 title={t('post_confirm_title')}
 description={t('post_confirm_desc')}
 confirmText={tc('confirm')}
 icon="info"
 />
 </Form>
 );
}
