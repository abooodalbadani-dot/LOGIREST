"use client";

import * as React from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations, useLocale } from "next-intl";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ArrowRightLeft, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

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
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from "@/components/ui/select";
import { useCreatePO } from "@/features/purchasing/hooks/useCreatePO";
import { useUpdatePO } from "@/features/purchasing/hooks/useUpdatePO";
import { PODetail } from "@/features/purchasing/hooks/usePO";
import { useSuppliers } from "@/features/purchasing/hooks/useSuppliers";
import { useCurrencies } from "@/features/purchasing/hooks/useCurrencies";
import { useWarehouses } from "@/features/warehouses/api/useWarehouses";
import { useFXRates } from "@/features/purchasing/hooks/useFXRates";
import { useAdminSettings } from "@/features/admin/hooks/useAdminSettings";
import { formatCurrency } from "@/utils/currency";


const lineItemSchema = z.object({
 item_id: z.string().min(1),
 quantity: z.number().positive(),
 unit_price: z.number().nonnegative(),
 uom_id: z.string().min(1),
 notes: z.string().optional(),
});

const formSchema = z.object({
 supplier_id: z.string().min(1),
 pr_id: z.string().optional(),
 currency_code: z.string().min(1),
 exchange_rate: z.number().min(0.0001),
 expected_date: z.string().min(1),
 target_warehouse_id: z.string().min(1),
 notes: z.string().optional(),
 lines: z.array(lineItemSchema).min(1),
});

type PurchaseOrderFormValues = z.infer<typeof formSchema>;

interface PurchaseOrderFormProps {
  initialData?: PODetail;
  mode?: "create" | "edit";
  onConflict?: () => void;
}

