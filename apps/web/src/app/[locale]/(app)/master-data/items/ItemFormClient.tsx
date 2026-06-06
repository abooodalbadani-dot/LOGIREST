'use client';

import { useEffect, useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useForm, useFieldArray, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Package, Plus, Trash2, ShieldCheck, Scale, Boxes, Settings2, Edit3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { SmartCombobox } from '@/components/shared/SmartCombobox';
import { Card, CardContent } from '@/components/ui/card';
import { useItem, useCreateItem, useUpdateItem, useDeleteItem } from '@/features/items/hooks/useItems';
import { useCategories } from '@/features/categories/hooks/useCategories';
import { useMasterDataList } from '@/features/master-data/hooks/useMasterDataCRUD';
import { ItemFormSchema, type ItemFormValues, UoMSchema, type Category, type UoMConversion } from '@/types/master-data';
import { useConflictHandler } from '@/core/concurrency/useConflictHandler';
import { ConflictDialog } from '@/core/concurrency/ConflictDialog';
import { ScanInput } from '@/components/shared/ScanInput/ScanInput';
import { MasterDataFormLayout } from '@/features/master-data/components/MasterDataFormLayout';
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
  
  const create = useCreateItem();
  const conflict = useConflictHandler('item', id ?? '');
  const update = useUpdateItem({ onConflict: conflict.triggerConflict });
  const deleteMutation = useDeleteItem();
  const { playSound } = useAudioFeedback();

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const { register, handleSubmit, reset, setValue, control, formState: { errors, isDirty, isValid } } =
    useForm<ItemFormValues>({
      resolver: zodResolver(ItemFormSchema),
      disabled: isReadOnly,
      defaultValues: {
        code: '', barcode: '', name: '', categoryId: '', primaryUomId: '',
        trackLots: false, minStockLevel: 0, reorderPoint: 0, uomConversions: [], isActive: true,
        version: undefined,
      },
    });
  
  const { router: guardedRouter } = useUnsavedChangesGuard(isDirty);

  const { fields, append, remove } = useFieldArray({ control, name: 'uomConversions' });

  useEffect(() => {
    if (data) {
      reset({
        code: data.code, barcode: data.barcode, name: data.name,
        categoryId: data.categoryId, primaryUomId: data.primaryUom.id,
        trackLots: data.trackLots, minStockLevel: data.minStockLevel,
        reorderPoint: data.reorderPoint,
        uomConversions: data.uomConversions.map((c: UoMConversion) => ({
          fromUomId: c.fromUomId, toUomId: c.toUomId, factor: c.factor,
        })),
        isActive: data.isActive,
        version: data.version,
      });
    }
  }, [data, reset]);

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

  const onValid = async (values: ItemFormValues) => {
    if (isReadOnly) return;
    
    try {
      if (id) {
        await update.mutateAsync({ id, values, signal: abortController.signal });
      } else {
        await create.mutateAsync({ ...values, signal: abortController.signal });
      }
      reset(values);
      guardedRouter.push('/master-data/items', { skipGuard: true });
    } catch {
      // Handled by mutation callbacks
    }
  };

  const onSubmit = handleSubmit(onValid, onFormError);

  const handleDelete = async () => {
    if (!id) return;
    try {
      await deleteMutation.mutateAsync({ id, signal: abortController.signal });
      guardedRouter.push('/master-data/items', { skipGuard: true });
    } catch {
      // Handled by mutation callbacks
    }
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
        resource="master_data"
        saveAction={id ? 'edit' : 'create'}
        isDirty={isDirty}
        isValid={isValid}
        headerActions={
          id && (
            <div className="flex gap-4">
              <PermissionGate action="delete" resource="master_data">
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
                <PermissionGate action="edit" resource="master_data">
                  <Button 
                    onClick={() => guardedRouter.push(`/master-data/items/${id}/edit`)}
                    className="h-12 px-6 bg-operational-cyan text-white hover:bg-operational-cyan/90 font-bold rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-operational-cyan/20"
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* Main Identity Section */}
            <Card className="bg-surface-container-low border-none overflow-hidden">
              <CardContent className="p-8 space-y-8">
                <div className="flex items-center gap-3 pb-4 border-b border-surface-variant/10">
                  <div className="w-10 h-10 rounded-md bg-tertiary-container/10 flex items-center justify-center">
                    <Package className="w-5 h-5 text-tertiary" />
                  </div>
                  <div>
                    <h3 className="text-body-md font-semibold text-foreground uppercase">{ti('sections.identity')}</h3>
                    <p className="text-label-xs font-semibold text-muted-foreground/60 uppercase mt-0.5">{ti('sections.identity_desc')}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <Label htmlFor="item-code" className="text-label-xs font-semibold uppercase text-muted-foreground/70">{tm('code')}</Label>
                    <Input 
                      id="item-code" 
                      dir="ltr" 
                      {...register('code')} 
                      disabled={isReadOnly}
                      className="font-mono font-semibold uppercase text-status-active" 
                      placeholder={ti('fields.sku_placeholder')} 
                    />
                    {errors.code?.message && <p className="text-label-xs font-semibold text-status-error uppercase">{tv(errors.code.message as never)}</p>}
                  </div>
                  <div className="hidden md:block" /> {/* Spacer for consistent grid alignment */}
                </div>

                <div className="space-y-2">
                  <Label className="text-label-xs font-semibold uppercase text-muted-foreground/70">{ti('fields.barcode')}</Label>
                  <Controller
                    name="barcode"
                    control={control}
                    render={({ field }) => (
                      <ScanInput
                        value={field.value}
                        onChange={field.onChange}
                        onScan={(barcode) => { if (!isReadOnly) setValue('barcode', barcode, { shouldValidate: true }); }}
                        placeholder={ti('fields.barcode')}
                        clearOnScan={false}
                        disabled={isReadOnly}
                        size="md"
                      />
                    )}
                  />
                  {errors.barcode?.message && <p className="text-label-xs font-semibold text-status-error uppercase">{tv(errors.barcode.message as never)}</p>}
                </div>

                <div className="space-y-2 max-w-md">
                  <Label htmlFor="item-name" className="text-label-xs font-semibold uppercase text-muted-foreground/70">{ti('fields.name') || tm('name') || 'Name'}</Label>
                  <Input id="item-name" {...register('name')} disabled={isReadOnly} className="font-semibold" />
                  {errors.name?.message && <p className="text-label-xs font-semibold text-status-error uppercase">{tv(errors.name.message as never)}</p>}
                </div>
              </CardContent>
            </Card>

            {/* Logistics Configuration Section */}
            <Card className="bg-surface-container-low border-none overflow-hidden">
              <CardContent className="p-8 space-y-8">
                <div className="flex items-center gap-3 pb-4 border-b border-surface-variant/10">
                  <div className="w-10 h-10 rounded-md bg-tertiary-container/10 flex items-center justify-center">
                    <Boxes className="w-5 h-5 text-tertiary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-body-md font-semibold text-foreground uppercase truncate">{ti('sections.categorization')}</h3>
                    <p className="text-label-xs font-semibold text-muted-foreground/60 uppercase mt-0.5 break-words line-clamp-2">{ti('sections.categorization_desc')}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <Label htmlFor="item-category" className="text-label-xs font-semibold uppercase text-muted-foreground/70">{ti('fields.category')}</Label>
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
                    {errors.categoryId?.message && <p className="text-label-xs font-semibold text-status-error uppercase">{tv(errors.categoryId.message as never)}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="primary-uom" className="text-label-xs font-semibold uppercase text-muted-foreground/70">{ti('fields.base_unit')}</Label>
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
                    {errors.primaryUomId?.message && <p className="text-label-xs font-semibold text-status-error uppercase">{tv(errors.primaryUomId.message as never)}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Unit Conversion Protocol */}
            <Card className="bg-surface-container-low border-none overflow-hidden">
              <CardContent className="p-8 space-y-8">
                <div className="flex items-center justify-between border-b border-surface-variant/10 pb-4 gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-md bg-tertiary-container/10 flex items-center justify-center shrink-0">
                      <Scale className="w-5 h-5 text-tertiary" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-body-md font-semibold text-foreground uppercase truncate">{ti('uom_conversions')}</h3>
                      <p className="text-label-xs font-semibold text-muted-foreground/60 uppercase mt-0.5 break-words">{tm('relational_unit_transformation')}</p>
                    </div>
                  </div>
                  {!isReadOnly && (
                    <Button type="button" variant="outline" size="sm"
                      className="h-10 px-4 text-label-xs font-semibold uppercase border-status-secondary/20 hover:bg-status-secondary/5 text-status-secondary transition-all shrink-0"
                      onClick={() => append({ fromUomId: '', toUomId: '', factor: 1 })}>
                      <Plus className="w-3.5 h-3.5 me-2" />{ti('add_conversion')}
                    </Button>
                  )}
                </div>

                <div className="space-y-4">
                  {fields.length === 0 ? (
                    <div className="py-12 text-center border-2 border-dashed border-surface-variant/10 rounded-lg bg-surface-container-highest/5 flex flex-col items-center gap-4 opacity-30">
                      <Scale className="w-8 h-8 text-muted-foreground/60" />
                      <p className="text-label-xs font-semibold uppercase text-muted-foreground/60">{ti('no_conversions_defined')}</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {fields.map((field, idx) => (
                        <div key={field.id} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_0.5fr_auto] gap-4 items-end p-4 bg-surface-container-highest/20 rounded-md border border-surface-variant/10 transition-all hover:bg-surface-container-highest/30">
                          <div className="space-y-2">
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
                          <div className="space-y-2">
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
                          <div className="space-y-2">
                            <Label htmlFor={`uom-factor-${idx}`} className="text-label-xs font-semibold uppercase text-muted-foreground/60 ps-1">{ti('factor')}</Label>
                            <Input id={`uom-factor-${idx}`} type="number" dir="ltr" min={0} step="any" 
                              disabled={isReadOnly}
                              className="font-mono font-semibold text-status-secondary"
                              {...register(`uomConversions.${idx}.factor`, { valueAsNumber: true })} />
                          </div>
                          {!isReadOnly && (
                            <Button type="button" variant="ghost" size="icon" className="h-12 w-12 text-rose-500/40 hover:text-rose-500 hover:bg-rose-500/10 transition-all"
                              onClick={() => remove(idx)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-8">
            <Card className="bg-surface-container-low border-none overflow-hidden">
              <CardContent className="p-8 space-y-8">
                <div className="flex items-center gap-3 pb-4 border-b border-surface-variant/10">
                  <div className="w-10 h-10 rounded-md bg-tertiary-container/10 flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5 text-tertiary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-body-md font-semibold text-foreground uppercase truncate">{tm('status_label')}</h3>
                    <p className="text-label-xs font-semibold text-muted-foreground/60 uppercase mt-0.5 break-words">{tm('operational_availability')}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-surface-container-highest/20 rounded-md border border-surface-variant/10 group transition-all hover:bg-surface-container-highest/30">
                    <div className="space-y-1">
                      <Label className="text-label-xs font-semibold uppercase cursor-pointer text-muted-foreground/60">{tm('status_label')}</Label>
                      <p className={`text-label-sm font-semibold uppercase ${isActive ? 'text-status-active' : 'text-status-error'}`}>{isActive ? tm('active') : tm('inactive')}</p>
                    </div>
                    <Switch 
                      checked={isActive} 
                      onCheckedChange={(v) => !isReadOnly && setValue('isActive', v)} 
                      disabled={isReadOnly}
                      className="data-[state=checked]:bg-status-active" 
                    />
                  </div>
                  <div
                    className="flex flex-wrap items-center justify-between gap-4 p-4 bg-surface-container-highest/20 rounded-md border border-surface-variant/10 group transition-all hover:bg-surface-container-highest/30"
                    title={!!(data as { has_transactions?: boolean } | null)?.has_transactions ? 'Cannot change lot tracking after transactions exist.' : undefined}
                  >
                    <div className="space-y-1">
                      <Label className="text-label-xs font-semibold uppercase cursor-pointer text-muted-foreground/60">{ti('track_lots')}</Label>
                      <p className={`text-label-sm font-semibold uppercase ${trackLots ? 'text-status-active' : 'text-muted-foreground/40'}`}>{trackLots ? tm('yes') : tm('no')}</p>
                      {!!(data as { has_transactions?: boolean } | null)?.has_transactions && (
                        <p className="text-[10px] text-status-warning uppercase font-bold mt-1">
                          {ti('lot_tracking_locked') || 'Tracking locked: transactions exist'}
                        </p>
                      )}
                    </div>
                    <Switch 
                      checked={trackLots} 
                      onCheckedChange={(v) => {
                        const d = data as { has_transactions?: boolean } | null;
                        if (!isReadOnly && !d?.has_transactions) setValue('trackLots', v);
                      }} 
                      disabled={isReadOnly || !!(data as { has_transactions?: boolean } | null)?.has_transactions}
                      className="data-[state=checked]:bg-status-active" 
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-surface-container-low border-none overflow-hidden">
              <CardContent className="p-8 space-y-8">
                <div className="flex items-center gap-3 pb-4 border-b border-surface-variant/10">
                  <div className="w-10 h-10 rounded-md bg-tertiary-container/10 flex items-center justify-center">
                    <Settings2 className="w-5 h-5 text-tertiary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-body-md font-semibold text-foreground uppercase truncate">{ti('sections.inventory_rules')}</h3>
                    <p className="text-label-xs font-semibold text-muted-foreground/60 uppercase mt-0.5 break-words">{ti('sections.inventory_rules_desc')}</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="min-stock" className="text-label-xs font-semibold uppercase text-muted-foreground/60 ps-1">{ti('fields.min_stock')}</Label>
                    <Input id="min-stock" type="number" dir="ltr" min={0} 
                      disabled={isReadOnly}
                      className="font-mono font-semibold text-status-secondary"
                      {...register('minStockLevel', { valueAsNumber: true })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reorder-point" className="text-label-xs font-semibold uppercase text-muted-foreground/60 ps-1">{ti('fields.reorder_point')}</Label>
                    <Input id="reorder-point" type="number" dir="ltr" min={0} 
                      disabled={isReadOnly}
                      className="font-mono font-semibold text-status-secondary"
                      {...register('reorderPoint', { valueAsNumber: true })} />
                  </div>
                </div>
              </CardContent>
            </Card>
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
        isLoading={deleteMutation.isPending}
        title={ti('delete_confirm_title')}
        description={ti('delete_confirm_desc')}
        confirmText={t('actions.delete')}
        variant="destructive"
        icon="delete"
      />
    </>
  );
}
