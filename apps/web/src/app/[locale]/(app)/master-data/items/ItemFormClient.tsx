'use client';

import { useEffect, useMemo } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { useForm, useFieldArray, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Package, Plus, Trash2, ShieldCheck, Scale, Boxes, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { useItem, useCreateItem, useUpdateItem } from '@/features/items/hooks/useItems';
import { useCategories } from '@/features/categories/hooks/useCategories';
import { useMasterDataList } from '@/features/master-data/hooks/useMasterDataCRUD';
import { ItemFormSchema, type ItemFormValues, UoMSchema } from '@/types/master-data';
import { useConflictHandler } from '@/core/concurrency/useConflictHandler';
import { ConflictDialog } from '@/core/concurrency/ConflictDialog';
import { ScanInput } from '@/components/shared/ScanInput/ScanInput';
import { MasterDataFormLayout } from '@/features/master-data/components/MasterDataFormLayout';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { ErrorState } from '@/components/shared/ErrorState';
import { useUnsavedChangesGuard } from '@/lib/unsaved-changes/useUnsavedChangesGuard';


interface Props { 
  id: string | null; 
  createTitle: string; 
  editTitle: string; 
  viewTitle: string;
  locale: string; 
  isReadOnly?: boolean;
}

export function ItemFormClient({ id, createTitle, editTitle, viewTitle, locale, isReadOnly = false }: Props) {
  const t = useTranslations('master_data.common');
  const ti = useTranslations('master_data.items');
  const tv = useTranslations('master_data.validation');

  const { data, isLoading, isError, isFetched, refetch } = useItem(id);
  const { data: categories, isLoading: isLoadingCats, isError: isErrorCats } = useCategories();
  const { data: uoms, isLoading: isLoadingUoms, isError: isErrorUoms } = useMasterDataList('units-of-measure', UoMSchema);
  
  const create = useCreateItem();
  const conflict = useConflictHandler('item', id ?? '');
  const update = useUpdateItem({ onConflict: conflict.triggerConflict });

  const { register, handleSubmit, reset, setValue, control, formState: { errors, isDirty, isValid } } =
    useForm<ItemFormValues>({
      resolver: zodResolver(ItemFormSchema),
      disabled: isReadOnly,
      defaultValues: {
        code: '', barcode: '', name_ar: '', name_en: '', category_id: '', primary_uom_id: '',
        track_lots: false, min_stock_level: 0, reorder_point: 0, uom_conversions: [], is_active: true,
        version: undefined,
      },
    });
  
  const { router: guardedRouter } = useUnsavedChangesGuard(isDirty);

  const { fields, append, remove } = useFieldArray({ control, name: 'uom_conversions' });

  useEffect(() => {
    if (data) {
      reset({
        code: data.code, barcode: data.barcode, name_ar: data.name_ar, name_en: data.name_en,
        category_id: data.category_id, primary_uom_id: data.primary_uom.id,
        track_lots: data.track_lots, min_stock_level: data.min_stock_level,
        reorder_point: data.reorder_point,
        uom_conversions: data.uom_conversions.map((c) => ({
          from_uom_id: c.from_uom_id, to_uom_id: c.to_uom_id, factor: c.factor,
        })),
        is_active: data.is_active,
        version: data.version,
      });
    }
  }, [data, reset]);

  const onSubmit = handleSubmit((values) => {
    if (isReadOnly) return;
    
    if (id) {
      update.mutate({ id, values }, {
        onSuccess: () => {
          guardedRouter.push('/master-data/items', { skipGuard: true });
        }
      });
    } else {
      create.mutate(values, {
        onSuccess: () => {
          guardedRouter.push('/master-data/items', { skipGuard: true });
        }
      });
    }
  });

  const isSaving = create.isPending || update.isPending;
  const trackLots = useWatch({ control, name: 'track_lots' });
  const isActive = useWatch({ control, name: 'is_active' });

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
        onCancel={() => guardedRouter.push('/master-data/items')}
        isSaving={isSaving} 
        onSubmit={onSubmit}
        hideSave={isReadOnly}
        resource="master_data"
        saveAction={id ? 'edit' : 'create'}
        isDirty={isDirty}
        isValid={isValid}
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
                    <Label htmlFor="item-code" className="text-label-xs font-semibold uppercase text-muted-foreground/70">{t('code')}</Label>
                    <Input 
                      id="item-code" 
                      dir="ltr" 
                      {...register('code')} 
                      disabled={isReadOnly}
                      className="font-mono font-semibold uppercase text-status-active" 
                      placeholder="E.g. SKU-100-RED" 
                    />
                    {errors.code && <p className="text-label-xs font-semibold text-status-error uppercase">{tv(errors.code.message as any)}</p>}
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
                          className="font-mono font-semibold text-status-active"
                        />
                      )}
                    />
                    {errors.barcode && <p className="text-label-xs font-semibold text-status-error uppercase">{tv(errors.barcode.message as any)}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <Label htmlFor="item-name-en" className="text-label-xs font-semibold uppercase text-muted-foreground/70">{ti('fields.name_en')}</Label>
                    <Input id="item-name-en" dir="ltr" {...register('name_en')} disabled={isReadOnly} className="font-semibold" />
                    {errors.name_en && <p className="text-label-xs font-semibold text-status-error uppercase">{tv(errors.name_en.message as any)}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="item-name-ar" className="text-label-xs font-semibold uppercase text-muted-foreground/70">{ti('fields.name_ar')}</Label>
                    <Input id="item-name-ar" dir="rtl" {...register('name_ar')} disabled={isReadOnly} className="font-semibold text-end" />
                    {errors.name_ar && <p className="text-label-xs font-semibold text-status-error uppercase">{tv(errors.name_ar.message as any)}</p>}
                  </div>
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
                  <div>
                    <h3 className="text-body-md font-semibold text-foreground uppercase">{ti('sections.categorization')}</h3>
                    <p className="text-label-xs font-semibold text-muted-foreground/60 uppercase mt-0.5">{ti('sections.categorization_desc')}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <Label htmlFor="item-category" className="text-label-xs font-semibold uppercase text-muted-foreground/70">{ti('fields.category')}</Label>
                    <Controller
                      name="category_id"
                      control={control}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange} disabled={isReadOnly}>
                          <SelectTrigger id="item-category">
                            <SelectValue placeholder="—" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">—</SelectItem>
                            {categories?.data?.map((c: any) => (
                              <SelectItem key={c.id} value={c.id} className="uppercase font-semibold text-label-sm">
                                {locale === 'ar' ? c.name_ar : c.name_en}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.category_id && <p className="text-label-xs font-semibold text-status-error uppercase">{tv(errors.category_id.message as any)}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="primary-uom" className="text-label-xs font-semibold uppercase text-muted-foreground/70">{ti('fields.base_unit')}</Label>
                    <Controller
                      name="primary_uom_id"
                      control={control}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange} disabled={isReadOnly}>
                          <SelectTrigger id="primary-uom">
                            <SelectValue placeholder="—" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">—</SelectItem>
                            {uoms?.data?.map((u) => (
                              <SelectItem key={u.id} value={u.id} className="uppercase font-semibold text-label-sm">
                                {u.code} — {u.name_en}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.primary_uom_id && <p className="text-label-xs font-semibold text-status-error uppercase">{tv(errors.primary_uom_id.message as any)}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Unit Conversion Protocol */}
            <Card className="bg-surface-container-low border-none overflow-hidden">
              <CardContent className="p-8 space-y-8">
                <div className="flex items-center justify-between border-b border-surface-variant/10 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-md bg-tertiary-container/10 flex items-center justify-center">
                      <Scale className="w-5 h-5 text-tertiary" />
                    </div>
                    <div>
                      <h3 className="text-body-md font-semibold text-foreground uppercase">{ti('uom_conversions')}</h3>
                      <p className="text-label-xs font-semibold text-muted-foreground/60 uppercase mt-0.5">{t('relational_unit_transformation')}</p>
                    </div>
                  </div>
                  {!isReadOnly && (
                    <Button type="button" variant="outline" size="sm"
                      className="h-10 px-4 text-label-xs font-semibold uppercase border-status-secondary/20 hover:bg-status-secondary/5 text-status-secondary transition-all"
                      onClick={() => append({ from_uom_id: '', to_uom_id: '', factor: 1 })}>
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
                              name={`uom_conversions.${idx}.from_uom_id`}
                              control={control}
                              render={({ field }) => (
                                <Select value={field.value} onValueChange={field.onChange} disabled={isReadOnly}>
                                  <SelectTrigger id={`uom-from-${idx}`}>
                                    <SelectValue placeholder="—" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="">—</SelectItem>
                                    {uoms?.data?.map((u) => (
                                      <SelectItem key={u.id} value={u.id} className="font-semibold uppercase text-label-sm">
                                        {u.code}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`uom-to-${idx}`} className="text-label-xs font-semibold uppercase text-muted-foreground/60 ps-1">{ti('to_uom')}</Label>
                            <Controller
                              name={`uom_conversions.${idx}.to_uom_id`}
                              control={control}
                              render={({ field }) => (
                                <Select value={field.value} onValueChange={field.onChange} disabled={isReadOnly}>
                                  <SelectTrigger id={`uom-to-${idx}`}>
                                    <SelectValue placeholder="—" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="">—</SelectItem>
                                    {uoms?.data?.map((u) => (
                                      <SelectItem key={u.id} value={u.id} className="font-semibold uppercase text-label-sm">
                                        {u.code}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`uom-factor-${idx}`} className="text-label-xs font-semibold uppercase text-muted-foreground/60 ps-1">{ti('factor')}</Label>
                            <Input id={`uom-factor-${idx}`} type="number" dir="ltr" min={0} step="any" 
                              disabled={isReadOnly}
                              className="font-mono font-semibold text-status-secondary"
                              {...register(`uom_conversions.${idx}.factor`, { valueAsNumber: true })} />
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
                  <div>
                    <h3 className="text-body-md font-semibold text-foreground uppercase">{ti('fields.is_active')}</h3>
                    <p className="text-label-xs font-semibold text-muted-foreground/60 uppercase mt-0.5">{t('operational_availability')}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-surface-container-highest/20 rounded-md border border-surface-variant/10 group transition-all hover:bg-surface-container-highest/30">
                    <div className="space-y-1">
                      <Label className="text-label-xs font-semibold uppercase cursor-pointer text-muted-foreground/60">{t('is_active')}</Label>
                      <p className={`text-label-sm font-semibold uppercase ${isActive ? 'text-status-active' : 'text-status-error'}`}>{isActive ? t('active') : t('inactive')}</p>
                    </div>
                    <Switch 
                      checked={isActive} 
                      onCheckedChange={(v) => !isReadOnly && setValue('is_active', v)} 
                      disabled={isReadOnly}
                      className="data-[state=checked]:bg-status-active" 
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-surface-container-highest/20 rounded-md border border-surface-variant/10 group transition-all hover:bg-surface-container-highest/30">
                    <div className="space-y-1">
                      <Label className="text-label-xs font-semibold uppercase cursor-pointer text-muted-foreground/60">{ti('track_lots')}</Label>
                      <p className={`text-label-sm font-semibold uppercase ${trackLots ? 'text-status-active' : 'text-muted-foreground/40'}`}>{trackLots ? t('yes') : t('no')}</p>
                    </div>
                    <Switch 
                      checked={trackLots} 
                      onCheckedChange={(v) => !isReadOnly && setValue('track_lots', v)} 
                      disabled={isReadOnly}
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
                  <div>
                    <h3 className="text-body-md font-semibold text-foreground uppercase">{ti('sections.inventory_rules')}</h3>
                    <p className="text-label-xs font-semibold text-muted-foreground/60 uppercase mt-0.5">{ti('sections.inventory_rules_desc')}</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="min-stock" className="text-label-xs font-semibold uppercase text-muted-foreground/60 ps-1">{ti('fields.min_stock')}</Label>
                    <Input id="min-stock" type="number" dir="ltr" min={0} 
                      disabled={isReadOnly}
                      className="font-mono font-semibold text-status-secondary"
                      {...register('min_stock_level', { valueAsNumber: true })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reorder-point" className="text-label-xs font-semibold uppercase text-muted-foreground/60 ps-1">{ti('fields.reorder_point')}</Label>
                    <Input id="reorder-point" type="number" dir="ltr" min={0} 
                      disabled={isReadOnly}
                      className="font-mono font-semibold text-status-secondary"
                      {...register('reorder_point', { valueAsNumber: true })} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </MasterDataFormLayout>

      <ConflictDialog
        open={conflict.open}
        onReload={conflict.handleReload}
        onClose={conflict.handleClose}
      />
    </>
  );
}
