"use client";

import * as React from "react";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useUnsavedChangesGuard } from "@/lib/unsaved-changes/useUnsavedChangesGuard";
import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const buildLineSchema = (t: (k: string) => string) => z.object({
 itemId: z.string().min(1, t('validation.item_required')),
 requestedQuantity: z.number().min(0.01, t('validation.qty_positive')),
 allocatedQuantity: z.number(),
 lots: z.array(z.custom<IssueLot>()),
 notes: z.string().optional(),
});

const buildFormSchema = (t: (k: string) => string) => z.object({
 warehouseId: z.string().min(1, t('validation.warehouse_required')),
 departmentId: z.string().min(1, t('validation.department_required')),
 items: z.array(buildLineSchema(t)).min(1, t('validation.items_required')),
 notes: z.string().optional(),
});

type IssueFormValues = z.infer<ReturnType<typeof buildFormSchema>>;

// Simulated locked warehouse IDs for demo
const LOCKED_WAREHOUSES = new Set(["wh-locked-01"]);

export function IssueForm() {
  const t = useTranslations("operations.issue");
  const tc = useTranslations("common");
  const { router, registerDirty } = useUnsavedChangesGuard();
  const createIssue = useCreateIssue();

 const [allocatorOpen, setAllocatorOpen] = useState(false);
 const [activeLineIndex, setActiveLineIndex] = useState<number | null>(null);
 const [confirmOpen, setConfirmOpen] = useState(false);

 const formSchema = buildFormSchema((k) => t(k as Parameters<typeof t>[0]));

 const form = useForm<IssueFormValues>({
 resolver: zodResolver(formSchema),
 defaultValues: {
 warehouseId: "",
 departmentId: "",
 items: [],
 notes: "",
 },
 });

 // Register dirty state
 useEffect(() => {
   registerDirty(form.formState.isDirty);
 }, [form.formState.isDirty, registerDirty]);

 const { fields, append, remove, update } = useFieldArray({
 control: form.control,
 name: "items",
 });

 const watchedWarehouse = useWatch({
 control: form.control,
 name: "warehouseId",
 });
 const isWarehouseLocked = LOCKED_WAREHOUSES.has(watchedWarehouse);

 const handleOpenAllocator = (index: number) => {
 setActiveLineIndex(index);
 setAllocatorOpen(true);
 };

 const handleAllocate = (lots: IssueLot[]) => {
 if (activeLineIndex === null) return;
 const line = fields[activeLineIndex];
 const allocated = lots.reduce((s, l) => s + l.allocatedQuantity, 0);
 update(activeLineIndex, {
 ...line,
 allocatedQuantity: allocated,
 lots,
 });
 };

 const allLinesAllocated = fields.length > 0 && fields.every(
 (f) => (f.allocatedQuantity ?? 0) >= (f.requestedQuantity ?? 0)
 );

 const onSubmit = (data: IssueFormValues) => {
 if (!allLinesAllocated) return;
 createIssue.mutate(data, {
 onSuccess: (issue) => {
  router.push(`/issues/${issue.id}`, { skipGuard: true });
 },
 onError: () => console.error("Failed to create issue"),
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
 <FormField<IssueFormValues, "warehouseId">
 control={form.control}
 name="warehouseId"
 render={({ field }) => (
 <FormItem>
 <FormLabel className="text-label-xs font-semibold uppercase text-muted-foreground/60/40 mb-3 flex items-center gap-2">
 <Warehouse className="w-3.5 h-3.5" />
 {tc('warehouse')}
 </FormLabel>
 <Select onValueChange={field.onChange} defaultValue={field.value}>
 <FormControl>
 <SelectTrigger className="bg-surface-container-high/30 border-none h-14 px-6 text-label-xs font-bold rounded-2xl shadow-inner shadow-black/5 focus:ring-2 focus:ring-cyan-500/20">
 <SelectValue placeholder={t('select_department')} />
 </SelectTrigger>
 </FormControl>
 <SelectContent className="bg-surface-container-highest border border-surface-container-high/50 shadow-2xl rounded-2xl overflow-hidden">
 <SelectItem value="wh-01" className="text-label-xs font-bold">{tc('warehouses.main_hub')}</SelectItem>
 <SelectItem value="wh-locked-01" className="text-label-xs font-bold">{tc('warehouses.cold_storage_locked')}</SelectItem>
 </SelectContent>
 </Select>
 <FormMessage className="text-label-xxs font-semibold uppercase" />
 </FormItem>
 )}
 />

 <FormField<IssueFormValues, "departmentId">
 control={form.control}
 name="departmentId"
 render={({ field }) => (
 <FormItem>
 <FormLabel className="text-label-xs font-semibold uppercase text-muted-foreground/60/40 mb-3 flex items-center gap-2">
 <Building2 className="w-3.5 h-3.5" />
 {t('destination')}
 </FormLabel>
 <Select onValueChange={field.onChange} defaultValue={field.value}>
 <FormControl>
 <SelectTrigger className="bg-surface-container-high/30 border-none h-14 px-6 text-label-xs font-bold rounded-2xl shadow-inner shadow-black/5 focus:ring-2 focus:ring-cyan-500/20">
 <SelectValue placeholder={t('select_department')} />
 </SelectTrigger>
 </FormControl>
 <SelectContent className="bg-surface-container-highest border border-surface-container-high/50 shadow-2xl rounded-2xl overflow-hidden">
 <SelectItem value="dep-kitchen" className="text-label-xs font-bold">{tc('departments.culinary_lab')}</SelectItem>
 <SelectItem value="dep-pastry" className="text-label-xs font-bold">{tc('departments.pastry_desserts')}</SelectItem>
 </SelectContent>
 </Select>
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
 <Button 
 type="button" 
 variant="outline" 
 size="sm" 
 className="h-12 px-8 border-cyan-500/30 text-cyan-500 bg-cyan-500/5 hover:bg-cyan-500 hover:text-white rounded-[1.25rem] text-label-xs font-semibold uppercase transition-all shadow-lg shadow-cyan-500/5"
 onClick={() => append({ itemId: "", requestedQuantity: 1, allocatedQuantity: 0, lots: [] })}
 >
 <Plus className="h-4 w-4 me-2" />
 {t('enroll_component')}
 </Button>
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
 fields.map((field, index) => {
 const isAllocated = (field.allocatedQuantity ?? 0) >= (field.requestedQuantity ?? 0);
 const hasSelection = !!field.itemId;
 
 return (
 <div key={field.id} className={`grid grid-cols-1 lg:grid-cols-[1.5fr_1fr_1.5fr_1.5fr_auto] gap-4 md:gap-8 items-end p-5 md:p-8 rounded-[2.25rem] border transition-all duration-500 group ${isAllocated ? "bg-emerald-500/[0.03] border-emerald-500/20 shadow-lg shadow-emerald-500/5" : "bg-surface-container-low border-surface-container-high/20 hover:border-cyan-500/30 hover:bg-surface-container-medium shadow-xl shadow-black/5"}`}>
 
 <FormField<IssueFormValues, `items.${number}.itemId`>
 control={form.control}
 name={`items.${index}.itemId`}
 render={({ field: inputField }) => (
 <FormItem>
 <FormLabel className="text-label-xxs font-semibold uppercase text-muted-foreground/60/40 mb-3">{t('item_label')}</FormLabel>
 <FormControl>
 <Input placeholder={t('sku_placeholder')} className="bg-surface-container-high/30 border-none h-12 px-5 text-label-xs font-semibold font-mono rounded-xl shadow-inner shadow-black/5 transition-all group-hover:bg-surface-container-highest/20" {...inputField} />
 </FormControl>
 <FormMessage className="text-label-xxs font-semibold" />
 </FormItem>
 )}
 />

 <FormField<IssueFormValues, `items.${number}.requestedQuantity`>
 control={form.control}
 name={`items.${index}.requestedQuantity`}
 render={({ field: inputField }) => (
 <FormItem>
 <FormLabel className="text-label-xxs font-semibold uppercase text-muted-foreground/60/40 mb-3 text-center block w-full">{t('request_qty')}</FormLabel>
 <FormControl>
 <Input 
 type="number" 
 min="0.01" 
 step="0.01" 
 dir="ltr"
 className="bg-surface-container-high/30 border-none h-12 px-4 text-label-sm font-semibold text-center rounded-xl shadow-inner shadow-black/5"
 {...inputField} 
 onChange={(e) => inputField.onChange(e.target.valueAsNumber || 0)}
 />
 </FormControl>
 <FormMessage />
 </FormItem>
 )}
 />

 <div className="flex flex-col items-center gap-1.5 pb-1">
 <span className="text-label-xxs font-semibold uppercase text-muted-foreground/60/40">{t('fulfillment_status')}</span>
 <div className={`h-12 w-full rounded-xl flex items-center justify-between px-6 transition-all duration-500 ${isAllocated ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.1)]" : "bg-surface-container-high/30 border border-surface-container-high/50 text-muted-foreground/60/20"}`}>
 <span className="text-label-sm font-semibold tabular-nums">{field.allocatedQuantity || 0}</span>
 {isAllocated ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4 opacity-30" />}
 </div>
 </div>

 <div className="pb-1">
 <Button
 type="button"
 variant={isAllocated ? "outline" : "default"} disabled={!hasSelection}
 className={`w-full h-12 rounded-xl text-label-xs font-semibold uppercase transition-all duration-300 ${isAllocated ? "border-emerald-500/30 text-emerald-500 bg-emerald-500/5 hover:bg-emerald-500 hover:text-white" : "bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-500/10"}`}
 onClick={() => handleOpenAllocator(index)}
 >
 {isAllocated ? t('redefine_batches') : t('sync_fefo')}
 <ChevronRight className="ms-2 w-3.5 h-3.5" />
 </Button>
 </div>

 <div className="pb-2">
 <Button 
 type="button" 
 variant="ghost" 
 size="icon" 
 className="w-10 h-10 rounded-xl text-muted-foreground/60/20 hover:text-red-500 hover:bg-red-500/10 transition-all border border-transparent hover:border-red-500/20" 
 onClick={() => remove(index)}
 >
 <Trash2 className="w-4 h-4" />
 </Button>
 </div>
 </div>
 );
 })
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
 {fields.filter(f => (f.allocatedQuantity ?? 0) >= (f.requestedQuantity ?? 0)).length} / {fields.length} {t('protocol_validations')}
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
 itemId={fields[activeLineIndex].itemId}
 requestedQty={fields[activeLineIndex].requestedQuantity || 1}
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
