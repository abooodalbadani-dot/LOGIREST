'use client';

import { useTranslations } from 'next-intl';
import { useUnsavedChangesGuard } from '@/lib/unsaved-changes/useUnsavedChangesGuard';
import { useMemo, useEffect, useState } from 'react';
import { useForm, useFieldArray, useWatch, type UseFormRegister } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PageHeader } from '@/components/shared/PageHeader';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  useCreateKitchenRequest,
  useUpdateKitchenRequestStatus
} from '@/features/operations/hooks/useKitchenRequests';
import { useWarehouses } from '@/features/warehouses/hooks/useWarehouses';
import { useDepartments } from '@/features/departments/hooks/useDepartments';
import { useWarehouseInventory } from '@/features/inventory/hooks/useWarehouseInventory';
import { SmartCombobox } from '@/components/shared/SmartCombobox';
import { DocumentLineItemTable, type LineItem } from '@/components/shared/DocumentLineItemTable/DocumentLineItemTable';
import {
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
import { type Item } from '@/types/master-data';

import { mapWarehouseToCombobox, mapItemToCombobox } from '@/utils/mappers';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { ErrorState } from '@/components/shared/ErrorState';
import { useAuth } from '@/providers/AuthProvider';
import { useItems } from '@/features/items/hooks/useItems';
import { onFormError } from '@/hooks/useFormError';
import { ScanInput } from '@/components/shared/ScanInput/ScanInput';
import { toast } from 'sonner';

type KitchenRequestFormValues = CreateKitchenRequestDTO;

interface QuantityInputProps {
  value: number | string;
  onChange: (val: number | '') => void;
  disabled?: boolean;
  className?: string;
}

function QuantityInput({ value, onChange, disabled, className }: QuantityInputProps) {
  const [localValue, setLocalValue] = useState(value !== undefined && value !== null ? String(value) : '');

  useEffect(() => {
    setLocalValue(value !== undefined && value !== null ? String(value) : '');
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
      value={localValue}
      disabled={disabled}
      onChange={handleChange}
      onBlur={handleBlur}
      className={className}
      dir="ltr"
    />
  );
}

interface ScopedItem extends Item {
  qtyAvailable: number;
}

interface KitchenRequestFormLineItem extends LineItem {
  index: number;
  selectedItem?: ScopedItem;
}

interface KitchenRequestNotesCellProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

function KitchenRequestNotesCell({ value, onChange, placeholder, disabled }: KitchenRequestNotesCellProps) {
  const [localVal, setLocalVal] = useState(value);

  useEffect(() => {
    setLocalVal(value);
  }, [value]);

  return (
    <div className="flex justify-center min-w-[200px] w-full">
      <Input
        value={localVal}
        onChange={(e) => setLocalVal(e.target.value)}
        onBlur={() => onChange(localVal)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full bg-transparent text-sm border-gray-300 dark:border-gray-700 text-[#0B1220] dark:text-white placeholder-gray-400 focus:border-[#b48e67] focus:ring-1 focus:ring-[#b48e67] rounded-md outline-none transition-all"
      />
    </div>
  );
}

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

  const { user } = useAuth();

  const { data: warehousesData, isLoading: isLoadingWarehouses, error: errorWarehouses } = useWarehouses();
  const warehouses = useMemo(() => warehousesData?.data || [], [warehousesData]);

  const { data: departmentsData, isLoading: isLoadingDepartments, error: errorDepartments } = useDepartments();
  const departmentsList = useMemo(() => departmentsData?.data || [], [departmentsData]);

  const watchedWarehouseId = useWatch({
    control: form.control,
    name: 'warehouseId',
  });

  const { data: inventoryData, isLoading: isLoadingItems, error: errorItems } = useWarehouseInventory(
    watchedWarehouseId,
    { enabled: !!watchedWarehouseId }
  ); const { data: allItemsData } = useItems();
  const allItems = allItemsData?.data || [];

  const items = useMemo<ScopedItem[]>(() => {
    return (inventoryData?.data || []).map((b) => ({
      id: b.itemId,
      code: b.itemCode,
      barcode: b.itemCode,
      name: b.itemName,
      qtyAvailable: b.qtyAvailable,
      categoryId: '',
      primaryUom: { id: '', code: b.uomCode || '', name: '' },
      uomConversions: [],
      trackLots: false,
      minStockLevel: 0,
      reorderPoint: b.reorderPoint || 0,
      isActive: true,
      image: b.image || null,
    }));
  }, [inventoryData]);

  const [prevWarehouseId, setPrevWarehouseId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (watchedWarehouseId) {
      if (prevWarehouseId !== undefined && prevWarehouseId !== watchedWarehouseId) {
        const currentItems = form.getValues('items') || [];
        if (currentItems.length > 0) {
          form.setValue('items', [], { shouldDirty: true, shouldValidate: true });
        }
      }
      setPrevWarehouseId(watchedWarehouseId);
    } else {
      const currentItems = form.getValues('items') || [];
      if (currentItems.length > 0) {
        form.setValue('items', [], { shouldDirty: true, shouldValidate: true });
      }
      setPrevWarehouseId(undefined);
    }
  }, [watchedWarehouseId, prevWarehouseId, form]);

  const createRequest = useCreateKitchenRequest();
  const updateStatus = useUpdateKitchenRequestStatus();

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items"
  });

  const watchedItems = useWatch({
    control: form.control,
    name: "items",
  });

  const extraColumns = useMemo(() => [
    {
      header: tCommon('notes'),
      cell: (line: KitchenRequestFormLineItem) => (
        <KitchenRequestNotesCell
          value={watchedItems?.[line.index]?.notes || ''}
          onChange={(val) => form.setValue(`items.${line.index}.notes`, val, { shouldDirty: true, shouldValidate: true })}
          placeholder={t('line_notes_placeholder')}
          disabled={form.formState.isSubmitting}
        />
      )
    }
  ], [t, tCommon, form.setValue, form.formState.isSubmitting, watchedItems]);

  // Derive assigned warehouses and departments from user scopes
  const assignedWarehouseIds = useMemo(() => {
    if (!user?.scopes) return null;
    const ids = user.scopes.map(s => s.warehouseId).filter(Boolean) as string[];
    return ids.length > 0 ? ids : null;
  }, [user?.scopes]);

  const assignedDepartmentIds = useMemo(() => {
    if (!user?.scopes) return null;
    const ids = user.scopes.map(s => s.departmentId).filter(Boolean) as string[];
    return ids.length > 0 ? ids : null;
  }, [user?.scopes]);

  const isScopeless = user?.role ? ['ADMIN', 'GM', 'INV_MGR', 'AUDITOR', 'VIEWER'].includes(user.role) : false;
  const hasNoScope = !isScopeless && assignedWarehouseIds === null && assignedDepartmentIds === null;

  // Filter and map warehouses/departments/items using centralized mappers
  const warehouseItems = useMemo(() => {
    const filtered = !assignedWarehouseIds
      ? warehouses
      : warehouses.filter(w => assignedWarehouseIds.includes(w.id));
    return filtered.map(w => mapWarehouseToCombobox(w));
  }, [warehouses, assignedWarehouseIds]);

  const departmentItems = useMemo(() => {
    const filtered = !assignedDepartmentIds
      ? departmentsList
      : departmentsList.filter(d => assignedDepartmentIds.includes(d.id));
    return filtered.map(d => ({
      id: d.id,
      name: d.name || '',
      code: d.code,
    }));
  }, [departmentsList, assignedDepartmentIds]);

  useEffect(() => {
    if (departmentItems.length === 1) {
      const singleDept = departmentItems[0];
      if (form.getValues('departmentId') !== String(singleDept.id)) {
        form.setValue('departmentId', String(singleDept.id), { shouldValidate: true });
      }
    }
  }, [departmentItems, form]);

  const itemItems = useMemo(() => {
    return items.map((item) => {
      const balanceText = item.qtyAvailable > 0
        ? `${locale === 'ar' ? 'المتاح' : 'Available'}: ${item.qtyAvailable} ${item.primaryUom?.code || ''}`
        : (locale === 'ar' ? 'غير متوفر' : 'Out of Stock');
      return {
        id: item.id,
        name: `${item.name} - ${balanceText}`,
        code: item.code,
        barcode: item.barcode,
      };
    });
  }, [items, locale]);

  const handleScan = (barcode: string) => {
    const matchedItem = allItems?.find(i => i.barcode === barcode || i.code === barcode);
    if (matchedItem) {
      const isAvailableInWarehouse = items?.some(i => i.id === matchedItem.id);
      if (!isAvailableInWarehouse) {
        toast.error(locale === 'ar' ? 'الصنف غير موجود أو غير متوفر في هذا المستودع' : 'Item not available in this warehouse');
        return;
      }
      const existingIndex = watchedItems?.findIndex(i => i?.itemId === matchedItem.id) ?? -1;
      if (existingIndex !== -1) {
        const currentQty = form.getValues(`items.${existingIndex}.quantity`) || 0;
        form.setValue(`items.${existingIndex}.quantity`, currentQty + 1, { shouldDirty: true, shouldValidate: true });
      } else {
        append({ itemId: matchedItem.id, quantity: 1, notes: '' });
      }
      toast.success(locale === 'ar' ? `تمت إضافة ${matchedItem.name}` : `Added ${matchedItem.name}`);
    } else {
      toast.error(locale === 'ar' ? 'الصنف غير موجود' : 'Item not found');
    }
  };

  const onSubmit = async (values: KitchenRequestFormValues, isDraft: boolean) => {
    try {
      const data = await createRequest.mutateAsync({ data: { ...values, isDraft } });
      if (!isDraft) {
        await updateStatus.mutateAsync({
          id: data.id,
          status: 'SUBMITTED',
          version: data.version ?? 0,
          headers: { 'X-Idempotency-Key': crypto.randomUUID() },
        });
      }
      form.reset(values);
      guardedRouter.push(`/kitchen-requests/${data.id}`, { skipGuard: true });
    } catch (error) {
      console.error('Failed to submit kitchen request:', error);
    }
  };

  if (isLoadingWarehouses || isLoadingDepartments || isLoadingItems) {
    return <PageSkeleton />;
  }

  if (errorWarehouses || errorDepartments || errorItems) {
    return <ErrorState onRetry={() => window.location.reload()} />;
  }

  if (hasNoScope) {
    return (
      <ErrorState
        title={locale === 'ar' ? 'غير مصرح' : 'Access Denied'}
        message={locale === 'ar' ? 'لم يتم تعيين أي مستودع أو قسم لحسابك. يرجى التواصل مع المسؤول.' : 'No authorized warehouse or department scopes assigned to your account. Please contact your administrator.'}
        onRetry={() => window.location.reload()}
      />
    );
  }

  return (
    <div className="w-full min-w-0 gap-6 flex-1 fade-in space-y-8 mx-auto animate-in slide-in-from-bottom-2 flex flex-col duration-700 max-w-[1200px]">
      <Breadcrumb
        items={[
          { label: tCommon('inventory'), href: '#' },
          { label: t('title'), href: '/kitchen-requests' },
          { label: t('create_new') }
        ]}
      />

      <PageHeader
        title={t('create_new')}
        subtitle={t('new_description')}
      />

      <form className="space-y-8">
        {/* Header Information */}
        <div className="bg-card border border-border shadow-sm p-8 rounded-[2rem] shadow-sm shadow-black/5">

          <div className="col-span-1 md:col-span-6 w-full">
            <label className="text-label-xs font-semibold uppercase text-muted-foreground/60 mb-3 flex items-center gap-2">
              <Building2 className="w-3.5 h-3.5" />
              {t('department')}
            </label>
            <SmartCombobox
              items={departmentItems}
              value={form.watch('departmentId')}
              onSelect={(dept) => form.setValue('departmentId', String(dept.id), { shouldValidate: true })}
              getPrimaryLabel={(dept) => dept.name}
              placeholder={tCommon('select_department')}
              triggerClassName="w-full bg-gray-50 border border-gray-200 text-[#0B1220] dark:bg-surface-container-high/30 dark:border-none h-14 px-6 text-body-md font-bold rounded-2xl focus:ring-2 focus:ring-primary/20"
            />
            {form.formState.errors.departmentId && (
              <p className="text-label-xs font-bold text-red-500 uppercase px-2">{t('validation.department_required')}</p>
            )}
          </div>

          <div className="col-span-1 md:col-span-6 w-full">
            <label className="text-label-xs font-semibold uppercase text-muted-foreground/60 mb-3 flex items-center gap-2">
              <Warehouse className="w-3.5 h-3.5" />
              {t('warehouse')}
            </label>
            <SmartCombobox
              items={warehouseItems}
              value={form.watch('warehouseId')}
              onSelect={(w) => form.setValue('warehouseId', String(w.id), { shouldValidate: true })}
              getPrimaryLabel={(w) => w.name}
              placeholder={tCommon('select_warehouse')}
              triggerClassName="w-full bg-gray-50 border border-gray-200 text-[#0B1220] dark:bg-surface-container-high/30 dark:border-none h-14 px-6 text-body-md font-bold rounded-2xl focus:ring-2 focus:ring-primary/20"
            />
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
              className="bg-gray-50 border border-gray-200 text-[#0B1220] dark:bg-surface-container-high/30 dark:border-none h-14 px-6 text-body-md font-bold rounded-2xl focus:ring-2 focus:ring-primary/20 w-full"
            />
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

          {/* Input Bars (Scanning + Combobox) */}
          <div className="mb-6 w-full grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <div className="space-y-2">
              <label className="text-label-xs font-semibold uppercase text-muted-foreground/40 ms-1 whitespace-nowrap block">
                {locale === 'ar' ? 'مسح الباركود' : 'Barcode Scanner'}
              </label>
              <ScanInput
                onScan={handleScan}
                placeholder={
                  !watchedWarehouseId
                    ? (locale === 'ar' ? 'يرجى تحديد المستودع أولاً...' : 'Please select a Warehouse first...')
                    : (locale === 'ar' ? 'امسح باركود الصنف...' : "Scan item barcode...")
                }
                className="w-full"
                scannerMode={true}
                size="lg"
                disabled={!watchedWarehouseId || isLoadingItems}
              />
            </div>
            <div className="space-y-2">
              <label className="text-label-xs font-semibold uppercase text-muted-foreground/40 ms-1 whitespace-nowrap block">
                {locale === 'ar' ? 'البحث عن صنف' : 'Search / Add Item'}
              </label>
              <SmartCombobox
                items={itemItems}
                disabled={!watchedWarehouseId || isLoadingItems}
                onSelect={(item) => {
                  const existingIndex = watchedItems?.findIndex(i => i?.itemId === String(item.id)) ?? -1;
                  if (existingIndex !== -1) {
                    const currentQty = form.getValues(`items.${existingIndex}.quantity`) || 0;
                    form.setValue(`items.${existingIndex}.quantity`, currentQty + 1, { shouldDirty: true, shouldValidate: true });
                  } else {
                    append({ itemId: String(item.id), quantity: 1, notes: '' });
                  }
                }}
                getPrimaryLabel={(item) => item.name}
                placeholder={tCommon('select_item')}
                triggerClassName="bg-background border border-border shadow-sm h-[52px] px-4 rounded-xl text-label-xs font-semibold focus-visible:ring-operational-cyan/30 w-full"
              />
            </div>
          </div>

          <div className="space-y-4">
            {fields.length === 0 ? (
              <div className="py-16 text-center bg-card border border-border shadow-sm rounded-[2rem]">
                <ListFilter className="w-10 h-10 text-muted-foreground/10 mx-auto mb-4" />
                <p className="text-label-xs font-semibold text-muted-foreground/30 uppercase">{t('validation.items_required')}</p>
              </div>
            ) : (
              <>
                <div className="hidden md:block bg-card border border-border shadow-sm/30 rounded-[2rem] border border-white/5 overflow-hidden">
                  <DocumentLineItemTable<KitchenRequestFormLineItem>
                    lines={fields.map((field, index) => {
                      const selectedItemId = watchedItems?.[index]?.itemId;
                      const selectedItem = items?.find(i => i.id === selectedItemId);
                      return {
                        id: field.id,
                        item: {
                          id: selectedItemId || '',
                          code: selectedItem?.barcode || '',
                          name: selectedItem?.name || '',
                          image: selectedItem?.image || null,
                          primaryUom: { code: selectedItem?.primaryUom?.code || '' }
                        },
                        qty: watchedItems?.[index]?.quantity ?? 1,
                        uomId: '',
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
                      <div className="flex flex-col items-center gap-1 min-w-0">
                        <div className="flex justify-center">
                          <QuantityInput
                            value={form.watch(`items.${line.index}.quantity`)}
                            onChange={(val) => {
                              form.setValue(`items.${line.index}.quantity`, val === '' ? 0 : val, { shouldDirty: true, shouldValidate: true });
                            }}
                            disabled={form.formState.isSubmitting}
                            className="w-full text-center font-black text-lg bg-white dark:bg-[#1A2234] border border-[#b48e67]/40 text-[#0B1220] dark:text-white focus:border-[#b48e67] focus:ring-1 focus:ring-[#b48e67] rounded-lg outline-none transition-all"
                          />
                        </div>
                        {form.formState.errors.items?.[line.index]?.quantity && (
                          <p className="text-label-xxs font-bold text-red-500 uppercase text-center mt-1">{t('validation.qty_positive')}</p>
                        )}
                      </div>
                    )}
                    renderUom={(line) => (
                      <span className="text-label-xs font-semibold text-muted-foreground/40 uppercase">
                        {line.selectedItem?.primaryUom?.code || '---'}
                      </span>
                    )}
                    extraColumns={extraColumns}
                  />
                </div>

                {/* Mobile Card Protocol */}
                <div className="flex flex-col gap-3 md:hidden">
                  {fields.map((field, index) => {
                    const selectedItemId = watchedItems?.[index]?.itemId;
                    const selectedItem = items?.find(i => i.id === selectedItemId);
                    if (!selectedItem) return null;
                    return (
                      <div key={field.id} className="bg-white dark:bg-[#1A2234] border border-gray-200 dark:border-gray-800 rounded-xl p-3 shadow-sm relative animate-in fade-in duration-200">
                        <button
                          type="button"
                          onClick={() => remove(index)}
                          className="absolute top-3 left-3 rtl:left-auto rtl:right-3 p-1.5 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-md hover:bg-red-100 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                        <div className="flex gap-3 items-center pl-8 rtl:pl-0 rtl:pr-8 border-b border-gray-100 dark:border-gray-800 pb-2 mb-2">
                          {selectedItem.image ? (
                            <img src={selectedItem.image} alt={selectedItem.name} className="w-10 h-10 object-cover rounded-md border border-border shrink-0" />
                          ) : (
                            <div className="w-10 h-10 bg-surface-container flex items-center justify-center rounded-md border border-border text-[9px] text-muted-foreground font-mono shrink-0">
                              N/A
                            </div>
                          )}
                          <div className="flex flex-col min-w-0">
                            <span className="text-sm font-black text-[#0B1220] dark:text-white truncate block">{selectedItem.name}</span>
                            <span className="text-[10px] text-gray-400 font-mono tracking-widest block">{selectedItem.code || '---'}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 mb-2">
                          <div className="flex-1">
                            <label className="text-[10px] font-bold text-gray-500 mb-1 block">الكمية</label>
                            <div className="flex items-center gap-2">
                              <QuantityInput
                                value={form.watch(`items.${index}.quantity`)}
                                onChange={(val) => {
                                  form.setValue(`items.${index}.quantity`, val === '' ? 0 : val, { shouldDirty: true, shouldValidate: true });
                                }}
                                disabled={form.formState.isSubmitting}
                                className="w-full text-center font-black text-lg bg-white dark:bg-[#1A2234] border border-[#b48e67]/40 text-[#0B1220] dark:text-white focus:border-[#b48e67] focus:ring-1 focus:ring-[#b48e67] rounded-lg outline-none transition-all"
                              />
                              <span className="text-xs font-bold text-gray-500 px-2">{selectedItem.primaryUom?.code || '---'}</span>
                            </div>
                            {form.formState.errors.items?.[index]?.quantity && (
                              <p className="text-label-xxs font-bold text-red-500 uppercase mt-1">{t('validation.qty_positive')}</p>
                            )}
                          </div>
                        </div>
                        <div>
                          <Input
                            type="text"
                            placeholder="ملاحظات السطر..."
                            {...form.register(`items.${index}.notes`)}
                            className="w-full text-xs p-2 bg-gray-50 dark:bg-[#0B1220] border border-gray-200 dark:border-gray-800 rounded-md focus:border-gray-400 dark:focus:border-gray-600 outline-none font-medium text-foreground placeholder:text-muted-foreground/50"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="w-full flex items-center justify-end gap-4 mt-8 pt-6 border-t border-border">
          <Button
            type="button"
            variant="outline"
            onClick={form.handleSubmit((data) => onSubmit(data, true), onFormError)}
            isLoading={createRequest.isPending}
            disabled={updateStatus.isPending}
            className="h-10 px-8 bg-transparent border border-border text-foreground text-label-xs font-semibold uppercase rounded-md hover:bg-muted dark:hover:bg-neutral-900 transition-all shadow-sm"
          >
            <Save className="w-4 h-4 me-2" />
            {t('save_draft')}
          </Button>
          <Button
            type="button"
            onClick={form.handleSubmit((data) => onSubmit(data, false), onFormError)}
            isLoading={createRequest.isPending || updateStatus.isPending}
            className="h-10 px-8 bg-[#0B1220] dark:bg-[#b48e67] text-white dark:text-[#0B1220] font-bold rounded-lg shadow-sm hover:opacity-90 flex items-center gap-2 transition-opacity"
          >
            <Send className="w-4 h-4 me-2" />
            {t('submit')}
          </Button>
        </div>
      </form>
    </div>
  );
}
