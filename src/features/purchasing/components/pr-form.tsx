'use client';

import * as React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Trash2, Plus, Calendar, Package, Calculator, ArrowLeft, Send, Save, Building2 } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { toast } from 'sonner';

import {
 Form,
 FormControl,
 FormField,
 FormItem,
 FormLabel,
 FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PostConfirmDialog } from '@/components/shared/PostConfirmDialog';
import { useCreatePR } from '../hooks/useCreatePR';
import { useUpdatePR } from '../hooks/useUpdatePR';
import { useSubmitPR } from '../hooks/useSubmitPR';
import { PRDetail } from '../hooks/usePR';
import { useMasterDataList } from '@/features/master-data/hooks/useMasterDataCRUD';
import { ScanInput } from '@/components/shared/ScanInput/ScanInput';
import { Item, Warehouse, ItemSchema, WarehouseSchema } from '@/types/master-data';

const lineItemSchema = z.object({
 id: z.string().optional(), // For existing lines
 item_id: z.string().min(1),
 item_name: z.string().optional(),
 item_code: z.string().optional(),
 req_qty: z.number().min(0.01),
 uom_id: z.string().min(1),
});

const formSchema = z.object({
 department_id: z.string().min(1),
 expected_date: z.string().min(1),
 notes: z.string().optional(),
 lines: z.array(lineItemSchema).min(1),
});

type PurchaseRequestFormValues = z.infer<typeof formSchema>;

interface PurchaseRequestFormProps {
 initialData?: PRDetail;
}

