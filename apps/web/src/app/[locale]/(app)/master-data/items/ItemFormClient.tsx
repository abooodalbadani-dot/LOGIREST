'use client';

import { useEffect, useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useForm, useFieldArray, Controller, useWatch, type FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Package, Plus, Trash2, ShieldCheck, Scale, Boxes, Settings2, Edit3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Camera, ScanLine } from 'lucide-react';
import { SmartCombobox } from '@/components/shared/SmartCombobox';
import { Card, CardContent } from '@/components/ui/card';
import { useItem, useCreateItem, useUpdateItem, useDeleteItem, useNextItemCode } from '@/features/items/hooks/useItems';
import { useCategories } from '@/features/categories/hooks/useCategories';
import { useMasterDataList } from '@/features/master-data/hooks/useMasterDataCRUD';
import { ItemFormSchema, type ItemFormValues, UoMSchema, type Category, type UoMConversion } from '@/types/master-data';
import { useConflictHandler } from '@/core/concurrency/useConflictHandler';
import { ConflictDialog } from '@/core/concurrency/ConflictDialog';
import { ScanInput } from '@/components/shared/ScanInput/ScanInput';
import { MasterDataFormLayout } from '@/features/master-data/components/MasterDataFormLayout';
import { CameraBarcodeScanner } from '@/components/shared/CameraBarcodeScanner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { audioAlerts } from '@/utils/audio';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { ErrorState } from '@/components/shared/ErrorState';
import { useUnsavedChangesGuard } from '@/lib/unsaved-changes/useUnsavedChangesGuard';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { PostConfirmDialog } from '@/components/shared/PostConfirmDialog';
import { toast } from 'sonner';
import { useAbortController } from '@/hooks/useAbortController';
import { useAudioFeedback } from '@/hooks/useAudioFeedback';
import { onFormError } from '@/hooks/useFormError';


interface Props {
  id: string | null;
  createTitle: string;
  editTitle: string;
  viewTitle: string;
  locale: string;
  isReadOnly?: boolean;
}

