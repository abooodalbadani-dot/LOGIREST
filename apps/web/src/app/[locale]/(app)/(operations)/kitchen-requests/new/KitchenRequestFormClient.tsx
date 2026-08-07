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
import { Badge } from '@/components/ui/badge';
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
  ListFilter,
  Trash2,
  ScanLine,
  Camera
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CameraBarcodeScanner } from '@/components/shared/CameraBarcodeScanner';
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
import { getAvailableUomsForItem, resolveUomCode, handleUomChange } from '@/utils/uom-helper';
import { resolveBarcodeAndUom } from '@/utils/barcode-resolver';
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
        className="w-full bg-background border border-border text-foreground text-sm placeholder-muted-foreground/50 focus:border-primary focus:ring-1 focus:ring-primary/20 rounded-md outline-none transition-all h-9 px-3"
      />
    </div>
  );
}

export function KitchenRequestFormClient({ locale }: { locale: 'ar' | 'en' }) {
  const t = useTranslations('operations.kitchen_request');
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const tCommon = useTranslations('common');

  const form = useForm<KitchenRequestFormValues>({
    resolver: zodResolver(KitchenRequestSchema),
    defaultValues: {
      departmentId: '',
      warehouseId: '',
      notes: '',
      items: [],
    }
  });

  const { router: guardedRouter } = useUnsavedChangesGuard(form.formState.isDirty);

  const { user } = useAuth();

  const { data: warehousesData, isLoading: isLoadingWarehouses, error: errorWarehouses } = useWarehouses({ ignoreScope: true });
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
    return (inventoryData?.data || []).map((b) => {
      const fullItem = allItems.find((i) => i.id === b.itemId);
      return {
        id: b.itemId,
        code: b.itemCode,
        barcode: b.itemCode,
        name: b.itemName,
        qtyAvailable: b.qtyAvailable,
        categoryId: '',
        primaryUom: fullItem?.primaryUom || { id: b.uomId || b.primaryUom?.id || '', code: b.uomCode || '', name: '' },
        uomConversions: fullItem?.uomConversions || [],
        trackLots: false,
        minStockLevel: 0,
        reorderPoint: b.reorderPoint || 0,
        isActive: true,
        image: b.image || null,
      };
    });
  }, [inventoryData, allItems]);

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
    const filtered = !assignedWarehouseIds || isScopeless
      ? warehouses
      : warehouses.filter(w => assignedWarehouseIds.includes(w.id));
    return filtered.map(w => mapWarehouseToCombobox(w));
  }, [warehouses, assignedWarehouseIds, isScopeless]);

  const departmentItems = useMemo(() => {
    const filtered = !assignedDepartmentIds || isScopeless
      ? departmentsList
      : departmentsList.filter(d => assignedDepartmentIds.includes(d.id));
    return filtered.map(d => ({
      id: d.id,
      name: d.name || '',
      code: d.code,
    }));
  }, [departmentsList, assignedDepartmentIds, isScopeless]);

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

  const handleScan = async (barcode: string) => {
    const resolved = await resolveBarcodeAndUom(barcode, allItems);
    if (resolved) {
      const { item: resolvedItem, uomId: scannedUomId } = resolved;
      const matchedItem = allItems?.find(i => i.id === resolvedItem.id) || (resolvedItem as unknown as Item);
      const scopedItem = items?.find(i => i.id === matchedItem.id);
      if (!scopedItem) {
        toast.error(locale === 'ar' ? 'الصنف غير موجود أو غير متوفر في هذا المستودع' : 'Item not available in this warehouse');
        return;
      }
      const targetUomId = scannedUomId || scopedItem.primaryUom?.id || matchedItem.primaryUom?.id || '';
      const existingIndex = watchedItems?.findIndex(i => i?.itemId === matchedItem.id && (i?.uomId === targetUomId || !i?.uomId)) ?? -1;
      if (existingIndex !== -1) {
        const currentQty = form.getValues(`items.${existingIndex}.quantity`) || 0;
        form.setValue(`items.${existingIndex}.quantity`, currentQty + 1, { shouldDirty: true, shouldValidate: true });
        if (targetUomId) {
          form.setValue(`items.${existingIndex}.uomId`, targetUomId, { shouldDirty: true });
        }
      } else {
        append({ itemId: matchedItem.id, quantity: 1, uomId: targetUomId, notes: '' });
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
        <div className="bg-card/80 backdrop-blur-xl border border-border/50 shadow-2xl p-4 sm:p-6 md:p-8 rounded-[2rem] space-y-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-card pointer-events-none" />
          <div className="relative grid grid-cols-2 gap-4">
            <div className="w-full space-y-2">
              <label className="text-label-xs font-semibold uppercase text-muted-foreground tracking-wider flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary" />
                {t('department')}
              </label>
              <SmartCombobox
                items={departmentItems}
                value={form.watch('departmentId')}
                onSelect={(dept) => form.setValue('departmentId', String(dept.id), { shouldValidate: true })}
                getPrimaryLabel={(dept) => dept.name}
                getSecondaryLabel={() => undefined}
                placeholder={tCommon('select_department')}
                triggerClassName="w-full bg-background/50 border border-border/50 text-foreground rounded-xl shadow-inner h-11 md:h-11 px-3 md:px-4  text-label-xs font-semibold uppercase focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
              />
              {form.formState.errors.departmentId && (
                <p className="text-label-xs font-bold text-red-500 uppercase px-2">{t('validation.department_required')}</p>
              )}
            </div>

            <div className="w-full space-y-2">
              <label className="text-label-xs font-semibold uppercase text-muted-foreground tracking-wider flex items-center gap-2">
                <Warehouse className="w-4 h-4 text-primary" />
                {t('warehouse')}
              </label>
              <Select
                value={form.watch('warehouseId') || ''}
                onValueChange={(val) => form.setValue('warehouseId', val || '', { shouldValidate: true })}
              >
                <SelectTrigger className="w-full bg-background/50 border border-border/50 text-foreground rounded-xl shadow-inner h-11 md:h-11 px-3 md:px-4 text-label-xs font-semibold uppercase focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all">
                  <SelectValue placeholder={tCommon('select_warehouse')}>
                    {(() => {
                      const selected = warehouseItems.find(w => String(w.id) === form.watch('warehouseId'));
                      if (!selected) return null;
                      return (
                        <div className="flex items-center gap-2 flex-1 min-w-0 overflow-hidden w-full">
                          <span className="truncate text-right flex-1 min-w-0">{selected.name}</span>
                          <Badge className="hidden md:inline-flex shrink-0 text-[10px]" variant="secondary">{selected.code || `WH-${selected.id}`}</Badge>
                        </div>
                      );
                    })()}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {warehouseItems.map(w => (
                    <SelectItem key={w.id} value={String(w.id)}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.warehouseId && (
                <p className="text-label-xs font-bold text-red-500 uppercase px-2">{t('validation.warehouse_required')}</p>
              )}
            </div>
          </div>

          <div className="relative w-full space-y-2">
            <label className="text-label-xs font-semibold uppercase text-muted-foreground tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              {tCommon('notes')}
            </label>
            <Input
              {...form.register('notes')}
              placeholder={t('notes_placeholder')}
              className="w-full bg-card focus:bg-card border border-border text-foreground rounded-md shadow-inner h-9 md:h-11 px-3 md:px-4 text-label-xs font-semibold uppercase focus:ring-2 focus:border-brand-gold transition-all placeholder:text-muted-foreground/50"
            />
          </div>
        </div>

        {/* Line Items */}
        <div className="space-y-6">
          <div className="flex items-center justify-between px-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-bg-card/20 to-transparent border border-primary/20 text-primary shadow-lg shadow-primary/10">
                <Calculator className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-label-sm font-semibold uppercase text-foreground tracking-wide font-display">{t('items')}</h3>
                <p className="text-label-xxs font-semibold text-primary/70 uppercase mt-1 tracking-wider">{t('specify_components')}</p>
              </div>
            </div>
          </div>

          {/* Input Bars (Scanning + Combobox) */}
          <div className="mb-6 w-full grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <div className="space-y-2">
              <label className="text-label-xs font-semibold uppercase text-muted-foreground tracking-wider ms-1 whitespace-nowrap block">
                {locale === 'ar' ? 'مسح الباركود' : 'Barcode Scanner'}
              </label>
              <div className="flex items-center gap-2 border border-border/50 rounded-xl px-3 h-11 md:h-11 w-full bg-background/50 shadow-inner focus-within:ring-2 focus-within:ring-primary/40 focus-within:border-primary transition-all">
                <ScanLine className="w-4 h-4 text-primary shrink-0" />
                <input
                  type="text"
                  placeholder={
                    !watchedWarehouseId
                      ? (locale === 'ar' ? 'يرجى تحديد المستودع أولاً...' : 'Please select a Warehouse first...')
                      : (locale === 'ar' ? 'امسح باركود الصنف...' : "Scan item barcode...")
                  }
                  className="flex-1 bg-transparent border-none outline-none focus:ring-0 text-label-xs font-semibold uppercase text-foreground placeholder:text-muted-foreground min-w-0"
                  dir="rtl"
                  disabled={!watchedWarehouseId || isLoadingItems}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleScan(e.currentTarget.value);
                      e.currentTarget.value = '';
                    }
                  }}
                />
                <Camera
                  onClick={() => {
                    if (!watchedWarehouseId) {
                      toast.error(locale === 'ar' ? 'يرجى تحديد المستودع أولاً' : 'Please select a Warehouse first');
                      return;
                    }
                    setIsCameraOpen(true);
                  }}
                  className="w-4 h-4 text-primary hover:text-foreground transition-colors shrink-0 cursor-pointer"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-label-xs font-semibold uppercase text-muted-foreground tracking-wider ms-1 whitespace-nowrap block">
                {locale === 'ar' ? 'البحث عن صنف' : 'Search / Add Item'}
              </label>
              <SmartCombobox
                items={itemItems}
                disabled={!watchedWarehouseId || isLoadingItems}
                onSelect={(item) => {
                  const selectedScopedItem = items?.find(i => i.id === String(item.id));
                  const existingIndex = watchedItems?.findIndex(i => i?.itemId === String(item.id)) ?? -1;
                  if (existingIndex !== -1) {
                    const currentQty = form.getValues(`items.${existingIndex}.quantity`) || 0;
                    form.setValue(`items.${existingIndex}.quantity`, currentQty + 1, { shouldDirty: true, shouldValidate: true });
                  } else {
                    append({ itemId: String(item.id), quantity: 1, uomId: selectedScopedItem?.primaryUom?.id || '', notes: '' });
                  }
                }}
                getPrimaryLabel={(item) => item.name}
                placeholder={tCommon('select_item')}
                triggerClassName="w-full bg-background/50 border border-border/50 text-foreground rounded-xl shadow-inner h-11 md:h-11 px-3 md:px-4 text-label-xs font-semibold uppercase focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all placeholder:text-muted-foreground/50"
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
                      const currentUomId = watchedItems?.[index]?.uomId || selectedItem?.primaryUom?.id || '';
                      return {
                        id: field.id,
                        item: {
                          id: selectedItemId || '',
                          code: selectedItem?.barcode || '',
                          name: selectedItem?.name || '',
                          image: selectedItem?.image || null,
                          primaryUom: { id: selectedItem?.primaryUom?.id || '', code: selectedItem?.primaryUom?.code || '' },
                          uomConversions: selectedItem?.uomConversions || [],
                        },
                        qty: watchedItems?.[index]?.quantity ?? 1,
                        uomId: currentUomId,
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
                      <div className="flex flex-col items-center justify-center gap-1 w-full">
                        <div className="flex justify-center w-full">
                          <QuantityInput
                            value={form.watch(`items.${line.index}.quantity`)}
                            onChange={(val) => {
                              form.setValue(`items.${line.index}.quantity`, val === '' ? 0 : val, { shouldDirty: true, shouldValidate: true });
                            }}
                            disabled={form.formState.isSubmitting}
                            className="w-24 max-w-[100px] text-center font-black text-lg bg-background border border-input text-foreground focus:border-primary focus:ring-1 focus:ring-primary rounded-md outline-none transition-all mx-auto"
                          />
                        </div>
                        {form.formState.errors.items?.[line.index]?.quantity && (
                          <p className="text-label-xxs font-bold text-red-500 uppercase text-center mt-1">{t('validation.qty_positive')}</p>
                        )}
                      </div>
                    )}
                    renderUom={(line) => {
                      const availableUoms = getAvailableUomsForItem(line.selectedItem);
                      const itemValues = watchedItems?.[line.index] as { uomId?: string } | undefined;
                      const currentUomId = itemValues?.uomId || line.selectedItem?.primaryUom?.id || (availableUoms[0]?.id ? String(availableUoms[0].id) : '');
                      const resolvedCode = resolveUomCode(currentUomId, line.selectedItem);

                      return (
                        <Select
                          value={currentUomId}
                          onValueChange={(val) => {
                            if (val) {
                              form.setValue(`items.${line.index}.uomId`, val, { shouldDirty: true, shouldValidate: true });
                            }
                          }}
                          disabled={form.formState.isSubmitting}
                        >
                          <SelectTrigger className="h-8 min-w-[90px] bg-background border border-input text-foreground rounded-md text-xs font-bold uppercase">
                            <span className="flex-1 text-start truncate font-bold uppercase">
                              {resolvedCode || 'UOM'}
                            </span>
                          </SelectTrigger>
                          <SelectContent>
                            {availableUoms.map((uom) => (
                              <SelectItem key={uom.id} value={String(uom.id)}>
                                {uom.code || uom.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      );
                    }}
                    extraColumns={extraColumns}
                  />
                </div>

                {/* Mobile Card Protocol */}
                <div className="flex flex-col gap-3 md:hidden">
                  {fields.map((field, index) => {
                    const selectedItemId = watchedItems?.[index]?.itemId;
                    const selectedItem = items?.find(i => i.id === selectedItemId);
                    if (!selectedItem) return null;

                    const availableUoms = getAvailableUomsForItem(selectedItem);
                    const itemValues = watchedItems?.[index] as { uomId?: string } | undefined;
                    const currentUomId = itemValues?.uomId || selectedItem?.primaryUom?.id || (availableUoms[0]?.id ? String(availableUoms[0].id) : '');
                    const resolvedCode = resolveUomCode(currentUomId, selectedItem);

                    return (
                      <div
                        key={field.id}
                        className="bg-card dark:bg-card border border-border rounded-xl p-2.5 shadow-sm relative animate-in fade-in duration-200 flex flex-col gap-2"
                      >
                        {/* Header: Image + Item Name + Code on Start side, Delete Button on End side */}
                        <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-2">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            {selectedItem.image ? (
                              <img
                                src={selectedItem.image}
                                alt={selectedItem.name}
                                className="w-8 h-8 object-cover rounded-lg border border-border shrink-0 shadow-sm"
                              />
                            ) : (
                              <div className="w-8 h-8 bg-surface-container flex items-center justify-center rounded-lg border border-border text-[8px] text-muted-foreground font-mono shrink-0">
                                N/A
                              </div>
                            )}
                            <div className="flex flex-col min-w-0 flex-1">
                              <span className="text-xs font-bold text-foreground truncate">
                                {selectedItem.name}
                              </span>
                              <span
                                className="text-[10px] text-muted-foreground truncate max-w-[140px] inline-block font-mono tracking-wider"
                                dir="ltr"
                                title={selectedItem.code || ''}
                              >
                                {selectedItem.code || '---'}
                              </span>
                            </div>
                          </div>

                          {/* Delete Button */}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => remove(index)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10 rounded-lg shrink-0 transition-colors h-7 w-7"
                            aria-label={tCommon('actions.remove_line') || 'Remove'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>

                        {/* QTY & Interactive UOM side-by-side */}
                        <div className="grid grid-cols-2 gap-2 w-full">
                          {/* QTY */}
                          <div className="space-y-0.5">
                            <label className="text-[10px] font-semibold text-muted-foreground block">
                              {locale === 'ar' ? 'الكمية' : 'Qty'}
                            </label>
                            <QuantityInput
                              value={form.watch(`items.${index}.quantity`)}
                              onChange={(val) => {
                                form.setValue(`items.${index}.quantity`, val === '' ? 0 : val, { shouldDirty: true, shouldValidate: true });
                              }}
                              disabled={form.formState.isSubmitting}
                              className="w-full text-center font-bold text-sm h-8 bg-background border border-border text-foreground focus:border-primary focus:ring-1 focus:ring-primary/20 rounded-lg outline-none transition-all"
                            />
                            {form.formState.errors.items?.[index]?.quantity && (
                              <p className="text-[10px] font-bold text-red-500 uppercase mt-0.5">
                                {t('validation.qty_positive')}
                              </p>
                            )}
                          </div>

                          {/* Interactive UOM */}
                          <div className="space-y-0.5">
                            <label className="text-[9px] font-semibold text-muted-foreground block">
                              {tCommon('table_headers.uom') || 'UOM'}
                            </label>
                            <Select
                              value={currentUomId}
                              onValueChange={(val) => {
                                if (val) {
                                  form.setValue(`items.${index}.uomId`, val, { shouldDirty: true, shouldValidate: true });
                                }
                              }}
                              disabled={form.formState.isSubmitting}
                            >
                              <SelectTrigger className="w-full h-8 bg-background border border-border rounded-lg text-xs font-bold uppercase text-foreground">
                                <span className="flex-1 text-start truncate font-bold uppercase">
                                  {resolvedCode || 'UOM'}
                                </span>
                              </SelectTrigger>
                              <SelectContent>
                                {availableUoms.map((uom) => (
                                  <SelectItem key={uom.id} value={String(uom.id)}>
                                    {uom.code || uom.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Full-width Line Notes below QTY/UOM */}
                        <div className="w-full space-y-0.5">
                          <label className="text-[10px] font-semibold text-muted-foreground block">
                            {tCommon('notes') || (locale === 'ar' ? 'الملاحظات' : 'Notes')}
                          </label>
                          <Input
                            type="text"
                            placeholder={locale === 'ar' ? 'ملاحظات السطر...' : 'Line notes...'}
                            {...form.register(`items.${index}.notes`)}
                            disabled={form.formState.isSubmitting}
                            className="w-full h-10 bg-background border border-border text-foreground text-xs placeholder:text-muted-foreground/50 focus:border-primary focus:ring-1 focus:ring-primary/20 rounded-lg outline-none transition-all h-8 px-2.5"
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

        {/* Desktop Footer (md:flex) */}
        <div className="w-full hidden md:flex items-center justify-end gap-4 mt-8 pt-6 border-t border-border">
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

        {/* Mobile Footer */}
        <div className="flex flex-col gap-3 w-full md:hidden mt-6 pb-6">
          <Button className="w-full" size="lg" onClick={form.handleSubmit((data) => onSubmit(data, false), onFormError)} isLoading={createRequest.isPending || updateStatus.isPending}>إرسال للاعتماد</Button>
          <Button className="w-full" size="lg" variant="outline" onClick={form.handleSubmit((data) => onSubmit(data, true), onFormError)} isLoading={createRequest.isPending} disabled={updateStatus.isPending}>
            <Save className="w-4 h-4 mr-2" />
            حفظ مسودة
          </Button>
        </div>
      </form>

      <Dialog open={isCameraOpen} onOpenChange={setIsCameraOpen}>
        <DialogContent className="max-w-full p-4">
          <DialogHeader>
            <DialogTitle>{locale === 'ar' ? 'مسح الباركود بالكاميرا' : 'Camera Barcode Scanner'}</DialogTitle>
          </DialogHeader>
          {isCameraOpen && (
            <CameraBarcodeScanner
              onScanSuccess={(code) => {
                setIsCameraOpen(false);
                handleScan(code);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
