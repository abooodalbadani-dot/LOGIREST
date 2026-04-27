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
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { useMasterDataItem, useMasterDataList, useMasterDataCreate, useMasterDataUpdate } from '@/features/master-data/hooks/useMasterDataCRUD';
import { ItemSchema, ItemFormSchema, type ItemFormValues, CategorySchema, UoMSchema } from '@/types/master-data';
import { ScanInput } from '@/components/shared/ScanInput/ScanInput';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { PageHeader } from '@/components/shared/PageHeader';

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
    { label: t('title'), href: `/${locale}/master-data` },
    { label: ti('title'), href: `/${locale}/master-data/items` },
    { label: id ? editTitle : createTitle, href: '#' }
  ];

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <Breadcrumb items={breadcrumbs} />

      <PageHeader 
        title={id ? editTitle : createTitle}
        actions={
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              onClick={() => router.back()}
              className="h-11 px-6 text-[10px] font-black uppercase tracking-widest border-white/10 hover:bg-white/5 rounded-sm"
            >
              {t('cancel')}
            </Button>
            <Button 
              onClick={onSubmit}
              disabled={isSaving}
              className="h-11 px-10 bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-sm shadow-lg shadow-cyan-900/20"
            >
              {isSaving ? t('saving') : t('save_changes')}
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Main Identity Card */}
          <Card className="bg-surface-container-low border-none rounded-sm overflow-hidden">
            <CardHeader className="border-b border-white/5 bg-surface-container-medium/30">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-cyan-500/10 rounded-sm">
                  <Package className="w-4 h-4 text-cyan-400" />
                </div>
                <div>
                  <CardTitle className="text-[11px] font-black uppercase tracking-[0.2em] text-foreground">{ti('basic_info')}</CardTitle>
                  <CardDescription className="text-[9px] font-bold uppercase tracking-tight text-muted-foreground/40">{t('name_en')} & {t('name_ar')}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="grid gap-2">
                  <Label htmlFor="item-code" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ps-1">{t('code')}</Label>
                  <Input id="item-code" dir="ltr" {...register('code')} className="h-11 bg-surface-container-highest/20 border-white/5 font-mono uppercase text-cyan-500" placeholder="SKU-001" />
                  {errors.code && <p className="text-[9px] text-red-400 font-bold uppercase tracking-tight ps-1">{errors.code.message}</p>}
                </div>
                <div className="grid gap-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ps-1">{ti('barcode')}</Label>
                  <div className="relative">
                    <ScanInput
                      onScan={(barcode) => setValue('barcode', barcode, { shouldValidate: true })}
                      placeholder={ti('scan_or_type')}
                    />
                    <input type="hidden" {...register('barcode')} />
                  </div>
                  {errors.barcode && <p className="text-[9px] text-red-400 font-bold uppercase tracking-tight ps-1">{errors.barcode.message}</p>}
                </div>
              </div>

              <div className="grid gap-6">
                <div className="grid gap-2">
                  <Label htmlFor="item-name-en" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ps-1">{t('name_en')}</Label>
                  <Input id="item-name-en" dir="ltr" {...register('name_en')} className="h-11 bg-surface-container-highest/20 border-white/5 font-bold" />
                  {errors.name_en && <p className="text-[9px] text-red-400 font-bold uppercase tracking-tight ps-1">{errors.name_en.message}</p>}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="item-name-ar" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ps-1">{t('name_ar')}</Label>
                  <Input id="item-name-ar" dir="rtl" {...register('name_ar')} className="h-11 bg-surface-container-highest/20 border-white/5 font-bold" />
                  {errors.name_ar && <p className="text-[9px] text-red-400 font-bold uppercase tracking-tight ps-1">{errors.name_ar.message}</p>}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Logistics & Inventory Card */}
          <Card className="bg-surface-container-low border-none rounded-sm overflow-hidden">
            <CardHeader className="border-b border-white/5 bg-surface-container-medium/30">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 rounded-sm">
                  <Boxes className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <CardTitle className="text-[11px] font-black uppercase tracking-[0.2em] text-foreground">{ti('classification')}</CardTitle>
                  <CardDescription className="text-[9px] font-bold uppercase tracking-tight text-muted-foreground/40">{ti('category')} & {ti('primary_uom')}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="grid gap-3">
                  <Label htmlFor="item-category" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ps-1">{ti('category')}</Label>
                  <select id="item-category" {...register('category_id')}
                    className="h-11 px-4 bg-surface-container-highest/20 border-white/5 rounded-sm w-full text-xs font-bold appearance-none hover:bg-surface-container-highest/30 transition-all outline-none focus:ring-1 focus:ring-cyan-500/50">
                    <option value="" className="bg-surface-container-low text-muted-foreground">—</option>
                    {categories?.data?.map((c) => (
                      <option key={c.id} value={c.id} className="bg-surface-container-low">
                        {locale === 'ar' ? c.name_ar : c.name_en}
                      </option>
                    ))}
                  </select>
                  {errors.category_id && <p className="text-[9px] text-red-400 font-bold uppercase tracking-tight ps-1">{errors.category_id.message}</p>}
                </div>

                <div className="grid gap-3">
                  <Label htmlFor="primary-uom" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ps-1">{ti('primary_uom')}</Label>
                  <select id="primary-uom" {...register('primary_uom_id')}
                    className="h-11 px-4 bg-surface-container-highest/20 border-white/5 rounded-sm w-full text-xs font-bold appearance-none hover:bg-surface-container-highest/30 transition-all outline-none focus:ring-1 focus:ring-cyan-500/50">
                    <option value="" className="bg-surface-container-low text-muted-foreground">—</option>
                    {uoms?.data?.map((u) => (
                      <option key={u.id} value={u.id} className="bg-surface-container-low uppercase tracking-wider">
                        {u.code} — {u.name_en}
                      </option>
                    ))}
                  </select>
                  {errors.primary_uom_id && <p className="text-[9px] text-red-400 font-bold uppercase tracking-tight ps-1">{errors.primary_uom_id.message}</p>}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Multi-UoM Conversions */}
          <Card className="bg-surface-container-low border-none rounded-sm overflow-hidden">
            <CardHeader className="border-b border-white/5 bg-surface-container-medium/30">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-500/10 rounded-sm">
                    <Scale className="w-4 h-4 text-indigo-400" />
                  </div>
                  <div>
                    <CardTitle className="text-[11px] font-black uppercase tracking-[0.2em] text-foreground">{ti('uom_conversions')}</CardTitle>
                    <CardDescription className="text-[9px] font-bold uppercase tracking-tight text-muted-foreground/40">{ti('add_conversion_logic')}</CardDescription>
                  </div>
                </div>
                <Button type="button" variant="outline" size="sm"
                  className="h-8 text-[9px] font-black uppercase tracking-widest border-indigo-500/20 hover:bg-indigo-500/5 text-indigo-400"
                  onClick={() => append({ from_uom_id: '', to_uom_id: '', factor: 1 })}>
                  <Plus className="w-3 h-3 mr-1.5 opacity-60" />{ti('add_conversion')}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {fields.length === 0 ? (
                <div className="py-12 text-center border-2 border-dashed border-white/5 rounded-sm bg-surface-container-highest/5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/20">{ti('no_conversions_defined')}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {fields.map((field, idx) => (
                    <div key={field.id} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto_auto] gap-4 items-end p-4 bg-surface-container-highest/5 rounded-sm border border-white/5 animate-in fade-in slide-in-from-right-2">
                      <div className="grid gap-2">
                        <Label htmlFor={`uom-from-${idx}`} className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 ps-1">{ti('from_uom')}</Label>
                        <select id={`uom-from-${idx}`} {...register(`uom_conversions.${idx}.from_uom_id`)}
                          className="h-10 px-3 bg-surface-container-highest/20 border-white/5 rounded-sm w-full text-[11px] font-black uppercase tracking-tighter appearance-none outline-none focus:ring-1 focus:ring-indigo-500/50">
                          <option value="" className="bg-surface-container-low text-muted-foreground">—</option>
                          {uoms?.data?.map((u) => <option key={u.id} value={u.id} className="bg-surface-container-low">{u.code}</option>)}
                        </select>
                      </div>
                       <div className="grid gap-2">
                        <Label htmlFor={`uom-to-${idx}`} className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 ps-1">{ti('to_uom')}</Label>
                        <select id={`uom-to-${idx}`} {...register(`uom_conversions.${idx}.to_uom_id`)}
                          className="h-10 px-3 bg-surface-container-highest/20 border-white/5 rounded-sm w-full text-[11px] font-black uppercase tracking-tighter appearance-none outline-none focus:ring-1 focus:ring-indigo-500/50">
                          <option value="" className="bg-surface-container-low text-muted-foreground">—</option>
                          {uoms?.data?.map((u) => <option key={u.id} value={u.id} className="bg-surface-container-low">{u.code}</option>)}
                        </select>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor={`uom-factor-${idx}`} className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 ps-1">{ti('factor')}</Label>
                        <Input id={`uom-factor-${idx}`} type="number" dir="ltr" min={0} step="any" className="w-24 h-10 bg-surface-container-highest/20 border-white/5 font-mono text-indigo-400"
                          {...register(`uom_conversions.${idx}.factor`, { valueAsNumber: true })} />
                      </div>
                      <Button type="button" variant="ghost" size="icon" className="h-10 w-10 text-rose-500/60 hover:text-rose-500 hover:bg-rose-500/10"
                        onClick={() => remove(idx)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Settings */}
        <div className="space-y-8">
          <Card className="bg-surface-container-low border-none rounded-sm overflow-hidden">
            <CardHeader className="border-b border-white/5 bg-surface-container-medium/30">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 rounded-sm">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <CardTitle className="text-[11px] font-black uppercase tracking-[0.2em] text-foreground">{t('status')}</CardTitle>
                  <CardDescription className="text-[9px] font-bold uppercase tracking-tight text-muted-foreground/40">{t('operational_state')}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="flex items-center justify-between p-4 bg-surface-container-highest/10 rounded-sm border border-white/5">
                <div className="space-y-0.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest cursor-pointer">{t('is_active')}</Label>
                  <p className="text-[9px] text-muted-foreground/40 font-bold uppercase">{isActive ? t('active') : t('inactive')}</p>
                </div>
                <Switch checked={isActive} onCheckedChange={(v) => setValue('is_active', v)} />
              </div>

              <div className="flex items-center justify-between p-4 bg-surface-container-highest/10 rounded-sm border border-white/5">
                <div className="space-y-0.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest cursor-pointer">{ti('track_lots')}</Label>
                  <p className="text-[9px] text-muted-foreground/40 font-bold uppercase">{trackLots ? t('yes') : t('no')}</p>
                </div>
                <Switch checked={trackLots} onCheckedChange={(v) => setValue('track_lots', v)} />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-surface-container-low border-none rounded-sm overflow-hidden">
            <CardHeader className="border-b border-white/5 bg-surface-container-medium/30">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-500/10 rounded-sm">
                  <Settings2 className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <CardTitle className="text-[11px] font-black uppercase tracking-[0.2em] text-foreground">{ti('inventory_rules')}</CardTitle>
                  <CardDescription className="text-[9px] font-bold uppercase tracking-tight text-muted-foreground/40">{ti('stock_thresholds')}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid gap-2">
                <Label htmlFor="min-stock" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ps-1">{ti('min_stock_level')}</Label>
                <Input id="min-stock" type="number" dir="ltr" min={0} className="h-11 bg-surface-container-highest/20 border-white/5 font-mono text-blue-400"
                  {...register('min_stock_level', { valueAsNumber: true })} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="reorder-point" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ps-1">{ti('reorder_point')}</Label>
                <Input id="reorder-point" type="number" dir="ltr" min={0} className="h-11 bg-surface-container-highest/20 border-white/5 font-mono text-blue-400"
                  {...register('reorder_point', { valueAsNumber: true })} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
