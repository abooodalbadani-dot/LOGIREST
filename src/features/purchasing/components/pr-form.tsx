'use client';

import * as React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Trash2, Plus, Calendar, FileText, Package, Calculator, ArrowLeft, Send, Save, Building2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
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
import { useMasterDataList } from '../hooks/useMasterDataCRUD';
import { ScanInput } from '@/components/shared/ScanInput/ScanInput';

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
  locale: 'ar' | 'en';
}

export function PurchaseRequestForm({ initialData, locale }: PurchaseRequestFormProps) {
  const t = useTranslations('procurement.pr');
  const tc = useTranslations('common');
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitConfirmOpen, setSubmitConfirmOpen] = React.useState(false);
  const [pendingValues, setPendingValues] = React.useState<PurchaseRequestFormValues | null>(null);

  // Mocks/Hooks for data selection
  const { data: warehouses } = useMasterDataList('warehouses', z.any());
  const { data: itemsData } = useMasterDataList('items', z.any());

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
    const item = itemsData?.data?.find((i: any) => i.barcode === barcode || i.code === barcode);
    if (item) {
      append({
        item_id: item.id,
        item_name: locale === 'ar' ? item.name_ar : item.name_en,
        item_code: item.code,
        req_qty: 1,
        uom_id: item.primary_uom_id || 'EA',
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

      router.push(`/${locale}/purchase-requests`);
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
      <form onSubmit={form.handleSubmit((v) => onSave(v, false))} className="space-y-10 w-full bg-surface-container-lowest p-8 rounded-[2rem] relative pb-20 border border-surface-variant/5">
        <div className="flex items-center justify-between">
           <h3 className="text-xl font-black text-operational-cyan uppercase tracking-wider">{t('detail_title')}</h3>
           {initialData?.document_number && (
             <span className="font-mono text-xs font-black text-muted-foreground/40 tracking-[0.2em]">
               {initialData.document_number}
             </span>
           )}
        </div>
        
        {/* Step 1: Request Header */}
        <div className="bg-surface-container-low p-8 rounded-3xl relative border border-surface-variant/10 shadow-inner shadow-black/10">
          <div className="flex items-center gap-4 mb-8 pb-6 border-b border-surface-variant/10">
             <div className="p-3 rounded-2xl bg-operational-cyan/10 text-operational-cyan">
                <Building2 className="w-5 h-5" />
             </div>
             <div>
                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-foreground">{t('new_intent')}</h3>
                <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mt-0.5">{t('specification')}</p>
             </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FormField<PurchaseRequestFormValues, 'department_id'>
              control={form.control}
              name="department_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 mb-3 flex items-center gap-2">
                    <Package className="w-3 h-3" />
                    {t('department')}
                  </FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-surface-container-high/30 border-none h-12 px-5 text-[11px] font-bold rounded-xl shadow-inner shadow-black/20">
                        <SelectValue placeholder={tc('select_warehouse')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-surface-container-highest border border-surface-variant/10 rounded-xl shadow-2xl">
                      {warehouses?.data?.map((w: any) => (
                        <SelectItem key={w.id} value={w.id} className="text-[11px] font-bold">
                          {locale === 'ar' ? w.name_ar : w.name_en}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-[9px] font-black uppercase" />
                </FormItem>
              )}
            />

            <FormField<PurchaseRequestFormValues, 'expected_date'>
              control={form.control}
              name="expected_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 mb-3 flex items-center gap-2">
                    <Calendar className="w-3 h-3" />
                    {t('expected_date')}
                  </FormLabel>
                  <FormControl>
                    <Input type="date" className="bg-surface-container-high/30 border-none h-12 px-5 text-[11px] font-bold rounded-xl shadow-inner shadow-black/20" {...field} />
                  </FormControl>
                  <FormMessage className="text-[9px] font-black uppercase" />
                </FormItem>
              )}
            />

            <FormField<PurchaseRequestFormValues, 'notes'>
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem className="lg:col-span-3">
                  <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 mb-3">{tc('notes')}</FormLabel>
                  <FormControl>
                    <Input placeholder={tc('notes')} className="bg-surface-container-high/30 border-none h-12 px-5 text-[11px] font-bold rounded-xl shadow-inner shadow-black/20" {...field} />
                  </FormControl>
                  <FormMessage className="text-[9px] font-black uppercase" />
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
                  <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-muted-foreground/70">{tc('items')}</h3>
                  <p className="text-[8px] font-black text-muted-foreground/30 uppercase tracking-[0.2em] mt-0.5">{t('specification')}</p>
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
              className="h-12 px-6 border-operational-cyan/30 text-operational-cyan bg-operational-cyan/5 hover:bg-operational-cyan hover:text-primary-foreground rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
              onClick={() => append({ item_id: '', item_name: '', item_code: '', req_qty: 1, uom_id: 'EA' })}
            >
              <Plus className="h-3.5 w-3.5 me-2" />
              {tc('create')}
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-1 lg:grid-cols-[2fr_1fr_1fr_auto] gap-6 items-end bg-surface-container-low/50 p-6 rounded-2xl group hover:bg-surface-container transition-all border border-surface-variant/5">
                <FormField<PurchaseRequestFormValues, `lines.${number}.item_id`>
                  control={form.control}
                  name={`lines.${index}.item_id`}
                  render={({ field: inputField }) => (
                    <FormItem>
                      <FormLabel className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 mb-2">{tc('item')}</FormLabel>
                      <Select 
                        onValueChange={(val) => {
                          const item = itemsData?.data?.find((i: any) => i.id === val);
                          form.setValue(`lines.${index}.item_id`, val);
                          form.setValue(`lines.${index}.item_name`, locale === 'ar' ? item?.name_ar : item?.name_en);
                          form.setValue(`lines.${index}.item_code`, item?.code);
                          form.setValue(`lines.${index}.uom_id`, item?.primary_uom_id || 'EA');
                        }} 
                        value={inputField.value}
                      >
                        <FormControl>
                          <SelectTrigger className="bg-surface-container-high/30 border-none h-11 px-4 text-[11px] font-bold rounded-lg shadow-inner shadow-black/10">
                            <SelectValue placeholder={tc('select_item')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-surface-container-highest border border-surface-variant/10 rounded-xl shadow-2xl max-h-[300px]">
                          {itemsData?.data?.map((i: any) => (
                            <SelectItem key={i.id} value={i.id} className="text-[11px] font-bold">
                              {i.code} - {locale === 'ar' ? i.name_ar : i.name_en}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-[8px] font-black" />
                    </FormItem>
                  )}
                />

                <FormField<PurchaseRequestFormValues, `lines.${number}.req_qty`>
                  control={form.control}
                  name={`lines.${index}.req_qty`}
                  render={({ field: inputField }) => (
                    <FormItem>
                      <FormLabel className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 mb-2">{t('requested_qty')}</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01"
                          className="bg-surface-container-high/30 border-none h-11 px-4 text-[11px] font-bold rounded-lg font-mono shadow-inner shadow-black/10" 
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
                      <FormLabel className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 mb-2">{tc('uom')}</FormLabel>
                      <FormControl>
                         <Input disabled className="bg-surface-container-high/10 border-none h-11 px-4 text-[10px] font-black uppercase tracking-widest rounded-lg opacity-50" {...inputField} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon" 
                  className="w-10 h-10 rounded-xl text-muted-foreground/20 hover:text-status-error hover:bg-status-error/10 transition-all border border-surface-variant/5"
                  onClick={() => remove(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {fields.length === 0 && (
              <div className="py-12 border-2 border-dashed border-surface-variant/10 rounded-3xl flex flex-col items-center justify-center text-muted-foreground/20 italic text-[10px] font-black uppercase tracking-[0.2em]">
                 {tc('no_items')}
              </div>
            )}
          </div>
          
          {/* Summary */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-8 bg-surface-container-low rounded-2xl border border-surface-variant/10 shadow-inner shadow-black/5">
             <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-operational-cyan/10 flex items-center justify-center">
                   <Package className="w-6 h-6 text-operational-cyan" />
                </div>
                <div>
                   <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">{tc('items')}</div>
                   <div className="text-sm font-bold text-foreground">{fields.length} {tc('items')}</div>
                </div>
             </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col md:flex-row items-center justify-end gap-6 pt-12 mt-12 border-t border-surface-variant/10">
           <Button
            variant="ghost"
            type="button"
            onClick={() => router.back()}
            disabled={isSubmitting}
            className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 hover:text-foreground hover:bg-surface-container-high h-12 px-8 rounded-xl transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5 me-2" />
            {tc('cancel')}
          </Button>
          
          <div className="flex items-center gap-4 w-full md:w-auto">
             <Button
                type="submit"
                disabled={isSubmitting}
                variant="outline"
                className="flex-1 md:flex-none h-12 px-8 border-surface-container-high text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-surface-container-high active:scale-95 transition-all shadow-lg"
             >
                <Save className="w-3.5 h-3.5 me-2" />
                {tc('save')}
             </Button>
             <Button
                type="button"
                disabled={isSubmitting}
                onClick={form.handleSubmit(handleSubmitClick)}
                className="flex-1 md:flex-none h-12 px-10 bg-operational-cyan hover:brightness-110 text-primary-foreground text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition-all active:scale-95 shadow-xl shadow-operational-cyan/20"
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
        onConfirm={() => pendingValues && onSave(pendingValues, true)}
        title={t('submit')}
        description={t('approve_confirm_desc')}
        warningText={t('irreversible')}
      />
    </Form>
  );
}
