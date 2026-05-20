'use client';

import { useTranslations } from 'next-intl';
import { useUnsavedChangesGuard } from '@/lib/unsaved-changes/useUnsavedChangesGuard';
import { useState, useEffect } from 'react';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PageHeader } from '@/components/shared/PageHeader';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCreateKitchenRequest } from '@/features/operations/hooks/useKitchenRequests';
import { useWarehouses } from '@/features/warehouses/hooks/useWarehouses';
import { useDepartments } from '@/features/departments/hooks/useDepartments';
import { useItems } from '@/features/items/hooks/useItems';
import { SmartCombobox } from '@/components/shared/SmartCombobox';
import { DocumentLineItemTable } from '@/components/shared/DocumentLineItemTable/DocumentLineItemTable';
import { 
 Plus, 
 Trash2, 
 Save, 
 Send, 
 Warehouse, 
 Building2, 
 FileText,
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
 
 const form = useForm<KitchenRequestFormValues>({
 resolver: zodResolver(KitchenRequestSchema),
 defaultValues: {
 items: [],
 }
 });

  const { router: guardedRouter } = useUnsavedChangesGuard(form.formState.isDirty);
 
 const { data: warehousesData } = useWarehouses(); const warehouses = warehousesData?.data || [];
 const { data: departments } = useDepartments();
 const { data: itemsData } = useItems(); const items = itemsData?.data || [];
 const createRequest = useCreateKitchenRequest();
 
 const { fields, append, remove } = useFieldArray({
 control: form.control,
 name: "items"
 });
 
 const watchedItems = useWatch({
 control: form.control,
 name: "items",
 });

  const onSubmit = (values: KitchenRequestFormValues, isDraft: boolean) => {
    createRequest.mutate({ data: { ...values, isDraft } }, {
      onSuccess: (data) => {
        form.reset(values);
        guardedRouter.push(`/kitchen-requests/${data.id}`, { skipGuard: true });
      }
    });
  };

  return (
    <div className="p-8 max-w-[1200px] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-700">
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
              type="button"
              variant="outline"
              onClick={form.handleSubmit((data) => onSubmit(data, true))} 
              disabled={createRequest.isPending}
              className="rounded-2xl h-11 px-6 text-label-xs font-semibold uppercase transition-all"
            >
              <Save className="w-4 h-4 me-2" />
              {t('save_draft')}
            </Button>
            <Button 
              type="button"
              onClick={form.handleSubmit((data) => onSubmit(data, false))} 
              disabled={createRequest.isPending}
              className={cn(
                "bg-primary hover:bg-primary/90 text-white rounded-2xl h-11 px-8 text-label-xs font-semibold uppercase transition-all shadow-md"
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
        <div className="bg-surface-container-low p-8 rounded-[2rem] shadow-sm shadow-black/5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-label-xs font-semibold uppercase text-muted-foreground/60 mb-3 flex items-center gap-2">
                <Building2 className="w-3.5 h-3.5" />
                {t('department')}
              </label>
              <SmartCombobox
                items={departments?.data || []}
                value={form.watch('department_id')}
                onSelect={(dept) => form.setValue('department_id', dept.id, { shouldValidate: true })}
                placeholder={tCommon('select_department')}
                triggerClassName="bg-surface-container-high/30 border-none h-14 px-6 text-body-md font-bold rounded-2xl focus:ring-2 focus:ring-primary/20"
              />
              {form.formState.errors.department_id && (
                <p className="text-label-xs font-bold text-red-500 uppercase px-2">{t('validation.department_required')}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-label-xs font-semibold uppercase text-muted-foreground/60 mb-3 flex items-center gap-2">
                <Warehouse className="w-3.5 h-3.5" />
                {t('warehouse')}
              </label>
              <SmartCombobox
                items={warehouses || []}
                value={form.watch('warehouse_id')}
                onSelect={(w) => form.setValue('warehouse_id', w.id, { shouldValidate: true })}
                placeholder={tCommon('select_warehouse')}
                triggerClassName="bg-surface-container-high/30 border-none h-14 px-6 text-body-md font-bold rounded-2xl focus:ring-2 focus:ring-primary/20"
              />
              {form.formState.errors.warehouse_id && (
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
                className="bg-surface-container-high/30 border-none h-14 px-6 text-body-md font-bold rounded-2xl focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
        </div>

        {/* Line Items */}
        <div className="space-y-6">
          <div className="flex items-center justify-between px-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-primary/10 text-primary">
                <Calculator className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-label-sm font-semibold uppercase text-muted-foreground/80 font-display">{t('items')}</h3>
                <p className="text-label-xxs font-semibold text-muted-foreground/40 uppercase mt-1">{t('specify_components')}</p>
              </div>
            </div>
          </div>

          {/* Search / Add Item Bar */}
          <div className="mb-8 w-full max-w-xl mx-auto space-y-2">
            <label className="text-label-xs font-semibold uppercase text-muted-foreground/40 ms-1 block text-center whitespace-nowrap">
              {tCommon('select_item')}
            </label>
            <SmartCombobox
              items={items || []}
              onSelect={(item: { id: string }) => {
                const existingIndex = watchedItems?.findIndex(i => i?.item_id === item.id) ?? -1;
                if (existingIndex !== -1) {
                  const currentQty = form.getValues(`items.${existingIndex}.quantity`) || 0;
                  form.setValue(`items.${existingIndex}.quantity`, currentQty + 1, { shouldDirty: true, shouldValidate: true });
                } else {
                  append({ item_id: item.id, quantity: 1, notes: '' });
                }
              }}
              placeholder={tCommon('select_item')}
            />
          </div>

          <div className="space-y-4">
            {fields.length === 0 ? (
              <div className="py-16 text-center bg-surface-container-low rounded-[2rem]">
                <ListFilter className="w-10 h-10 text-muted-foreground/10 mx-auto mb-4" />
                <p className="text-label-xs font-semibold text-muted-foreground/30 uppercase">{t('validation.items_required')}</p>
              </div>
            ) : (
              <div className="bg-surface-container-low/30 rounded-[2rem] border border-white/5 overflow-hidden">
                <DocumentLineItemTable
                  lines={fields.map((field, index) => {
                    const selectedItemId = watchedItems?.[index]?.item_id;
                    const selectedItem = items?.find(i => i.id === selectedItemId);
                    return {
                      id: field.id,
                      item: {
                        id: selectedItemId || '',
                        code: selectedItem?.barcode || '',
                        name_en: selectedItem?.name_en || '',
                        name_ar: selectedItem?.name_ar || '',
                        primary_uom: { code: selectedItem?.primary_uom?.code || '' }
                      },
                      qty: watchedItems?.[index]?.quantity ?? 1,
                      uom_id: '',
                      lot: null,
                      index,
                      selectedItem,
                    };
                  })}
                  locale={locale}
                  isReadOnly={false}
                  onRemoveLine={(id) => {
                    const idx = fields.findIndex(f => f.id === id);
                    if (idx !== -1) remove(idx);
                  }}
                  hideLotColumns={true}
                  dense={true}
                  headers={{
                    code: tCommon('table_headers.code'),
                    name: tCommon('table_headers.name'),
                    qty: tCommon('table_headers.qty'),
                    uom: tCommon('table_headers.uom'),
                  }}
                  renderQty={(line) => (
                    <div className="flex flex-col items-center gap-1">
                      <div className="flex justify-center">
                        <Input 
                          type="number"
                          step="0.01"
                          dir="ltr"
                          {...form.register(`items.${line.index}.quantity`, { valueAsNumber: true })}
                          className="w-24 bg-surface-container-highest/60 border border-white/5 rounded-lg text-center py-1.5 font-mono text-body-md font-semibold focus:ring-2 focus:ring-cyan-500/30 outline-none transition-all hover:bg-surface-container-highest/80 disabled:opacity-50"
                        />
                      </div>
                      {form.formState.errors.items?.[line.index]?.quantity && (
                        <p className="text-label-xxs font-bold text-red-500 uppercase text-center mt-1">{t('validation.qty_positive')}</p>
                      )}
                    </div>
                  )}
                  renderUom={(line) => (
                    <span className="text-label-xs font-semibold text-muted-foreground/40 uppercase">
                      {line.selectedItem?.primary_uom?.code || '---'}
                    </span>
                  )}
                  extraColumns={[
                    {
                      header: tCommon('notes'),
                      cell: (line) => (
                        <div className="flex justify-center min-w-[200px]">
                          <Input 
                            {...form.register(`items.${line.index}.notes`)}
                            placeholder={t('line_notes_placeholder')}
                            className="w-full bg-surface-container-highest/60 border border-white/5 rounded-lg h-9 px-3 text-label-sm font-semibold focus:ring-2 focus:ring-cyan-500/30 outline-none transition-all hover:bg-surface-container-highest/80 disabled:opacity-50"
                          />
                        </div>
                      )
                    }
                  ]}
                />
              </div>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
