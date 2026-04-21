'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Plus, Trash2 } from 'lucide-react';
import { ScanInput } from '@/components/shared/ScanInput/ScanInput';
import { MasterDataFormLayout } from '@/features/master-data/components/MasterDataFormLayout';
import {
  useMasterDataItem, useMasterDataCreate, useMasterDataUpdate, useMasterDataList,
} from '@/features/master-data/hooks/useMasterDataCRUD';
import {
  ItemSchema, ItemFormSchema, CategorySchema, UoMSchema,
  type ItemFormValues,
} from '@/types/master-data';

interface Props { id: string | null; createTitle: string; editTitle: string; }

export function ItemFormClient({ id, createTitle, editTitle }: Props) {
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
    router.push('../items');
  });

  const isSaving = create.isPending || update.isPending;
  const trackLots = watch('track_lots');

  return (
    <MasterDataFormLayout title={id ? editTitle : createTitle} backHref="../items"
      isSaving={isSaving} onSubmit={onSubmit}>
      <div className="grid gap-4">
        {/* Code + Barcode */}
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="item-code">{t('code')}</Label>
            <Input id="item-code" dir="ltr" {...register('code')} />
            {errors.code && <p className="text-xs text-red-400">{errors.code.message}</p>}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="item-barcode">{ti('barcode')}</Label>
            <ScanInput
              onScan={(barcode) => setValue('barcode', barcode, { shouldValidate: true })}
              placeholder={ti('scan_or_type')}
            />
            <input type="hidden" {...register('barcode')} />
            {errors.barcode && <p className="text-xs text-red-400">{errors.barcode.message}</p>}
          </div>
        </div>

        {/* Names */}
        <div className="grid gap-1.5">
          <Label htmlFor="item-name-ar">{t('name_ar')}</Label>
          <Input id="item-name-ar" dir="rtl" {...register('name_ar')} />
          {errors.name_ar && <p className="text-xs text-red-400">{errors.name_ar.message}</p>}
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="item-name-en">{t('name_en')}</Label>
          <Input id="item-name-en" dir="ltr" {...register('name_en')} />
          {errors.name_en && <p className="text-xs text-red-400">{errors.name_en.message}</p>}
        </div>

        {/* Category + Primary UoM */}
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="item-cat">{ti('category')}</Label>
            <select id="item-cat" {...register('category_id')}
              className="px-3 py-2 bg-surface-2 border border-surface-3 rounded w-full">
              <option value="">—</option>
              {categories?.data?.map((c) => <option key={c.id} value={c.id}>{c.name_ar}</option>)}
            </select>
            {errors.category_id && <p className="text-xs text-red-400">{errors.category_id.message}</p>}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="item-uom">{ti('primary_uom')}</Label>
            <select id="item-uom" {...register('primary_uom_id')}
              className="px-3 py-2 bg-surface-2 border border-surface-3 rounded w-full">
              <option value="">—</option>
              {uoms?.data?.map((u) => <option key={u.id} value={u.id}>{u.code} — {u.name_en}</option>)}
            </select>
            {errors.primary_uom_id && <p className="text-xs text-red-400">{errors.primary_uom_id.message}</p>}
          </div>
        </div>

        {/* Track Lots toggle */}
        <div className="flex items-center gap-3">
          <Switch id="item-track-lots" checked={trackLots}
            onCheckedChange={(v) => setValue('track_lots', v)} />
          <Label htmlFor="item-track-lots">{ti('track_lots')}</Label>
        </div>

        {/* Stock levels */}
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="item-min-stock">{ti('min_stock_level')}</Label>
            <Input id="item-min-stock" type="number" dir="ltr" min={0}
              {...register('min_stock_level', { valueAsNumber: true })} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="item-reorder">{ti('reorder_point')}</Label>
            <Input id="item-reorder" type="number" dir="ltr" min={0}
              {...register('reorder_point', { valueAsNumber: true })} />
          </div>
        </div>

        {/* Active */}
        <div className="flex items-center gap-3">
          <Switch id="item-active" checked={watch('is_active')}
            onCheckedChange={(v) => setValue('is_active', v)} />
          <Label htmlFor="item-active">{t('is_active')}</Label>
        </div>

        <Separator />

        {/* UoM Conversions repeater */}
        <div className="grid gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">{ti('uom_conversions')}</h3>
            <Button type="button" variant="outline" size="sm"
              onClick={() => append({ from_uom_id: '', to_uom_id: '', factor: 1 })}>
              <Plus className="w-3 h-3 me-1" />{ti('add_conversion')}
            </Button>
          </div>

          {fields.length === 0 && (
            <p className="text-sm text-text-muted">—</p>
          )}

          {fields.map((field, idx) => (
            <div key={field.id} className="grid grid-cols-[1fr_1fr_auto_auto] gap-2 items-end">
              <div className="grid gap-1">
                <Label className="text-xs">{ti('from_uom')}</Label>
                <select {...register(`uom_conversions.${idx}.from_uom_id`)}
                  className="px-2 py-1.5 text-sm bg-surface-2 border border-surface-3 rounded">
                  <option value="">—</option>
                  {uoms?.data?.map((u) => <option key={u.id} value={u.id}>{u.code}</option>)}
                </select>
              </div>
              <div className="grid gap-1">
                <Label className="text-xs">{ti('to_uom')}</Label>
                <select {...register(`uom_conversions.${idx}.to_uom_id`)}
                  className="px-2 py-1.5 text-sm bg-surface-2 border border-surface-3 rounded">
                  <option value="">—</option>
                  {uoms?.data?.map((u) => <option key={u.id} value={u.id}>{u.code}</option>)}
                </select>
              </div>
              <div className="grid gap-1">
                <Label className="text-xs">{ti('factor')}</Label>
                <Input type="number" dir="ltr" min={0} step="any" className="w-24"
                  {...register(`uom_conversions.${idx}.factor`, { valueAsNumber: true })} />
              </div>
              <Button type="button" variant="ghost" size="icon" className="text-red-400 hover:text-red-300"
                onClick={() => remove(idx)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </MasterDataFormLayout>
  );
}
