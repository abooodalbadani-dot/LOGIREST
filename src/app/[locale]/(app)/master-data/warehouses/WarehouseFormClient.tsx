'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { MasterDataFormLayout } from '@/features/master-data/components/MasterDataFormLayout';
import {
  useMasterDataItem, useMasterDataCreate, useMasterDataUpdate, useMasterDataList,
} from '@/features/master-data/hooks/useMasterDataCRUD';
import {
  WarehouseSchema, WarehouseFormSchema, BranchSchema,
  type WarehouseFormValues,
} from '@/types/master-data';

import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { Card, CardContent } from '@/components/ui/card';
import { Warehouse, MapPin, Activity } from 'lucide-react';

interface Props { id: string | null; createTitle: string; editTitle: string; }

export function WarehouseFormClient({ id, createTitle, editTitle, locale }: Props & { locale: string }) {
  const t = useTranslations('masterData.common');
  const tw = useTranslations('masterData.warehouses');
  const router = useRouter();

  const { data } = useMasterDataItem('warehouses', id, WarehouseSchema);
  const { data: branches } = useMasterDataList('branches', BranchSchema);
  const create = useMasterDataCreate('warehouses', WarehouseSchema);
  const update = useMasterDataUpdate('warehouses', WarehouseSchema);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } =
    useForm<WarehouseFormValues>({
      resolver: zodResolver(WarehouseFormSchema),
      defaultValues: { branch_id: '', code: '', name_ar: '', name_en: '', type: 'MAIN', is_active: true },
    });

  useEffect(() => {
    if (data) {
      reset({ branch_id: data.branch_id, code: data.code, name_ar: data.name_ar, name_en: data.name_en, type: data.type, is_active: data.is_active });
    }
  }, [data, reset]);

  const onSubmit = handleSubmit(async (values) => {
    if (id) await update.mutateAsync({ id, body: values });
    else await create.mutateAsync(values);
    router.push(`/${locale}/master-data/warehouses`);
  });

  const isSaving = create.isPending || update.isPending;

  return (
    <div className="space-y-6">
      <Breadcrumb 
        items={[
          { label: t('home'), href: `/${locale}/dashboard` },
          { label: t('master_data'), href: `/${locale}/master-data` },
          { label: tw('title'), href: `/${locale}/master-data/warehouses` },
          { label: id ? editTitle : createTitle, href: '#' }
        ]} 
      />
      <MasterDataFormLayout title={id ? editTitle : createTitle} backHref={`/${locale}/master-data/warehouses`} isSaving={isSaving} onSubmit={onSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <Card className="bg-surface-container-low border-none rounded-sm overflow-hidden">
              <CardContent className="p-6 space-y-8">
                <div className="flex items-center gap-3 pb-4 border-b border-surface-variant/10">
                  <div className="w-10 h-10 rounded-sm bg-cyan-500/10 flex items-center justify-center">
                    <Warehouse className="w-5 h-5 text-cyan-500" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold tracking-tight">{tw('warehouse_configuration')}</h3>
                    <p className="text-[10px] text-muted-foreground/60 uppercase tracking-widest font-medium">
                      {tw('branch_mapping_details')}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <Label htmlFor="wh-branch" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">
                      {tw('branch')}
                    </Label>
                    <select
                      id="wh-branch"
                      {...register('branch_id')}
                      className="bg-surface-container-highest/30 border-none h-12 text-sm font-bold focus-visible:ring-1 focus-visible:ring-cyan-500/50 rounded-sm w-full ps-3 pe-3"
                    >
                      <option value="">—</option>
                      {branches?.data?.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name_ar} / {b.name_en}
                        </option>
                      ))}
                    </select>
                    {errors.branch_id && <p className="text-[10px] font-bold text-rose-400 uppercase tracking-tight">{t(errors.branch_id.message as any)}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="wh-code" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">
                      {t('code')}
                    </Label>
                    <Input id="wh-code" dir="ltr" {...register('code')} className="bg-surface-container-highest/30 border-none h-12 text-sm font-bold focus-visible:ring-1 focus-visible:ring-cyan-500/50" />
                    {errors.code && <p className="text-[10px] font-bold text-rose-400 uppercase tracking-tight">{t(errors.code.message as any)}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <Label htmlFor="wh-name-en" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">
                      {t('name_en')}
                    </Label>
                    <Input id="wh-name-en" dir="ltr" {...register('name_en')} className="bg-surface-container-highest/30 border-none h-12 text-sm font-bold focus-visible:ring-1 focus-visible:ring-cyan-500/50" />
                    {errors.name_en && <p className="text-[10px] font-bold text-rose-400 uppercase tracking-tight">{t(errors.name_en.message as any)}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="wh-name-ar" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">
                      {t('name_ar')}
                    </Label>
                    <Input id="wh-name-ar" dir="rtl" {...register('name_ar')} className="bg-surface-container-highest/30 border-none h-12 text-sm font-bold focus-visible:ring-1 focus-visible:ring-cyan-500/50 text-end" />
                    {errors.name_ar && <p className="text-[10px] font-bold text-rose-400 uppercase tracking-tight">{t(errors.name_ar.message as any)}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-surface-container-low border-none rounded-sm overflow-hidden">
              <CardContent className="p-6 space-y-8">
                <div className="flex items-center gap-3 pb-4 border-b border-surface-variant/10">
                  <div className="w-10 h-10 rounded-sm bg-amber-500/10 flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold tracking-tight">{tw('physical_location_settings')}</h3>
                    <p className="text-[10px] text-muted-foreground/60 uppercase tracking-widest font-medium">
                      {tw('type')}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="wh-type" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">
                    {tw('type')}
                  </Label>
                  <select
                    id="wh-type"
                    {...register('type')}
                    className="bg-surface-container-highest/30 border-none h-12 text-sm font-bold focus-visible:ring-1 focus-visible:ring-cyan-500/50 rounded-sm w-full ps-3 pe-3"
                  >
                    {(['MAIN','DRY','COLD','VIRTUAL'] as const).map((ty) => (
                      <option key={ty} value={ty}>{tw(`types.${ty.toLowerCase()}` as Parameters<typeof tw>[0])}</option>
                    ))}
                  </select>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-8">
            <Card className="bg-surface-container-low border-none rounded-sm overflow-hidden">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-3 pb-4 border-b border-surface-variant/10">
                  <div className="w-10 h-10 rounded-sm bg-emerald-500/10 flex items-center justify-center">
                    <Activity className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500">
                      {tw('operational_status')}
                    </h4>
                    <p className="text-[11px] text-muted-foreground/60 leading-relaxed">
                      {tw('status_description')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between py-3 px-4 bg-surface-container-highest/20 rounded-sm">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">{t('status')}</span>
                    <span className={`text-[11px] font-bold uppercase tracking-tight ${watch('is_active') ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {watch('is_active') ? t('active') : t('inactive')}
                    </span>
                  </div>
                  <Switch 
                    id="wh-active" 
                    checked={watch('is_active')} 
                    onCheckedChange={(v: boolean) => setValue('is_active', v)} 
                    className="data-[state=checked]:bg-emerald-500"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </MasterDataFormLayout>
    </div>
  );
}