export function ItemFormClient({ id, createTitle, editTitle, viewTitle, locale, isReadOnly = false }: Props) {
  const t = useTranslations('common');
  const tm = useTranslations('master_data.common');
  const ti = useTranslations('master_data.items');
  const tv = useTranslations();
  const abortController = useAbortController();

  const { data, isLoading, isError, isFetched, refetch } = useItem(id);
  const { data: categories, isLoading: isLoadingCats, isError: isErrorCats } = useCategories();
  const { data: uoms, isLoading: isLoadingUoms, isError: isErrorUoms } = useMasterDataList('units-of-measure', UoMSchema);

  const { data: nextCodeData } = useNextItemCode();
  const create = useCreateItem();
  const conflict = useConflictHandler('item', id ?? '');
  const update = useUpdateItem({ onConflict: conflict.triggerConflict });
  const deleteMutation = useDeleteItem();
  const { playSound } = useAudioFeedback();

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isAutoPopulated, setIsAutoPopulated] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  const { register, handleSubmit, reset, setValue, control, formState: { errors, isDirty, isValid } } =
    useForm<ItemFormValues>({
      resolver: zodResolver(ItemFormSchema),
      disabled: isReadOnly,
      defaultValues: {
        code: '', barcode: '', name: '', categoryId: '', primaryUomId: '',
        trackLots: false, minStockLevel: 0, reorderPoint: 0, uomConversions: [], isActive: true,
        version: undefined, image: '',
      },
    });

  const { router: guardedRouter } = useUnsavedChangesGuard(isDirty);

  const { fields, append, remove } = useFieldArray({ control, name: 'uomConversions' });

  useEffect(() => {
    if (data) {
      reset({
        code: data.code, barcode: data.barcode, name: data.name,
        categoryId: data.categoryId || '', primaryUomId: data.primaryUom?.id || '',
        trackLots: data.trackLots, minStockLevel: data.minStockLevel,
        reorderPoint: data.reorderPoint,
        uomConversions: (data.uomConversions || []).map((c: UoMConversion) => ({
          fromUomId: c.fromUomId, toUomId: c.toUomId, factor: c.factor,
        })),
        isActive: data.isActive,
        version: data.version,
        image: data.image || '',
      });
    }
  }, [data, reset]);

  const codeValue = useWatch({ control, name: 'code' });
  const currentBarcode = useWatch({ control, name: 'barcode' });

  useEffect(() => {
    if (!id && nextCodeData?.nextCode && !isDirty) {
      setValue('code', nextCodeData.nextCode, { shouldDirty: false, shouldValidate: true });
    }
  }, [id, nextCodeData, setValue, isDirty]);

  const categoryItems = useMemo(() => {
    const list = categories?.data?.map((c: Category) => ({
      id: c.id,
      name_en: c.name,
      name_ar: c.name,
    })) || [];
    return [{ id: '', name_en: tm('select_none'), name_ar: tm('select_none') }, ...list];
  }, [categories?.data, tm]);

  const uomItems = useMemo(() => {
    const list = uoms?.data?.map((u) => ({
      id: u.id,
      name_en: `${u.code} — ${u.name}`,
      name_ar: `${u.code} — ${u.name}`,
    })) || [];
    return [{ id: '', name_en: tm('select_none'), name_ar: tm('select_none') }, ...list];
  }, [uoms?.data, locale, tm]);

  const uomShortItems = useMemo(() => {
    const list = uoms?.data?.map((u) => ({
      id: u.id,
      name_en: u.code,
      name_ar: u.code,
    })) || [];
    return [{ id: '', name_en: tm('select_none'), name_ar: tm('select_none') }, ...list];
  }, [uoms?.data, tm]);

  const onValid = (values: ItemFormValues) => {
    if (isReadOnly) return;

    const payload = {
      code: values.code || undefined,
      barcode: values.barcode,
      name: values.name,
      categoryId: values.categoryId,
      primaryUomId: values.primaryUomId,
      trackLots: values.trackLots,
      minStockLevel: values.minStockLevel,
      reorderPoint: values.reorderPoint,
      uomConversions: values.uomConversions.map((conv) => ({
        fromUomId: conv.fromUomId,
        toUomId: conv.toUomId,
        factor: conv.factor,
      })),
      isActive: values.isActive ?? true,
      image: values.image || null,
    };

    if (id) {
      update.mutate(
        {
          id,
          values: payload,
          version: values.version || undefined,
          signal: abortController.signal
        },
        {
          onSuccess: () => {
            reset(values);
            guardedRouter.push('/master-data/items', { skipGuard: true });
          },
          onError: (error) => {
            console.error('Update failed:', error);
          }
        }
      );
    } else {
      create.mutate(
        {
          ...payload,
          signal: abortController.signal
        },
        {
          onSuccess: () => {
            reset(values);
            guardedRouter.push('/master-data/items', { skipGuard: true });
          },
          onError: (error) => {
            console.error('Create failed:', error);
          }
        }
      );
    }
  };

  const onInvalid = (errors: FieldErrors<ItemFormValues>) => {
    console.log('3. [ItemForm] Validation FAILED (Silent Zod Blocker):', errors);
    onFormError(errors);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error(locale === 'ar' ? 'حجم الصورة يجب أن لا يتجاوز 2 ميجابايت' : 'Image size must be under 2MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setValue('image', reader.result as string, { shouldDirty: true, shouldValidate: true });
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = handleSubmit(onValid, onInvalid);

  const handleDelete = () => {
    if (!id) return;
    deleteMutation.mutate(
      { id, version: data?.version, signal: abortController.signal },
      {
        onSuccess: () => {
          guardedRouter.push('/master-data/items', { skipGuard: true });
        },
        onError: (error) => {
          console.error('Delete failed:', error);
          setDeleteConfirmOpen(false);
        }
      }
    );
  };

  const isSaving = create.isPending || update.isPending;
  const trackLots = useWatch({ control, name: 'trackLots' });
  const isActive = useWatch({ control, name: 'isActive' });

  // 1. Loading State
  if ((id && isLoading) || isLoadingCats || isLoadingUoms) {
    return <PageSkeleton variant="detail" />;
  }

  // 2. Not Found State (Smart 404)
  if (id && isFetched && !data) {
    return (
      <ErrorState
        type="not_found"
        onRetry={() => guardedRouter.push('/master-data/items', { skipGuard: true })}
      />
    );
  }

  // 3. Server Error State
  if (isError || isErrorCats || isErrorUoms) {
    return (
      <ErrorState
        type="server_error"
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <>
      <MasterDataFormLayout
        title={isReadOnly ? viewTitle : (id ? editTitle : createTitle)}
        backHref='/master-data/items'
        onCancel={() => guardedRouter.push('/master-data/items', { skipGuard: true })}
        isSaving={isSaving} saveDisabled={conflict.saveDisabled}
        onSubmit={onSubmit}
        hideSave={isReadOnly}
        resource="master_data_items"
        saveAction={id ? 'edit' : 'create'}
        isDirty={isDirty}
        isValid={isValid}
        headerActions={
          id && (
            <div className="flex gap-4">
              <PermissionGate action="delete" resource="master_data_items">
                <Button
                  variant="ghost"
                  onClick={() => setDeleteConfirmOpen(true)}
                  className="h-12 w-12 rounded-xl bg-status-error/5 hover:bg-status-error/10 text-status-error border-none transition-all"
                  title={t('actions.delete')}
                >
                  <Trash2 className="w-5 h-5" />
                </Button>
              </PermissionGate>

              {isReadOnly && (
                <PermissionGate action="edit" resource="master_data_items">
                  <Button
                    onClick={() => guardedRouter.push(`/master-data/items/${id}/edit`)}
                    className="h-12 px-6 bg-brand-gold text-white hover:bg-brand-gold/90 font-bold rounded-xl flex items-center gap-2 transition-all shadow-sm shadow-brand-gold/20"
                  >
                    <Edit3 className="w-4 h-4" />
                    {t('actions.edit')}
                  </Button>
                </PermissionGate>
              )}
            </div>
          )
        }
      >
        <div dir={locale === 'ar' ? 'rtl' : 'ltr'} className="col-span-12 w-full max-w-5xl mx-auto flex flex-col gap-8 p-6 bg-card border border-border rounded-xl mt-6">
          {/* Main Identity Section */}
          <div className="w-full min-w-0 flex flex-col gap-6">
            <div className="flex items-center gap-2 border-b border-border pb-3 mb-4">
              <Package className="text-muted-foreground w-5 h-5" />
              <h3 className="text-base font-bold text-foreground">{ti('sections.identity')}</h3>
            </div>

            <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="w-full min-w-0 flex flex-col gap-1.5 text-start">
                <Label htmlFor="item-code" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">{tm('code')}</Label>
                <Input
                  id="item-code"
                  dir="ltr"
                  {...register('code')}
                  disabled={isReadOnly}
                  className="font-mono font-semibold uppercase text-status-active w-full h-10"
                  placeholder={ti('fields.sku_placeholder')}
                />
                {errors.code?.message && <p className="text-xs text-red-500 mt-1">{tv(errors.code.message as never)}</p>}
              </div>

              <div className="w-full min-w-0 flex flex-col gap-1.5 text-start">
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">{ti('fields.barcode')}</Label>
                <div className="relative w-full min-w-0">
                  <ScanInput
                    value={currentBarcode}
                    onScan={(val) => setValue('barcode', val, { shouldValidate: true })}
                    placeholder={isReadOnly ? "" : ti('fields.barcode')}
                    disabled={isReadOnly}
                    size="md"
                    actions={
                      !isReadOnly && (
                        <Button
                          type="button"
                          onClick={() => {
                            const generated = 'BAR' + Math.floor(10000000 + Math.random() * 90000000);
                            setValue('barcode', generated, { shouldDirty: true, shouldValidate: true });
                          }}
                          className="h-8 px-4 text-[10px] sm:text-xs bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm font-bold uppercase tracking-wider ml-2"
                        >
                          {locale === 'ar' ? 'توليد' : 'Generate'}
                        </Button>
                      )
                    }
                  />
                  <Input type="hidden" {...register('barcode')} />
                </div>
                {errors.barcode?.message && <p className="text-xs text-red-500 mt-1">{tv(errors.barcode.message as never)}</p>}
              </div>

              <div className="w-full min-w-0 flex flex-col gap-1.5 text-start col-span-1 md:col-span-2">
                <Label htmlFor="item-name" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">{ti('fields.name') || tm('name') || 'Name'}</Label>
                <Input id="item-name" {...register('name')} disabled={isReadOnly} className="font-semibold w-full h-10" />
                {errors.name?.message && <p className="text-xs text-red-500 mt-1">{tv(errors.name.message as never)}</p>}
              </div>

              <div className="w-full min-w-0 flex flex-col gap-1.5 text-start col-span-1 md:col-span-2 mt-2">
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                  {locale === 'ar' ? 'صورة المنتج' : 'Product Image'}
                </Label>
                <div className="flex items-center gap-6 p-4 border border-dashed border-border rounded-xl bg-surface-container-low/40">
                  <div className="w-20 h-20 rounded-lg border border-border bg-surface-container flex items-center justify-center overflow-hidden shrink-0 relative group">
                    <Controller
                      name="image"
                      control={control}
                      render={({ field }) => (
                        <>
                          {field.value ? (
                            <>
                              <img src={field.value} alt="Preview" className="w-full h-full object-cover" />
                              {!isReadOnly && (
                                <button
                                  type="button"
                                  onClick={() => field.onChange('')}
                                  className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold"
                                >
                                  {locale === 'ar' ? 'إزالة' : 'Remove'}
                                </button>
                              )}
                            </>
                          ) : (
                            <span className="text-[10px] text-muted-foreground font-semibold">
                              {locale === 'ar' ? 'لا توجد صورة' : 'No Image'}
                            </span>
                          )}
                        </>
                      )}
                    />
                  </div>
                  {!isReadOnly && (
                    <div className="flex flex-col gap-2">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                        id="product-image-upload"
                      />
                      <Label
                        htmlFor="product-image-upload"
                        className="h-9 px-4 bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-bold rounded-lg flex items-center justify-center cursor-pointer transition-colors shadow-sm w-fit"
                      >
                        {locale === 'ar' ? 'اختر صورة' : 'Choose Image'}
                      </Label>
                      <span className="text-[10px] text-muted-foreground">
                        {locale === 'ar' ? 'الصيغ المدعومة (PNG, JPG, WEBP) بحد أقصى 2 ميجابايت' : 'Supported format (PNG, JPG, WEBP) max 2MB'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Logistics Configuration Section */}
          <div className="w-full min-w-0 flex flex-col gap-6">
            <div className="flex items-center gap-2 border-b border-border pb-3 mb-4">
              <Boxes className="text-muted-foreground w-5 h-5" />
              <h3 className="text-base font-bold text-foreground">{ti('sections.categorization')}</h3>
            </div>

            <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="w-full min-w-0 flex flex-col gap-1.5 text-start">
                <Label htmlFor="item-category" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">{ti('fields.category')}</Label>
                <Controller
                  name="categoryId"
                  control={control}
                  render={({ field }) => (
                    <SmartCombobox
                      disabled={isReadOnly}
                      value={field.value ?? ''}
                      onSelect={(item) => field.onChange(item.id)}
                      items={categoryItems}
                      placeholder={tm('select_none')}
                      className="w-full bg-surface-container-high/40 hover:bg-surface-container-high transition-colors text-label-xs font-bold"
                    />
                  )}
                />
                {errors.categoryId?.message && <p className="text-xs text-red-500 mt-1">{tv(errors.categoryId.message as never)}</p>}
              </div>

              <div className="w-full min-w-0 flex flex-col gap-1.5 text-start">
                <Label htmlFor="primary-uom" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">{ti('fields.base_unit')}</Label>
                <Controller
                  name="primaryUomId"
                  control={control}
                  render={({ field }) => (
                    <SmartCombobox
                      disabled={isReadOnly}
                      value={field.value ?? ''}
                      onSelect={(item) => field.onChange(item.id)}
                      items={uomItems}
                      placeholder={tm('select_none')}
                      className="w-full bg-surface-container-high/40 hover:bg-surface-container-high transition-colors text-label-xs font-bold"
                    />
                  )}
                />
                {errors.primaryUomId?.message && <p className="text-xs text-red-500 mt-1">{tv(errors.primaryUomId.message as never)}</p>}
              </div>
            </div>
          </div>

          {/* Unit Conversion Protocol */}
          <div className="w-full min-w-0 flex flex-col gap-6">
            <div className="flex items-center justify-between border-b border-border pb-3 mb-4 gap-4">
              <div className="flex items-center gap-2">
                <Scale className="text-muted-foreground w-5 h-5" />
                <h3 className="text-base font-bold text-foreground">{ti('uom_conversions')}</h3>
              </div>
              {!isReadOnly && (
                <Button
                  type="button"
                  size="sm"
                  className="gap-2 border-2 border-primary bg-transparent text-primary hover:bg-primary hover:text-primary-foreground font-bold w-fit shadow-sm"
                  onClick={() => append({ fromUomId: '', toUomId: '', factor: 1 })}
                >
                  <Plus className="w-4 h-4" /> {locale === 'ar' ? 'إضافة تحويل' : (ti('add_conversion') || 'Add Conversion')}
                </Button>
              )}
            </div>

            <div className="space-y-4">
              {fields.length === 0 ? (
                <div className="w-full flex flex-col items-center justify-center p-8 bg-muted/20 border border-dashed border-border rounded-xl gap-3 my-2">
                  <Scale className="w-8 h-8 text-muted-foreground" />
                  <p className="text-sm font-medium text-muted-foreground">{ti('no_conversions_defined') || (locale === 'ar' ? 'لا توجد تحويلات معرفة' : 'No conversions defined')}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {fields.map((field, idx) => (
                    <div key={field.id} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_0.5fr_auto] gap-4 items-end p-4 bg-surface-container-highest/20 rounded-md border border-surface-variant/10 transition-all hover:bg-surface-container-highest/30">
                      <div className="col-span-1 w-full min-w-0 flex flex-col gap-1.5 text-start">
                        <Label htmlFor={`uom-from-${idx}`} className="text-label-xs font-semibold uppercase text-muted-foreground/60 ps-1">{ti('from_uom')}</Label>
                        <Controller
                          name={`uomConversions.${idx}.fromUomId`}
                          control={control}
                          render={({ field }) => (
                            <SmartCombobox
                              disabled={isReadOnly}
                              value={field.value ?? ''}
                              onSelect={(item) => field.onChange(item.id)}
                              items={uomShortItems}
                              placeholder={tm('select_none')}
                              className="w-full bg-surface-container-highest/30 border border-outline-low text-label-xs font-bold"
                            />
                          )}
                        />
                      </div>
                      <div className="col-span-1 w-full min-w-0 flex flex-col gap-1.5 text-start">
                        <Label htmlFor={`uom-to-${idx}`} className="text-label-xs font-semibold uppercase text-muted-foreground/60 ps-1">{ti('to_uom')}</Label>
                        <Controller
                          name={`uomConversions.${idx}.toUomId`}
                          control={control}
                          render={({ field }) => (
                            <SmartCombobox
                              disabled={isReadOnly}
                              value={field.value ?? ''}
                              onSelect={(item) => field.onChange(item.id)}
                              items={uomShortItems}
                              placeholder={tm('select_none')}
                              className="w-full bg-surface-container-highest/30 border border-outline-low text-label-xs font-bold"
                            />
                          )}
                        />
                      </div>
                      <div className="col-span-1 w-full min-w-0 flex flex-col gap-1.5 text-start">
                        <Label htmlFor={`uom-factor-${idx}`} className="text-label-xs font-semibold uppercase text-muted-foreground/60 ps-1">{ti('factor')}</Label>
                        <Input id={`uom-factor-${idx}`} type="number" dir="ltr" min={0} step="any"
                          disabled={isReadOnly}
                          className="font-mono font-semibold text-status-secondary w-full h-10"
                          {...register(`uomConversions.${idx}.factor`, { valueAsNumber: true })} />
                      </div>
                      {!isReadOnly && (
                        <Button type="button" variant="ghost" size="icon" className="h-12 w-12 text-rose-500/40 hover:text-rose-500 hover:bg-rose-500/10 transition-all mb-[1px]"
                          onClick={() => remove(idx)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Status & Availability Section */}
          <div className="w-full min-w-0 flex flex-col gap-6">
            <div className="flex items-center gap-2 text-start border-b border-border pb-3 mb-4">
              <ShieldCheck className="text-muted-foreground w-5 h-5" />
              <h3 className="text-base font-bold text-foreground">{tm('status_label')}</h3>
            </div>

            <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="w-full flex items-center justify-between p-4 bg-card border border-border rounded-xl shadow-sm">
                <div className="flex flex-col space-y-1 text-start min-w-0">
                  <span className="text-sm font-medium text-foreground">{tm('status_label')}</span>
                  <span className="text-xs text-muted-foreground">{isActive ? tm('active') : tm('inactive')}</span>
                </div>
                <Controller
                  control={control}
                  name="isActive"
                  render={({ field }) => (
                    <Switch
                      checked={field.value ?? true}
                      onCheckedChange={(v) => !isReadOnly && field.onChange(v)}
                      disabled={isReadOnly}
                    />
                  )}
                />
              </div>

              <div
                className="w-full flex items-center justify-between p-4 bg-card border border-border rounded-xl shadow-sm"
                title={!!(data as { has_transactions?: boolean } | null)?.has_transactions ? 'Cannot change lot tracking after transactions exist.' : undefined}
              >
                <div className="flex flex-col space-y-1 text-start min-w-0">
                  <span className="text-sm font-medium text-foreground">{ti('track_lots')}</span>
                  <span className="text-xs text-muted-foreground">{trackLots ? tm('yes') : tm('no')}</span>
                  {!!(data as { has_transactions?: boolean } | null)?.has_transactions && (
                    <span className="text-[10px] text-status-warning uppercase font-bold mt-1">
                      {ti('lot_tracking_locked') || 'Tracking locked: transactions exist'}
                    </span>
                  )}
                </div>
                <Controller
                  control={control}
                  name="trackLots"
                  render={({ field }) => (
                    <Switch
                      checked={field.value ?? false}
                      onCheckedChange={(v) => {
                        const d = data as { has_transactions?: boolean } | null;
                        if (!isReadOnly && !d?.has_transactions) field.onChange(v);
                      }}
                      disabled={isReadOnly || !!(data as { has_transactions?: boolean } | null)?.has_transactions}
                    />
                  )}
                />
              </div>
            </div>
          </div>

          {/* Inventory Rules Section */}
          <div className="w-full min-w-0 flex flex-col gap-6">
            <div className="flex items-center gap-2 text-start border-b border-border pb-3 mb-4">
              <Settings2 className="text-muted-foreground w-5 h-5" />
              <h3 className="text-base font-bold text-foreground">{ti('sections.inventory_rules')}</h3>
            </div>

            <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="w-full min-w-0 flex flex-col gap-1.5 text-start">
                <Label htmlFor="min-stock" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">{ti('fields.min_stock')}</Label>
                <Input id="min-stock" type="number" dir="ltr" min={0}
                  disabled={isReadOnly}
                  className="font-mono font-semibold text-status-secondary w-full h-10"
                  {...register('minStockLevel', { valueAsNumber: true })} />
              </div>

              <div className="w-full min-w-0 flex flex-col gap-1.5 text-start">
                <Label htmlFor="reorder-point" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">{ti('fields.reorder_point')}</Label>
                <Input id="reorder-point" type="number" dir="ltr" min={0}
                  disabled={isReadOnly}
                  className="font-mono font-semibold text-status-secondary w-full h-10"
                  {...register('reorderPoint', { valueAsNumber: true })} />
              </div>
            </div>
          </div>
        </div>
      </MasterDataFormLayout>

      <ConflictDialog
        open={conflict.open}
        error={conflict.error}
        onReload={conflict.handleReload}
        onClose={conflict.handleClose}
      />

      <PostConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        onConfirm={handleDelete}
        title={ti('delete_confirm_title')}
        description={ti('delete_confirm_desc')}
        confirmText={t('actions.delete')}
        cancelText={t('actions.cancel')}
        isLoading={deleteMutation.isPending}
      />

      <Dialog open={isCameraOpen} onOpenChange={setIsCameraOpen}>
        <DialogContent className="w-[min(440px,95vw)] bg-card border border-border shadow-lg p-0 rounded-2xl overflow-hidden">
          <DialogHeader className="px-6 pt-5 pb-4 border-b border-border">
            <DialogTitle className="text-label-sm font-bold uppercase text-foreground flex items-center gap-2">
              <ScanLine className="w-5 h-5 text-primary shrink-0" />
              {locale === 'ar' ? 'مسح الباركود بالكاميرا' : 'Camera Barcode Scan'}
            </DialogTitle>
          </DialogHeader>
          <div className="w-full">
            {isCameraOpen && (
              <CameraBarcodeScanner
                onScanSuccess={(barcode) => {
                  audioAlerts.playScanSuccess();
                  setValue('barcode', barcode, { shouldDirty: true, shouldValidate: true });
                  setIsCameraOpen(false);
                }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