export function PurchaseRequestForm({ initialData }: PurchaseRequestFormProps) {
 const t = useTranslations('procurement.pr');
 const tc = useTranslations('common');
 const locale = useLocale() as 'ar' | 'en';
 const router = useRouter();
 const [isSubmitting, setIsSubmitting] = React.useState(false);
 const [submitConfirmOpen, setSubmitConfirmOpen] = React.useState(false);
 const [pendingValues, setPendingValues] = React.useState<PurchaseRequestFormValues | null>(null);

 // Mocks/Hooks for data selection
 const { data: warehouses } = useMasterDataList('warehouses', WarehouseSchema);
 const { data: itemsData } = useMasterDataList('items', ItemSchema);

 const createPR = useCreatePR();
 const updatePR = useUpdatePR();
 const submitPR = useSubmitPR();

 const form = useForm<PurchaseRequestFormValues>({
 resolver: zodResolver(formSchema),
 defaultValues: initialData ? {
 department_id: initialData.department_id,
 expected_date: initialData.expected_date.split('T')[0],
 notes: initialData.notes || '',
 lines: initialData.lines.map(l => ({
 id: l.id,
 item_id: l.item.id,
 item_name: locale === 'ar' ? l.item.name_ar : l.item.name_en,
 item_code: l.item.code,
 req_qty: l.req_qty,
 uom_id: l.uom_id,
 })),
 } : {
 department_id: '',
 expected_date: '',
 notes: '',
 lines: [],
 },
 });

 const { fields, append, remove } = useFieldArray({
 control: form.control,
 name: 'lines',
 });

 const handleScan = (barcode: string) => {
 const item = itemsData?.data?.find((i: Item) => i.barcode === barcode || i.code === barcode);
 if (item) {
 append({
 item_id: item.id,
 item_name: locale === 'ar' ? item.name_ar : item.name_en,
 item_code: item.code,
 req_qty: 1,
 uom_id: item.primary_uom?.id || 'EA',
 });
 toast.success(tc('items') + ': ' + (locale === 'ar' ? item.name_ar : item.name_en));
 } else {
 toast.error(tc('not_found'));
 }
 };

 const onSave = async (values: PurchaseRequestFormValues, submitAfterSave = false) => {
 setIsSubmitting(true);
 try {
 let prId = initialData?.id;
 
 if (prId) {
 await updatePR.mutateAsync({ id: prId, payload: values });
 } else {
 const res = await createPR.mutateAsync(values);
 prId = res.id;
 }

 if (submitAfterSave && prId) {
 await submitPR.mutateAsync(prId);
 toast.success(t('submit_success'));
 } else {
 toast.success(tc('save') + ' ' + tc('completed'));
 }

 router.push(`/purchase-requests`);
 } catch (error) {
 console.error(error);
 toast.error(tc('error'));
 } finally {
 setIsSubmitting(false);
 setSubmitConfirmOpen(false);
 }
 };

 const handleSubmitClick = (values: PurchaseRequestFormValues) => {
 setPendingValues(values);
 setSubmitConfirmOpen(true);
 };

 return (
 <Form {...form}>
 <form onSubmit={form.handleSubmit((v) => onSave(v, false))} className="space-y-10 w-full bg-surface-container-lowest p-8 rounded-[2rem] relative pb-20">
 <div className="flex items-center justify-between">
 <h3 className="text-title-lg font-semibold text-operational-cyan uppercase">{t('detail_title')}</h3>
 {initialData?.document_number && (
 <span className="font-mono text-label-sm font-semibold text-muted-foreground/40">
 {initialData.document_number}
 </span>
 )}
 </div>
 
 {/* Step 1: Request Header */}
 <div className="bg-surface-container-low p-8 rounded-[2rem] relative">
 <div className="flex items-center gap-4 mb-8 pb-6 border-none">
 <div className="p-3 rounded-2xl bg-operational-cyan/10 text-operational-cyan">
 <Building2 className="w-5 h-5" />
 </div>
 <div>
 <h3 className="text-body-md font-semibold uppercase text-foreground">{t('new_intent')}</h3>
 <p className="text-label-xs font-bold text-muted-foreground/60 uppercase mt-0.5">{t('specification')}</p>
 </div>
 </div>
 
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
 <FormField<PurchaseRequestFormValues, 'department_id'>
 control={form.control}
 name="department_id"
 render={({ field }) => (
 <FormItem>
 <FormLabel className="text-label-xs font-semibold uppercase text-muted-foreground/40 mb-3 flex items-center gap-2 ps-1">
 <Package className="w-3 h-3" />
 {t('department')}
 </FormLabel>
 <Select onValueChange={field.onChange} defaultValue={field.value}>
 <FormControl>
 <SelectTrigger className="bg-surface-container-lowest border-none h-11 rounded-xl text-label-xs font-semibold uppercase focus:ring-1 focus:ring-operational-cyan/30">
 <SelectValue placeholder={tc('select_warehouse')} />
 </SelectTrigger>
 </FormControl>
 <SelectContent className="bg-surface-container-low border-none rounded-2xl">
 {warehouses?.data?.map((w: Warehouse) => (
 <SelectItem key={w.id} value={w.id} className="text-label-xs font-bold">
 {locale === 'ar' ? w.name_ar : w.name_en}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 <FormMessage className="text-label-xxs font-semibold uppercase" />
 </FormItem>
 )}
 />

 <FormField<PurchaseRequestFormValues, 'expected_date'>
 control={form.control}
 name="expected_date"
 render={({ field }) => (
 <FormItem>
 <FormLabel className="text-label-xs font-semibold uppercase text-muted-foreground/40 mb-3 flex items-center gap-2 ps-1">
 <Calendar className="w-3 h-3" />
 {t('expected_date')}
 </FormLabel>
 <FormControl>
 <Input type="date" className="bg-surface-container-lowest border-none h-11 rounded-xl font-semibold text-label-xs uppercase focus-visible:ring-operational-cyan/30" {...field} />
 </FormControl>
 <FormMessage className="text-label-xxs font-semibold uppercase" />
 </FormItem>
 )}
 />

 <FormField<PurchaseRequestFormValues, 'notes'>
 control={form.control}
 name="notes"
 render={({ field }) => (
 <FormItem className="lg:col-span-3">
 <FormLabel className="text-label-xs font-semibold uppercase text-muted-foreground/40 mb-3 ps-1">{tc('notes')}</FormLabel>
 <FormControl>
 <Input placeholder={tc('notes')} className="bg-surface-container-lowest border-none h-11 rounded-xl font-semibold text-label-xs uppercase focus-visible:ring-operational-cyan/30" {...field} />
 </FormControl>
 <FormMessage className="text-label-xxs font-semibold uppercase" />
 </FormItem>
 )}
 />
 </div>
 </div>

 {/* Step 2: Line Items */}
 <div className="space-y-6">
 <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
 <div className="flex items-center gap-4">
 <div className="p-2.5 rounded-xl bg-status-warning/10 text-status-warning">
 <Calculator className="w-4 h-4" />
 </div>
 <div>
 <h3 className="text-label-xs font-semibold uppercase text-muted-foreground/70">{tc('items')}</h3>
 <p className="text-label-xxs font-semibold text-muted-foreground/30 uppercase mt-0.5">{t('specification')}</p>
 </div>
 </div>
 
 <div className="flex-1 max-w-md">
 <ScanInput 
 onScan={handleScan}
 placeholder={tc('select_item')}
 className="h-12"
 />
 </div>

 <Button 
 type="button" 
 variant="outline" 
 size="sm" 
 className="h-12 px-6 border-none text-operational-cyan bg-operational-cyan/10 hover:bg-operational-cyan hover:text-white rounded-xl text-label-xs font-semibold uppercase transition-all"
 onClick={() => append({ item_id: '', item_name: '', item_code: '', req_qty: 1, uom_id: 'EA' })}
 >
 <Plus className="h-3.5 w-3.5 me-2" />
 {tc('create')}
 </Button>
 </div>

 <div className="grid grid-cols-1 gap-4">
 {fields.map((field, index) => (
 <div key={field.id} className="grid grid-cols-1 lg:grid-cols-[2fr_1fr_1fr_auto] gap-6 items-end bg-surface-container-low/50 p-6 rounded-2xl group hover:bg-surface-container transition-all">
 <FormField<PurchaseRequestFormValues, `lines.${number}.item_id`>
 control={form.control}
 name={`lines.${index}.item_id`}
 render={({ field: inputField }) => (
 <FormItem>
 <FormLabel className="text-label-xxs font-semibold uppercase text-muted-foreground/40 mb-2">{tc('item')}</FormLabel>
 <Select 
 onValueChange={(val) => {
 const item = itemsData?.data?.find((i: Item) => i.id === val);
 form.setValue(`lines.${index}.item_id`, val as string);
 form.setValue(`lines.${index}.item_name`, locale === 'ar' ? item?.name_ar : item?.name_en);
 form.setValue(`lines.${index}.item_code`, item?.code);
 form.setValue(`lines.${index}.uom_id`, item?.primary_uom?.id || 'EA');
 }} 
 value={inputField.value}
 >
 <FormControl>
 <SelectTrigger className="bg-surface-container-low border-none h-11 rounded-xl text-label-xs font-semibold uppercase focus:ring-1 focus:ring-operational-cyan/30">
 <SelectValue placeholder={tc('select_item')} />
 </SelectTrigger>
 </FormControl>
 <SelectContent className="bg-surface-container-low border-none rounded-2xl max-h-[300px]">
 {itemsData?.data?.map((i: Item) => (
 <SelectItem key={i.id} value={i.id} className="text-label-xs font-bold">
 {i.code} - {locale === 'ar' ? i.name_ar : i.name_en}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 <FormMessage className="text-label-xxs font-semibold" />
 </FormItem>
 )}
 />

 <FormField<PurchaseRequestFormValues, `lines.${number}.req_qty`>
 control={form.control}
 name={`lines.${index}.req_qty`}
 render={({ field: inputField }) => (
 <FormItem>
 <FormLabel className="text-label-xxs font-semibold uppercase text-muted-foreground/40 mb-2">{t('requested_qty')}</FormLabel>
 <FormControl>
 <Input 
 type="number" 
 step="0.01"
 className="bg-surface-container-low border-none h-11 rounded-xl font-mono font-semibold text-label-xs focus-visible:ring-operational-cyan/30" 
 dir="ltr"
 {...inputField} 
 onChange={(e) => inputField.onChange(e.target.valueAsNumber || 0)}
 />
 </FormControl>
 <FormMessage />
 </FormItem>
 )}
 />

 <FormField<PurchaseRequestFormValues, `lines.${number}.uom_id`>
 control={form.control}
 name={`lines.${index}.uom_id`}
 render={({ field: inputField }) => (
 <FormItem>
 <FormLabel className="text-label-xxs font-semibold uppercase text-muted-foreground/40 mb-2">{tc('uom')}</FormLabel>
 <FormControl>
 <Input disabled className="bg-surface-container-high/10 border-none h-11 rounded-xl font-semibold text-label-xs uppercase opacity-50" {...inputField} />
 </FormControl>
 <FormMessage />
 </FormItem>
 )}
 />

 <Button 
 type="button" 
 variant="ghost" 
 size="icon" 
 className="w-10 h-10 rounded-xl text-muted-foreground/20 hover:text-status-error hover:bg-status-error/10 transition-all border-none"
 onClick={() => remove(index)}
 >
 <Trash2 className="h-4 w-4" />
 </Button>
 </div>
 ))}
 {fields.length === 0 && (
 <div className="py-12 border-2 border-dashed border-surface-variant/10 rounded-3xl flex flex-col items-center justify-center text-muted-foreground/20 italic text-label-xs font-semibold uppercase">
 {tc('no_items')}
 </div>
 )}
 </div>
 
 {/* Summary */}
 <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-8 bg-surface-container-low rounded-[2rem]">
 <div className="flex items-center gap-4">
 <div className="w-12 h-12 rounded-2xl bg-operational-cyan/10 flex items-center justify-center">
 <Package className="w-6 h-6 text-operational-cyan" />
 </div>
 <div>
 <div className="text-label-xs font-semibold uppercase text-muted-foreground/30">{tc('items')}</div>
 <div className="text-body-md font-semibold text-foreground">{fields.length} {tc('items')}</div>
 </div>
 </div>
 </div>
 </div>

 {/* Footer Actions */}
 <div className="flex flex-col md:flex-row items-center justify-end gap-6 pt-12 mt-12 border-none">
 <Button
 variant="ghost"
 type="button"
 onClick={() => router.back()}
 disabled={isSubmitting}
 className="text-label-xs font-semibold uppercase text-muted-foreground/40 hover:text-foreground hover:bg-surface-container-high/50 h-12 px-8 rounded-xl transition-all"
 >
 <ArrowLeft className="w-3.5 h-3.5 me-2" />
 {tc('cancel')}
 </Button>
 
 <div className="flex items-center gap-4 w-full md:w-auto">
 <Button
 type="submit"
 disabled={isSubmitting}
 variant="outline"
 className="flex-1 md:flex-none h-12 px-8 border-none bg-surface-container-low text-foreground text-label-xs font-semibold uppercase rounded-xl hover:bg-surface-container-high/50 active:scale-95 transition-all shadow-xl shadow-black/5"
 >
 <Save className="w-3.5 h-3.5 me-2" />
 {tc('save')}
 </Button>
 <Button
 type="button"
 disabled={isSubmitting}
 onClick={form.handleSubmit(handleSubmitClick)}
 className="flex-1 md:flex-none h-12 px-10 bg-operational-cyan hover:brightness-110 text-primary-foreground text-label-xs font-semibold uppercase rounded-xl transition-all active:scale-95 shadow-xl shadow-operational-cyan/20"
 >
 {isSubmitting ? tc('saving') : (
 <>
 <Send className="w-3.5 h-3.5 me-2" />
 {t('submit')}
 </>
 )}
 </Button>
 </div>
 </div>
 </form>
 <PostConfirmDialog
 open={submitConfirmOpen}
 onOpenChange={setSubmitConfirmOpen}
 onConfirm={() => { if (pendingValues) onSave(pendingValues, true); }}
 title={t('submit')}
 description={t('approve_confirm_desc')}
 warningText={t('irreversible')}
 />
 </Form>
 );
}
