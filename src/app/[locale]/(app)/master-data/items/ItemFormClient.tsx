'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Package, Plus, Trash2, ShieldCheck, Scale, Boxes, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useMasterDataItem, useMasterDataList, useMasterDataCreate, useMasterDataUpdate } from '@/features/master-data/hooks/useMasterDataCRUD';
import { ItemSchema, ItemFormSchema, type ItemFormValues, CategorySchema, UoMSchema } from '@/types/master-data';
import { ScanInput } from '@/components/shared/ScanInput/ScanInput';
import { MasterDataFormLayout } from '@/features/master-data/components/MasterDataFormLayout';
import { Breadcrumb } from '@/components/shared/Breadcrumb';


interface Props { id: string | null; createTitle: string; editTitle: string; locale: string; }

export function ItemFormClient({ id, createTitle, editTitle, locale }: Props) {
  const t = useTranslations('masterData.common');
  const ti = useTranslations('masterData.items');
  const router = useRouter();

  const { data } = useMasterDataItem('items', id, ItemSchema);
  const { data: categories } = useMasterDataList('categories', CategorySchema);
  const { data: uoms } = useMasterDataList('units-of-measure', UoMSchema);
  const create = useMasterDataCreate('items', ItemSchema);
  const update = useMasterDataUpdate('items', ItemSchema);

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
    if (id) await update.mutateAsync({ id, body: values });
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
    <div className="space-y-6">
      <Breadcrumb items={breadcrumbs} />
      <MasterDataFormLayout 
        title={id ? editTitle : createTitle} 
        backHref={`/${locale}/master-data/items`} 
        isSaving={isSaving} 
        onSubmit={onSubmit}
      >

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* Main Identity Section */}
            <Card className="bg-surface-container-low border-none rounded-sm overflow-hidden">
              <CardContent className="p-8 space-y-8">
                <div className="flex items-center gap-3 pb-4 border-b border-surface-variant/10">
                  <div className="w-10 h-10 rounded-sm bg-cyan-500/10 flex items-center justify-center">
                    <Package className="w-5 h-5 text-cyan-500" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold tracking-tight text-foreground uppercase">{ti('basic_info')}</h3>
                    <p className="text-[10px] font-bold text-muted-foreground/60/40 uppercase tracking-widest mt-0.5">{t('basic_info_desc')}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <Label htmlFor="item-code" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">{t('code')}</Label>
                    <div className="relative group">
                       <Input id="item-code" dir="ltr" {...register('code')} 
                        className="h-12 bg-surface-container-highest/30 border-none rounded-sm font-mono font-bold text-xs uppercase text-cyan-400 focus-visible:ring-1 focus-visible:ring-cyan-500/50 transition-all" 
                        placeholder={t('placeholder_sku')} />
                    </div>
                    {errors.code && <p className="text-[10px] font-bold text-rose-400 uppercase tracking-tight">{errors.code.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">{ti('barcode')}</Label>
                    <div className="relative group">
                      <ScanInput
                        onScan={(barcode) => setValue('barcode', barcode, { shouldValidate: true })}
                        placeholder={ti('scan_or_type')}
                        className="h-12 bg-surface-container-highest/30 border-none rounded-sm focus-visible:ring-1 focus-visible:ring-cyan-500/50 transition-all font-mono font-bold text-xs"
                      />
                      <input type="hidden" {...register('barcode')} />
                    </div>
                    {errors.barcode && <p className="text-[10px] font-bold text-rose-400 uppercase tracking-tight">{errors.barcode.message}</p>}
                  </div>
                </div>

                <div className="grid gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="item-name-en" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">{t('name_en')}</Label>
                    <Input id="item-name-en" dir="ltr" {...register('name_en')} 
                      className="h-12 bg-surface-container-highest/30 border-none rounded-sm font-bold text-xs text-foreground focus-visible:ring-1 focus-visible:ring-cyan-500/50 transition-all" />
                    {errors.name_en && <p className="text-[10px] font-bold text-rose-400 uppercase tracking-tight">{errors.name_en.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="item-name-ar" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">{t('name_ar')}</Label>
                    <Input id="item-name-ar" dir="rtl" {...register('name_ar')} 
                      className="h-12 bg-surface-container-highest/30 border-none rounded-sm font-bold text-xs text-foreground focus-visible:ring-1 focus-visible:ring-cyan-500/50 transition-all text-end" />
                    {errors.name_ar && <p className="text-[10px] font-bold text-rose-400 uppercase tracking-tight">{errors.name_ar.message}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Logistics Configuration Section */}
            <Card className="bg-surface-container-low border-none rounded-sm overflow-hidden">
              <CardContent className="p-8 space-y-8">
                <div className="flex items-center gap-3 pb-4 border-b border-surface-variant/10">
                  <div className="w-10 h-10 rounded-sm bg-amber-500/10 flex items-center justify-center">
                    <Boxes className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold tracking-tight text-foreground uppercase">{ti('classification')}</h3>
                    <p className="text-[10px] font-bold text-muted-foreground/60/40 uppercase tracking-widest mt-0.5">{t('inventory_taxonomy_units')}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <Label htmlFor="item-category" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">{ti('category')}</Label>
                    <select id="item-category" {...register('category_id')}
                      className="h-12 px-4 bg-surface-container-highest/30 border-none rounded-sm w-full text-xs font-bold uppercase tracking-widest appearance-none hover:bg-surface-container-highest/50 transition-all outline-none focus-visible:ring-1 focus-visible:ring-cyan-500/50">
                      <option value="" className="bg-surface-container-low text-muted-foreground/60">{t('null_select')}</option>
                      {categories?.data?.map((c) => (
                        <option key={c.id} value={c.id} className="bg-surface-container-low font-bold text-xs uppercase tracking-widest">
                          {locale === 'ar' ? c.name_ar : c.name_en}
                        </option>
                      ))}
                    </select>
                    {errors.category_id && <p className="text-[10px] font-bold text-rose-400 uppercase tracking-tight">{errors.category_id.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="primary-uom" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">{ti('primary_uom')}</Label>
                    <select id="primary-uom" {...register('primary_uom_id')}
                      className="h-12 px-4 bg-surface-container-highest/30 border-none rounded-sm w-full text-xs font-bold uppercase tracking-widest appearance-none hover:bg-surface-container-highest/50 transition-all outline-none focus-visible:ring-1 focus-visible:ring-cyan-500/50">
                      <option value="" className="bg-surface-container-low text-muted-foreground/60">{t('select_base_unit')}</option>
                      {uoms?.data?.map((u) => (
                        <option key={u.id} value={u.id} className="bg-surface-container-low uppercase tracking-widest font-bold text-xs">
                          {u.code} — {u.name_en}
                        </option>
                      ))}
                    </select>
                    {errors.primary_uom_id && <p className="text-[10px] font-bold text-rose-400 uppercase tracking-tight">{errors.primary_uom_id.message}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Unit Conversion Protocol */}
            <Card className="bg-surface-container-low border-none rounded-sm overflow-hidden">
              <CardContent className="p-8 space-y-8">
                <div className="flex items-center justify-between border-b border-surface-variant/10 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-sm bg-indigo-500/10 flex items-center justify-center">
                      <Scale className="w-5 h-5 text-indigo-500" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold tracking-tight text-foreground uppercase">{ti('uom_conversions')}</h3>
                      <p className="text-[10px] font-bold text-muted-foreground/60/40 uppercase tracking-widest mt-0.5">{t('relational_unit_transformation')}</p>
                    </div>
                  </div>
                  <Button type="button" variant="outline" size="sm"
                    className="h-10 px-4 text-[10px] font-black uppercase tracking-widest border-indigo-500/20 hover:bg-indigo-500/5 text-indigo-400 rounded-sm transition-all"
                    onClick={() => append({ from_uom_id: '', to_uom_id: '', factor: 1 })}>
                    <Plus className="w-3.5 h-3.5 me-2" />{ti('add_conversion')}
                  </Button>
                </div>

                <div className="space-y-4">
                  {fields.length === 0 ? (
                    <div className="py-12 text-center border-2 border-dashed border-surface-variant/10 rounded-sm bg-surface-container-highest/5 flex flex-col items-center gap-4 opacity-30">
                       <Scale className="w-8 h-8 text-muted-foreground/60" />
                       <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">{ti('no_conversions_defined')}</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {fields.map((field, idx) => (
                        <div key={field.id} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_0.5fr_auto] gap-4 items-end p-4 bg-surface-container-highest/20 rounded-sm border border-surface-variant/10 transition-all hover:bg-surface-container-highest/30">
                          <div className="space-y-2">
                            <Label htmlFor={`uom-from-${idx}`} className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ps-1">{ti('from_uom')}</Label>
                            <select id={`uom-from-${idx}`} {...register(`uom_conversions.${idx}.from_uom_id`)}
                              className="h-10 px-3 bg-surface-container-highest/40 border-none rounded-sm w-full text-[10px] font-bold uppercase tracking-widest appearance-none outline-none focus-visible:ring-1 focus-visible:ring-indigo-500/20 transition-all">
                              <option value="" className="bg-surface-container-low">{t('source_unit')}</option>
                              {uoms?.data?.map((u) => <option key={u.id} value={u.id} className="bg-surface-container-low font-bold">{u.code}</option>)}
                            </select>
                          </div>
                           <div className="space-y-2">
                            <Label htmlFor={`uom-to-${idx}`} className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ps-1">{ti('to_uom')}</Label>
                            <select id={`uom-to-${idx}`} {...register(`uom_conversions.${idx}.to_uom_id`)}
                              className="h-10 px-3 bg-surface-container-highest/40 border-none rounded-sm w-full text-[10px] font-bold uppercase tracking-widest appearance-none outline-none focus-visible:ring-1 focus-visible:ring-indigo-500/20 transition-all">
                              <option value="" className="bg-surface-container-low">{t('target_unit')}</option>
                              {uoms?.data?.map((u) => <option key={u.id} value={u.id} className="bg-surface-container-low font-bold">{u.code}</option>)}
                            </select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`uom-factor-${idx}`} className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ps-1">{ti('factor')}</Label>
                            <Input id={`uom-factor-${idx}`} type="number" dir="ltr" min={0} step="any" 
                              className="h-10 px-3 bg-surface-container-highest/40 border-none rounded-sm font-mono font-bold text-indigo-400 text-xs focus-visible:ring-1 focus-visible:ring-indigo-500/20"
                              {...register(`uom_conversions.${idx}.factor`, { valueAsNumber: true })} />
                          </div>
                          <Button type="button" variant="ghost" size="icon" className="h-10 w-10 rounded-sm text-rose-500/40 hover:text-rose-500 hover:bg-rose-500/10 transition-all"
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
            <Card className="bg-surface-container-low border-none rounded-sm overflow-hidden">
              <CardContent className="p-8 space-y-8">
                <div className="flex items-center gap-3 pb-4 border-b border-surface-variant/10">
                  <div className="w-10 h-10 rounded-sm bg-emerald-500/10 flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold tracking-tight text-foreground uppercase">{t('status')}</h3>
                    <p className="text-[10px] font-bold text-muted-foreground/60/40 uppercase tracking-widest mt-0.5">{t('operational_availability')}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-surface-container-highest/20 rounded-sm border border-surface-variant/10 group transition-all hover:bg-surface-container-highest/30">
                    <div className="space-y-1">
                      <Label className="text-[10px] font-black uppercase tracking-widest cursor-pointer text-muted-foreground/60">{t('is_active')}</Label>
                      <p className={`text-xs font-bold uppercase tracking-tight ${isActive ? 'text-emerald-400' : 'text-rose-400'}`}>{isActive ? t('active') : t('inactive')}</p>
                    </div>
                    <Switch checked={isActive} onCheckedChange={(v) => setValue('is_active', v)} className="data-[state=checked]:bg-emerald-500" />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-surface-container-highest/20 rounded-sm border border-surface-variant/10 group transition-all hover:bg-surface-container-highest/30">
                    <div className="space-y-1">
                      <Label className="text-[10px] font-black uppercase tracking-widest cursor-pointer text-muted-foreground/60">{ti('track_lots')}</Label>
                      <p className={`text-xs font-bold uppercase tracking-tight ${trackLots ? 'text-cyan-400' : 'text-muted-foreground/40'}`}>{trackLots ? t('yes') : t('no')}</p>
                    </div>
                    <Switch checked={trackLots} onCheckedChange={(v) => setValue('track_lots', v)} className="data-[state=checked]:bg-cyan-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-surface-container-low border-none rounded-sm overflow-hidden">
              <CardContent className="p-8 space-y-8">
                <div className="flex items-center gap-3 pb-4 border-b border-surface-variant/10">
                  <div className="w-10 h-10 rounded-sm bg-blue-500/10 flex items-center justify-center">
                    <Settings2 className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold tracking-tight text-foreground uppercase">{ti('inventory_rules')}</h3>
                    <p className="text-[10px] font-bold text-muted-foreground/60/40 uppercase tracking-widest mt-0.5">{t('threshold_parameters')}</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="min-stock" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ps-1">{ti('min_stock_level')}</Label>
                    <Input id="min-stock" type="number" dir="ltr" min={0} 
                      className="h-12 px-4 bg-surface-container-highest/30 border-none rounded-sm font-mono font-bold text-blue-400 text-xs focus-visible:ring-1 focus-visible:ring-blue-500/20"
                      {...register('min_stock_level', { valueAsNumber: true })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reorder-point" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ps-1">{ti('reorder_point')}</Label>
                    <Input id="reorder-point" type="number" dir="ltr" min={0} 
                      className="h-12 px-4 bg-surface-container-highest/30 border-none rounded-sm font-mono font-bold text-blue-400 text-xs focus-visible:ring-1 focus-visible:ring-blue-500/20"
                      {...register('reorder_point', { valueAsNumber: true })} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </MasterDataFormLayout>
    </div>
  );
}
