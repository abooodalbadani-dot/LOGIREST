'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
import { ItemFormSchema, type ItemFormValues, CategorySchema, UoMSchema } from '@/types/master-data';
import { ScanInput } from '@/components/shared/ScanInput/ScanInput';
import { MasterDataFormLayout } from '@/features/master-data/components/MasterDataFormLayout';
import { Breadcrumb } from '@/components/shared/Breadcrumb';


interface Props { id: string | null; createTitle: string; editTitle: string; locale: string; }

export function ItemFormClient({ id, createTitle, editTitle, locale }: Props) {
  const t = useTranslations('master_data.common');
  const ti = useTranslations('master_data.items');
  const tv = useTranslations(); // For validation messages if they are nested
  const router = useRouter();

  const { data } = useItem(id);
  const { data: categories } = useCategories();
  const { data: uoms } = useMasterDataList('units-of-measure', UoMSchema);
  const create = useCreateItem();
  const update = useUpdateItem();

  const { register, handleSubmit, reset, setValue, watch, control, formState: { errors } } =
    useForm<ItemFormValues>({
      resolver: zodResolver(ItemFormSchema),
      defaultValues: {
        code: '', barcode: '', name_ar: '', name_en: '', category_id: '', primary_uom_id: '',
        track_lots: false, min_stock_level: 0, reorder_point: 0, uom_conversions: [], is_active: true,
      },
    });

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
      });
    }
  }, [data, reset]);

  const onSubmit = handleSubmit(async (values) => {
    if (id) await update.mutateAsync({ id, data: values });
    else await create.mutateAsync(values);
    router.push(`/${locale}/master-data/items`);
  });

  const isSaving = create.isPending || update.isPending;
  const trackLots = watch('track_lots');
  const isActive = watch('is_active');

  const breadcrumbs = [
    { label: t('master_data'), href: `/${locale}/master-data` },
    { label: ti('title'), href: `/${locale}/master-data/items` },
    { label: id ? editTitle : createTitle, href: '#' }
  ];

  return (
    <MasterDataFormLayout 
      title={id ? editTitle : createTitle} 
      backHref={`/${locale}/master-data/items`} 
      isSaving={isSaving} 
      onSubmit={onSubmit}
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
                  <h3 className="text-sm font-semibold tracking-[0.08em] rtl:tracking-normal text-foreground uppercase">{ti('sections.identity')}</h3>
                  <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-[0.08em] rtl:tracking-normal mt-0.5">{ti('sections.identity_desc')}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <Label htmlFor="item-code" className="text-[10px] font-semibold uppercase tracking-[0.08em] rtl:tracking-normal text-muted-foreground/70">{t('code')}</Label>
                  <Input 
                    id="item-code" 
                    dir="ltr" 
                    {...register('code')} 
                    className="font-mono font-semibold uppercase tracking-[0.08em] text-status-active" 
                    placeholder="E.g. SKU-100-RED" 
                  />
                  {errors.code && <p className="text-[10px] font-semibold text-status-error uppercase tracking-tight">{tv(errors.code.message as any)}</p>}
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-semibold uppercase tracking-[0.08em] rtl:tracking-normal text-muted-foreground/70">{ti('fields.barcode')}</Label>
                  <Controller
                    name="barcode"
                    control={control}
                    render={({ field }) => (
                      <ScanInput
                        value={field.value}
                        onChange={field.onChange}
                        onScan={(barcode) => setValue('barcode', barcode, { shouldValidate: true })}
                        placeholder={ti('fields.barcode')}
                        clearOnScan={false}
                        className="font-mono font-semibold text-status-active"
                      />
                    )}
                  />
                  {errors.barcode && <p className="text-[10px] font-semibold text-status-error uppercase tracking-tight">{tv(errors.barcode.message as any)}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <Label htmlFor="item-name-en" className="text-[10px] font-semibold uppercase tracking-[0.08em] rtl:tracking-normal text-muted-foreground/70">{ti('fields.name_en')}</Label>
                  <Input id="item-name-en" dir="ltr" {...register('name_en')} className="font-semibold" />
                  {errors.name_en && <p className="text-[10px] font-semibold text-status-error uppercase tracking-tight">{tv(errors.name_en.message as any)}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="item-name-ar" className="text-[10px] font-semibold uppercase tracking-[0.08em] rtl:tracking-normal text-muted-foreground/70">{ti('fields.name_ar')}</Label>
                  <Input id="item-name-ar" dir="rtl" {...register('name_ar')} className="font-semibold text-end" />
                  {errors.name_ar && <p className="text-[10px] font-semibold text-status-error uppercase tracking-tight">{tv(errors.name_ar.message as any)}</p>}
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
                  <h3 className="text-sm font-semibold tracking-[0.08em] rtl:tracking-normal text-foreground uppercase">{ti('sections.categorization')}</h3>
                  <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-[0.08em] rtl:tracking-normal mt-0.5">{ti('sections.categorization_desc')}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <Label htmlFor="item-category" className="text-[10px] font-semibold uppercase tracking-[0.08em] rtl:tracking-normal text-muted-foreground/70">{ti('fields.category')}</Label>
                  <Controller
                    name="category_id"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger id="item-category">
                          <SelectValue placeholder="—" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">—</SelectItem>
                          {categories?.data?.map((c: any) => (
                            <SelectItem key={c.id} value={c.id} className="uppercase tracking-[0.08em] rtl:tracking-normal font-semibold text-xs">
                              {locale === 'ar' ? c.name_ar : c.name_en}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.category_id && <p className="text-[10px] font-semibold text-status-error uppercase tracking-tight">{tv(errors.category_id.message as any)}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="primary-uom" className="text-[10px] font-semibold uppercase tracking-[0.08em] rtl:tracking-normal text-muted-foreground/70">{ti('fields.base_unit')}</Label>
                  <Controller
                    name="primary_uom_id"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger id="primary-uom">
                          <SelectValue placeholder="—" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">—</SelectItem>
                          {uoms?.data?.map((u) => (
                            <SelectItem key={u.id} value={u.id} className="uppercase tracking-[0.08em] rtl:tracking-normal font-semibold text-xs">
                              {u.code} — {u.name_en}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.primary_uom_id && <p className="text-[10px] font-semibold text-status-error uppercase tracking-tight">{tv(errors.primary_uom_id.message as any)}</p>}
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
                    <h3 className="text-sm font-semibold tracking-[0.08em] rtl:tracking-normal text-foreground uppercase">{ti('uom_conversions')}</h3>
                    <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-[0.08em] rtl:tracking-normal mt-0.5">{t('relational_unit_transformation')}</p>
                  </div>
                </div>
                <Button type="button" variant="outline" size="sm"
                  className="h-10 px-4 text-[10px] font-semibold uppercase tracking-[0.08em] rtl:tracking-normal border-status-secondary/20 hover:bg-status-secondary/5 text-status-secondary transition-all"
                  onClick={() => append({ from_uom_id: '', to_uom_id: '', factor: 1 })}>
                  <Plus className="w-3.5 h-3.5 me-2" />{ti('add_conversion')}
                </Button>
              </div>

              <div className="space-y-4">
                {fields.length === 0 ? (
                  <div className="py-12 text-center border-2 border-dashed border-surface-variant/10 rounded-lg bg-surface-container-highest/5 flex flex-col items-center gap-4 opacity-30">
                     <Scale className="w-8 h-8 text-muted-foreground/60" />
                     <p className="text-[10px] font-semibold uppercase tracking-[0.08em] rtl:tracking-normal text-muted-foreground/60">{ti('no_conversions_defined')}</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {fields.map((field, idx) => (
                      <div key={field.id} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_0.5fr_auto] gap-4 items-end p-4 bg-surface-container-highest/20 rounded-md border border-surface-variant/10 transition-all hover:bg-surface-container-highest/30">
                        <div className="space-y-2">
                          <Label htmlFor={`uom-from-${idx}`} className="text-[10px] font-semibold uppercase tracking-[0.08em] rtl:tracking-normal text-muted-foreground/60 ps-1">{ti('from_uom')}</Label>
                          <Controller
                            name={`uom_conversions.${idx}.from_uom_id`}
                            control={control}
                            render={({ field }) => (
                              <Select value={field.value} onValueChange={field.onChange}>
                                <SelectTrigger id={`uom-from-${idx}`}>
                                  <SelectValue placeholder="—" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="">—</SelectItem>
                                  {uoms?.data?.map((u) => (
                                    <SelectItem key={u.id} value={u.id} className="font-semibold uppercase tracking-[0.08em] rtl:tracking-normal text-xs">
                                      {u.code}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          />
                        </div>
                         <div className="space-y-2">
                          <Label htmlFor={`uom-to-${idx}`} className="text-[10px] font-semibold uppercase tracking-[0.08em] rtl:tracking-normal text-muted-foreground/60 ps-1">{ti('to_uom')}</Label>
                          <Controller
                            name={`uom_conversions.${idx}.to_uom_id`}
                            control={control}
                            render={({ field }) => (
                              <Select value={field.value} onValueChange={field.onChange}>
                                <SelectTrigger id={`uom-to-${idx}`}>
                                  <SelectValue placeholder="—" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="">—</SelectItem>
                                  {uoms?.data?.map((u) => (
                                    <SelectItem key={u.id} value={u.id} className="font-semibold uppercase tracking-[0.08em] rtl:tracking-normal text-xs">
                                      {u.code}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`uom-factor-${idx}`} className="text-[10px] font-semibold uppercase tracking-[0.08em] rtl:tracking-normal text-muted-foreground/60 ps-1">{ti('factor')}</Label>
                          <Input id={`uom-factor-${idx}`} type="number" dir="ltr" min={0} step="any" 
                            className="font-mono font-semibold text-status-secondary"
                            {...register(`uom_conversions.${idx}.factor`, { valueAsNumber: true })} />
                        </div>
                        <Button type="button" variant="ghost" size="icon" className="h-12 w-12 text-rose-500/40 hover:text-rose-500 hover:bg-rose-500/10 transition-all"
                          onClick={() => remove(idx)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
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
                  <h3 className="text-sm font-semibold tracking-[0.08em] rtl:tracking-normal text-foreground uppercase">{ti('fields.is_active')}</h3>
                  <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-[0.08em] rtl:tracking-normal mt-0.5">{t('operational_availability')}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-surface-container-highest/20 rounded-md border border-surface-variant/10 group transition-all hover:bg-surface-container-highest/30">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-semibold uppercase tracking-[0.08em] rtl:tracking-normal cursor-pointer text-muted-foreground/60">{t('is_active')}</Label>
                    <p className={`text-xs font-semibold uppercase tracking-tight ${isActive ? 'text-status-active' : 'text-status-error'}`}>{isActive ? t('active') : t('inactive')}</p>
                  </div>
                  <Switch checked={isActive} onCheckedChange={(v) => setValue('is_active', v)} className="data-[state=checked]:bg-status-active" />
                </div>

                <div className="flex items-center justify-between p-4 bg-surface-container-highest/20 rounded-md border border-surface-variant/10 group transition-all hover:bg-surface-container-highest/30">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-semibold uppercase tracking-[0.08em] rtl:tracking-normal cursor-pointer text-muted-foreground/60">{ti('track_lots')}</Label>
                    <p className={`text-xs font-semibold uppercase tracking-tight ${trackLots ? 'text-status-active' : 'text-muted-foreground/40'}`}>{trackLots ? t('yes') : t('no')}</p>
                  </div>
                  <Switch checked={trackLots} onCheckedChange={(v) => setValue('track_lots', v)} className="data-[state=checked]:bg-status-active" />
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
                  <h3 className="text-sm font-semibold tracking-[0.08em] rtl:tracking-normal text-foreground uppercase">{ti('sections.inventory_rules')}</h3>
                  <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-[0.08em] rtl:tracking-normal mt-0.5">{ti('sections.inventory_rules_desc')}</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="min-stock" className="text-[10px] font-semibold uppercase tracking-[0.08em] rtl:tracking-normal text-muted-foreground/60 ps-1">{ti('fields.min_stock')}</Label>
                  <Input id="min-stock" type="number" dir="ltr" min={0} 
                    className="font-mono font-semibold text-status-secondary"
                    {...register('min_stock_level', { valueAsNumber: true })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reorder-point" className="text-[10px] font-semibold uppercase tracking-[0.08em] rtl:tracking-normal text-muted-foreground/60 ps-1">{ti('fields.reorder_point')}</Label>
                  <Input id="reorder-point" type="number" dir="ltr" min={0} 
                    className="font-mono font-semibold text-status-secondary"
                    {...register('reorder_point', { valueAsNumber: true })} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MasterDataFormLayout>
  );
}
