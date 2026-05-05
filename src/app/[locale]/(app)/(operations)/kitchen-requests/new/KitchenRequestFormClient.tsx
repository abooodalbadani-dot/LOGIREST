'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PageHeader } from '@/components/shared/PageHeader';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { Button } from '@/components/ui/button';
import { 
 Select, 
 SelectContent, 
 SelectItem, 
 SelectTrigger, 
 SelectValue 
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useCreateKitchenRequest } from '@/features/operations/hooks/useKitchenRequests';
import { useWarehouses } from '@/features/warehouses/api/useWarehouses';
import { useDepartments } from '@/features/departments/hooks/useDepartments';
import { useItems } from '@/features/items/api/useItems';
import { 
 Plus, 
 Trash2, 
 Save, 
 Send, 
 Warehouse, 
 Building2, 
 FileText,
 Package,
 Calculator,
 ListFilter
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
 KitchenRequestSchema, 
 CreateKitchenRequestDTO 
} from '@/features/operations/types/kitchen-request';

type KitchenRequestFormValues = CreateKitchenRequestDTO;

export function KitchenRequestFormClient({ locale }: { locale: 'ar' | 'en' }) {
 const t = useTranslations('operations.kitchen_request');
 const tCommon = useTranslations('common');
 const router = useRouter();
 
 const { data: warehouses } = useWarehouses();
 const { data: departments } = useDepartments();
 const { data: items } = useItems();
 const createRequest = useCreateKitchenRequest();
 
 const form = useForm<KitchenRequestFormValues>({
 resolver: zodResolver(KitchenRequestSchema),
 defaultValues: {
 items: [{ itemId: '', quantity: 1, notes: '' }],
 }
 });

 const { fields, append, remove } = useFieldArray({
 control: form.control,
 name: "items"
 });
 
 const watchedItems = useWatch({
 control: form.control,
 name: "items",
 });

  const onSubmit = async (values: KitchenRequestFormValues, isDraft: boolean) => {
    try {
      await createRequest.mutateAsync({ ...values, isDraft });
      router.push('/kitchen-requests');
    } catch (error) {
      console.error('Failed to create kitchen request', error);
    }
  };

  return (
    <div className="p-8 max-w-[1200px] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <Breadcrumb 
        items={[
          { label: tCommon('inventory'), href: '#' },
          { label: t('title'), href: '/kitchen-requests' },
          { label: t('create_new') }
        ]} 
      />
 
 <PageHeader
 title={t('create_new')}
 description={t('new_description')}
 actions={
 <div className="flex items-center gap-3">
 <Button 
 variant="outline"
 onClick={form.handleSubmit((data) => onSubmit(data, true))} 
 disabled={createRequest.isPending}
 className="rounded-xl h-11 px-6 text-label-xs font-semibold uppercase transition-all"
 >
 <Save className="w-4 h-4 me-2" />
 {t('save_draft')}
 </Button>
 <Button 
 onClick={form.handleSubmit((data) => onSubmit(data, false))} 
 disabled={createRequest.isPending}
 className={cn(
 "bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl h-11 px-8 text-label-xs font-semibold uppercase transition-all shadow-lg"
 )}
 >
 <Send className="w-4 h-4 me-2" />
 {t('submit')}
 </Button>
 </div>
 }
 />

 <form className="space-y-8">
 {/* Header Information */}
 <div className="bg-surface-container-low p-8 rounded-[2.5rem] border border-surface-container-high/20 shadow-xl shadow-black/5">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
 <div className="space-y-2">
 <label className="text-label-xs font-semibold uppercase text-muted-foreground/60 mb-3 flex items-center gap-2">
 <Building2 className="w-3.5 h-3.5" />
 {t('department')}
 </label>
 <Select
 onValueChange={(val) => form.setValue('departmentId', (val as string) || '', { shouldValidate: true })}
 >
 <SelectTrigger className="bg-surface-container-high/30 border-none h-14 px-6 text-body-md font-bold rounded-2xl focus:ring-2 focus:ring-cyan-500/20">
 <SelectValue placeholder={tCommon('select_department')} />
 </SelectTrigger>
 <SelectContent className="bg-surface-container-highest border-none shadow-2xl rounded-2xl">
 {departments?.data.map(d => (
 <SelectItem key={d.id} value={d.id} className="font-bold">
 {locale === 'ar' ? d.name_ar : d.name_en}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 {form.formState.errors.departmentId && (
 <p className="text-label-xs font-bold text-red-500 uppercase px-2">{t('validation.department_required')}</p>
 )}
 </div>

 <div className="space-y-2">
 <label className="text-label-xs font-semibold uppercase text-muted-foreground/60 mb-3 flex items-center gap-2">
 <Warehouse className="w-3.5 h-3.5" />
 {t('warehouse')}
 </label>
 <Select
 onValueChange={(val) => form.setValue('warehouseId', (val as string) || '', { shouldValidate: true })}
 >
 <SelectTrigger className="bg-surface-container-high/30 border-none h-14 px-6 text-body-md font-bold rounded-2xl focus:ring-2 focus:ring-cyan-500/20">
 <SelectValue placeholder={tCommon('select_warehouse')} />
 </SelectTrigger>
 <SelectContent className="bg-surface-container-highest border-none shadow-2xl rounded-2xl">
 {warehouses?.map(w => (
 <SelectItem key={w.id} value={w.id} className="font-bold">
 {locale === 'ar' ? w.nameAr : w.nameEn}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 {form.formState.errors.warehouseId && (
 <p className="text-label-xs font-bold text-red-500 uppercase px-2">{t('validation.warehouse_required')}</p>
 )}
 </div>

 <div className="md:col-span-2 space-y-2">
 <label className="text-label-xs font-semibold uppercase text-muted-foreground/60 mb-3 flex items-center gap-2">
 <FileText className="w-3.5 h-3.5" />
 {tCommon('notes')}
 </label>
 <Input 
 {...form.register('notes')}
 placeholder={t('notes_placeholder')}
 className="bg-surface-container-high/30 border-none h-14 px-6 text-body-md font-bold rounded-2xl focus:ring-2 focus:ring-cyan-500/20"
 />
 </div>
 </div>
 </div>

 {/* Line Items */}
 <div className="space-y-6">
 <div className="flex items-center justify-between px-4">
 <div className="flex items-center gap-4">
 <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
 <Calculator className="w-5 h-5" />
 </div>
 <div>
 <h3 className="text-label-sm font-semibold uppercase text-muted-foreground/80">{t('items')}</h3>
 <p className="text-label-xxs font-semibold text-muted-foreground/40 uppercase mt-1">{t('specify_components')}</p>
 </div>
 </div>
 <Button 
 type="button" 
 variant="outline" 
 size="sm" 
 className="h-10 px-6 border-cyan-500/30 text-cyan-500 bg-cyan-500/5 hover:bg-cyan-500 hover:text-white rounded-xl text-label-xs font-semibold uppercase transition-all"
 onClick={() => append({ itemId: '', quantity: 1, notes: '' })}
 >
 <Plus className="h-4 w-4 me-2" />
 {tCommon('add_item')}
 </Button>
 </div>

 <div className="space-y-4">
 {fields.length === 0 ? (
 <div className="py-16 text-center bg-surface-container-low rounded-[2rem] border-2 border-dashed border-surface-container-high/50">
 <ListFilter className="w-10 h-10 text-muted-foreground/20 mx-auto mb-4" />
 <p className="text-label-xs font-semibold text-muted-foreground/40 uppercase">{t('validation.items_required')}</p>
 </div>
 ) : (
 fields.map((field, index) => {
 const selectedItemId = watchedItems[index]?.itemId;
 const selectedItem = items?.find(i => i.id === selectedItemId);
 
 return (
 <div key={field.id} className="grid grid-cols-1 md:grid-cols-[2fr_1fr_2fr_auto] gap-4 items-end p-6 rounded-[2rem] bg-surface-container-low border border-surface-container-high/20 hover:border-cyan-500/30 transition-all group">
 <div className="space-y-2">
 <label className="text-label-xxs font-semibold uppercase text-muted-foreground/40 px-1">{tCommon('item')}</label>
 <Select
 defaultValue={field.itemId}
 onValueChange={(val) => form.setValue(`items.${index}.itemId`, val || '', { shouldValidate: true })}
 >
 <SelectTrigger className="bg-surface-container-high/30 border-none h-12 px-4 text-label-sm font-bold rounded-xl focus:ring-2 focus:ring-cyan-500/20">
 <SelectValue placeholder={tCommon('select_item')} />
 </SelectTrigger>
 <SelectContent className="bg-surface-container-highest border-none shadow-2xl rounded-xl">
 {items?.map(item => (
 <SelectItem key={item.id} value={item.id} className="font-bold">
 {locale === 'ar' ? item.nameAr : item.nameEn}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 {form.formState.errors.items?.[index]?.itemId && (
 <p className="text-label-xxs font-bold text-red-500 uppercase px-1">{t('validation.item_required')}</p>
 )}
 </div>

 <div className="space-y-2">
 <label className="text-label-xxs font-semibold uppercase text-muted-foreground/40 px-1 text-center block">{tCommon('quantity')}</label>
 <div className="relative">
 <Input 
 type="number"
 step="0.01"
 dir="ltr"
 {...form.register(`items.${index}.quantity`, { valueAsNumber: true })}
 className="bg-surface-container-high/30 border-none h-12 px-4 text-body-md font-semibold text-center rounded-xl focus:ring-2 focus:ring-cyan-500/20"
 />
 <span className="absolute end-4 top-1/2 -translate-y-1/2 text-label-xxs font-semibold uppercase text-muted-foreground/30">
 {selectedItem?.uom || '---'}
 </span>
 </div>
 {form.formState.errors.items?.[index]?.quantity && (
 <p className="text-label-xxs font-bold text-red-500 uppercase text-center">{t('validation.qty_positive')}</p>
 )}
 </div>

 <div className="space-y-2">
 <label className="text-label-xxs font-semibold uppercase text-muted-foreground/40 px-1">{tCommon('notes')}</label>
 <Input 
 {...form.register(`items.${index}.notes`)}
 placeholder={t('line_notes_placeholder')}
 className="bg-surface-container-high/30 border-none h-12 px-5 text-label-sm font-bold rounded-xl focus:ring-2 focus:ring-cyan-500/20"
 />
 </div>

 <Button 
 type="button" 
 variant="ghost" 
 size="icon" 
 className="h-12 w-12 rounded-xl text-muted-foreground/20 hover:text-red-500 hover:bg-red-500/5 transition-all"
 onClick={() => remove(index)}
 >
 <Trash2 className="w-4 h-4" />
 </Button>
 </div>
 );
 })
 )}
 </div>
 </div>
 </form>
 </div>
 );
}