export function PurchaseOrderForm({ initialData, mode = "create", onConflict }: PurchaseOrderFormProps) {
 const router = useRouter();
 const locale = useLocale();
 const t = useTranslations("procurement.po");
 const tc = useTranslations("common");
 
 const createMutation = useCreatePO();
 const updateMutation = useUpdatePO(initialData?.id || "", { onConflict });

 const form = useForm<PurchaseOrderFormValues>({
 resolver: zodResolver(formSchema),
 defaultValues: {
 supplier_id: initialData?.supplier_id || "",
 pr_id: initialData?.pr_id || "",
 currency_code: initialData?.currency_code || "",
 exchange_rate: initialData?.exchange_rate || 1,
 expected_date: initialData?.expected_date || "",
 target_warehouse_id: initialData?.target_warehouse_id || "",
 notes: initialData?.notes || "",
 lines: initialData?.lines.map(l => ({
 item_id: l.item?.id || "",
 quantity: l.quantity,
 unit_price: l.unit_price,
 uom_id: l.uom_id,
 notes: l.notes || ""
 })) || [{ item_id: "", quantity: 1, unit_price: 0, uom_id: "PCS", notes: "" }]
 },
 });

 const { fields, append, remove } = useFieldArray({
 control: form.control,
 name: "lines",
 });

 const lines = useWatch({
 control: form.control,
 name: "lines",
 });
 const currency = useWatch({
 control: form.control,
 name: "currency_code",
 });
 const rate = useWatch({
 control: form.control,
 name: "exchange_rate",
 });

 const supplierTotalAmount = lines.reduce((sum, line) => sum + ((line.quantity || 0) * (line.unit_price || 0)), 0);
 const baseTotalAmount = supplierTotalAmount * (rate || 1);

 async function onSubmit(values: PurchaseOrderFormValues) {
 try {
 if (mode === "edit" && initialData) {
   await updateMutation.mutateAsync({ 
    payload: { ...values, version: initialData.version || 1 } 
  });
 toast.success(t("edit_success"));
 } else {
  if (!currencies || currencies.length === 0) {
    toast.error(t('errors.no_currencies_available'));
    return;
  }
     const result = await createMutation.mutateAsync({ payload: values });
 toast.success(t("submit_success"));
  router.push(`/purchase-orders/${result.id}`);
 }
 } catch (error) {
 console.error(error);
 toast.error(tc("error_occurred"));
 }
 }

 const isSubmitting = createMutation.isPending || updateMutation.isPending;

 const { data: suppliers, isLoading: loadingSuppliers } = useSuppliers();
 const { data: currencies, isLoading: loadingCurrencies } = useCurrencies();
 const { data: warehouses, isLoading: loadingWarehouses } = useWarehouses();

 const { data: settings, isLoading: loadingSettings } = useAdminSettings();
 const baseCurrency = settings?.base_currency;
 const { data: fxRates } = useFXRates(currency, baseCurrency);
 
 React.useEffect(() => {
 if (fxRates?.[0]?.rate && !initialData) {
 form.setValue("exchange_rate", fxRates[0].rate);
 }
 }, [fxRates, form, initialData]);

 if (loadingSuppliers || loadingCurrencies || loadingWarehouses || loadingSettings) {
 return (
 <div className="space-y-6 animate-pulse">
 <div className="h-64 bg-surface-container-low rounded-3xl" />
 <div className="h-96 bg-surface-container-low rounded-3xl" />
 </div>
 );
 }

 return (
 <Form {...form}>
 <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 w-full bg-surface-container-lowest p-8 rounded-[2rem] relative shadow-2xl shadow-black/5">
 <div className="flex items-center justify-between border-b border-surface-container-high/50 pb-6 mb-6">
 <h3 className="text-title-lg font-semibold text-operational-cyan uppercase">{mode === "edit" ? t('specification') : t('new_intent')}</h3>
 <div className="flex gap-2">
 <span className="px-3 py-1 bg-operational-cyan/5 text-operational-cyan rounded-full text-label-xs font-semibold uppercase">{/* i18n-ignore */}PO_ENGINE_V2</span>
 </div>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
 <FormField
 control={form.control}
 name="supplier_id"
 render={({ field }) => (
 <FormItem>
 <FormLabel className="text-muted-foreground/40 text-label-xs uppercase font-semibold">{t('supplier')}</FormLabel>
 <Select onValueChange={field.onChange} value={field.value}>
 <FormControl>
 <SelectTrigger className="bg-surface-container-low border-none h-11 rounded-xl focus:ring-1 focus:ring-operational-cyan/30">
 <SelectValue placeholder={t('select_supplier')} />
 </SelectTrigger>
 </FormControl>
 <SelectContent className="bg-surface-container-low border-none rounded-xl">
 {suppliers?.map(s => (
 <SelectItem key={s.id} value={s.id}>
 {s.name_en} ({s.code})
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 <FormMessage />
 </FormItem>
 )}
 />

 <FormField
 control={form.control}
 name="pr_id"
 render={({ field }) => (
 <FormItem>
 <FormLabel className="text-muted-foreground/40 text-label-xs uppercase font-semibold">{t('linked_pr')}</FormLabel>
 <FormControl>
 <Input placeholder={t('linked_pr_placeholder')} className="bg-surface-container-low uppercase font-mono border-none h-11 rounded-xl focus-visible:ring-operational-cyan/30" {...field} />
 </FormControl>
 <FormMessage />
 </FormItem>
 )}
 />

 <FormField
 control={form.control}
 name="expected_date"
 render={({ field }) => (
 <FormItem>
 <FormLabel className="text-muted-foreground/40 text-label-xs uppercase font-semibold">{t('expected_date')}</FormLabel>
 <FormControl>
 <Input type="date" className="bg-surface-container-low border-none h-11 rounded-xl focus-visible:ring-operational-cyan/30" {...field} />
 </FormControl>
 <FormMessage />
 </FormItem>
 )}
 />

 <FormField
 control={form.control}
 name="target_warehouse_id"
 render={({ field }) => (
 <FormItem>
 <FormLabel className="text-muted-foreground/40 text-label-xs uppercase font-semibold">{t('target_warehouse')}</FormLabel>
 <Select onValueChange={field.onChange} value={field.value}>
 <FormControl>
 <SelectTrigger className="bg-surface-container-low border-none h-11 rounded-xl focus:ring-1 focus:ring-operational-cyan/30">
 <SelectValue placeholder={t('select_warehouse')} />
 </SelectTrigger>
 </FormControl>
 <SelectContent className="bg-surface-container-low border-none rounded-xl">
 {warehouses?.map(w => (
 <SelectItem key={w.id} value={w.id}>
 {w.name_en}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 <FormMessage />
 </FormItem>
 )}
 />
 </div>

 <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-surface-container-high/50">
 <FormField
 control={form.control}
 name="currency_code"
 render={({ field }) => (
 <FormItem>
 <FormLabel className="text-muted-foreground/40 text-label-xs uppercase font-semibold">{t('supplier_currency')}</FormLabel>
 <Select onValueChange={field.onChange} value={field.value}>
 <FormControl>
 <SelectTrigger className="bg-surface-container-low border-none font-mono h-11 rounded-xl focus:ring-1 focus:ring-operational-cyan/30">
 <SelectValue placeholder={t('currency_placeholder')} />
 </SelectTrigger>
 </FormControl>
 <SelectContent className="bg-surface-container-low border-none rounded-xl">
 {currencies?.map(c => (
 <SelectItem key={c.id} value={c.code}>
 {c.code} — {c[(`name_${locale}` as keyof typeof c)]}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 <FormMessage />
 </FormItem>
 )}
 />
 <FormField
 control={form.control}
 name="exchange_rate"
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
 <Input placeholder={t('notes_placeholder')} className="bg-surface-container-low border-none h-11 rounded-xl focus-visible:ring-operational-cyan/30" {...field} />
 </FormControl>
 <FormMessage />
 </FormItem>
 )}
 />
 </div>

 <div className="pt-10">
 <div className="flex justify-between items-center mb-6">
 <h3 className="text-title-lg font-semibold uppercase flex items-center gap-3">
 <span className="w-2 h-2 bg-operational-cyan rounded-full" />
 {t('line_items')}
 </h3>
 <Button 
 type="button" 
 variant="outline" 
 size="sm" 
 className="border-none bg-surface-container-low text-operational-cyan hover:bg-operational-cyan/10 transition-all rounded-xl font-semibold uppercase text-label-xs h-9"
 onClick={() => append({ item_id: "", quantity: 1, unit_price: 0, uom_id: "PCS", notes: "" })}
 >
 <Plus className="h-3.5 w-3.5 me-2" />
 {t('add_item')}
 </Button>
 </div>

 <div className="space-y-3">
 {fields.map((field, index) => (
 <div key={field.id} className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1fr_2fr_auto] gap-4 items-end bg-surface-container-low/30 p-5 rounded-2xl border-none transition-all hover:bg-surface-container-high/40 group">
 <FormField
 control={form.control}
 name={`lines.${index}.item_id`}
 render={({ field: inputField }) => (
 <FormItem>
 <FormLabel className="text-label-xs uppercase font-semibold text-muted-foreground/30">{t('item_sku')}</FormLabel>
 <FormControl>
 <Input placeholder={t('item_sku_placeholder')} className="bg-surface-container-low font-mono uppercase border-none h-10 rounded-lg focus-visible:ring-operational-cyan/30" {...inputField} />
 </FormControl>
 <FormMessage />
 </FormItem>
 )}
 />

 <FormField
 control={form.control}
 name={`lines.${index}.quantity`}
 render={({ field: inputField }) => (
 <FormItem>
 <FormLabel className="text-label-xs uppercase font-semibold text-muted-foreground/30">{t('quantity')}</FormLabel>
 <FormControl>
 <Input 
 type="number" 
 min="1" 
 className="bg-surface-container-low font-mono border-none h-10 rounded-lg focus-visible:ring-operational-cyan/30" 
 dir="ltr" 
 {...inputField} 
 onChange={(e) => inputField.onChange(e.target.valueAsNumber)}
 />
 </FormControl>
 <FormMessage />
 </FormItem>
 )}
 />

 <FormField
 control={form.control}
 name={`lines.${index}.uom_id`}
 render={({ field: inputField }) => (
 <FormItem>
 <FormLabel className="text-label-xs uppercase font-semibold text-muted-foreground/30">{tc('uom')}</FormLabel>
 <FormControl>
 <Input placeholder={t('pcs_placeholder')} className="bg-surface-container-low font-mono uppercase border-none h-10 rounded-lg focus-visible:ring-operational-cyan/30" {...inputField} />
 </FormControl>
 <FormMessage />
 </FormItem>
 )}
 />

 <FormField
 control={form.control}
 name={`lines.${index}.unit_price`}
 render={({ field: inputField }) => (
 <FormItem>
 <FormLabel className="text-label-xs uppercase font-semibold text-muted-foreground/30">{t('unit_price')} ({currency})</FormLabel>
 <FormControl>
 <Input 
 type="number" 
 step="0.01" 
 min="0" 
 className="bg-surface-container-low font-mono border-none h-10 rounded-lg focus-visible:ring-operational-cyan/30" 
 dir="ltr" 
 {...inputField} 
 onChange={(e) => inputField.onChange(e.target.valueAsNumber)}
 />
 </FormControl>
 <FormMessage />
 </FormItem>
 )}
 />

 <FormField
 control={form.control}
 name={`lines.${index}.notes`}
 render={({ field: inputField }) => (
 <FormItem>
 <FormLabel className="text-label-xs uppercase font-semibold text-muted-foreground/30">{t('line_notes')}</FormLabel>
 <FormControl>
 <Input placeholder={t('notes_placeholder')} className="bg-surface-container-low border-none h-10 rounded-lg focus-visible:ring-operational-cyan/30" {...inputField} />
 </FormControl>
 <FormMessage />
 </FormItem>
 )}
 />

 <Button 
 type="button" 
 variant="ghost" 
 size="icon" 
 className="mb-[2px] text-muted-foreground/50 hover:text-status-error hover:bg-status-error/10 h-10 w-10 transition-colors rounded-lg"
 onClick={() => remove(index)}
 disabled={fields.length === 1}
 >
 <Trash2 className="h-4 w-4" />
 </Button>
 </div>
 ))}
 </div>
 
 <div className="mt-10 flex flex-col md:flex-row justify-end gap-6">
 <div className="bg-surface-container-high/20 px-8 py-5 rounded-2xl border-none flex items-center justify-between gap-10 min-w-[300px]">
 <span className="text-label-xs uppercase font-semibold text-muted-foreground/40">{t('supplier_total')}</span>
 <span className="text-title-lg font-mono font-semibold text-foreground" dir="ltr">
 {formatCurrency(supplierTotalAmount, currency, locale as 'ar' | 'en')}
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

 <div className="flex items-center justify-end gap-3 pt-12 mt-12 border-t border-surface-container-high/50">
 <Button
 variant="ghost"
 type="button"
 onClick={() => router.back()}
 disabled={isSubmitting}
 className="text-muted-foreground/60 hover:text-foreground hover:bg-surface-container-high/50 px-8 h-12 rounded-xl font-semibold uppercase text-label-xs transition-all"
 >
 {tc('cancel')}
 </Button>
 <Button
 type="submit"
 disabled={isSubmitting || !baseCurrency}
 className="bg-operational-cyan text-primary-foreground hover:brightness-110 px-10 h-12 rounded-xl transition-all hover:scale-[0.98] active:scale-95 font-semibold uppercase text-label-xs"
 >
 {isSubmitting ? t('actions.submitting') : (mode === "edit" ? tc('save') : t('actions.submit'))}
 </Button>
 </div>

 </form>
 </Form>
 );
}
