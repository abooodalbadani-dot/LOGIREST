'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
import { MasterDataFormLayout } from '@/features/master-data/components/MasterDataFormLayout';
import {
  useWarehouse,
  useCreateWarehouse,
  useUpdateWarehouse,
} from '@/features/warehouses/hooks/useWarehouses';
import { useBranches } from '@/features/branches/hooks/useBranches';
import {
  WarehouseFormSchema,
  type WarehouseFormValues,
} from '@/types/master-data';

import { Card, CardContent } from '@/components/ui/card';
import { Warehouse, MapPin, Activity } from 'lucide-react';

interface Props { id: string | null; createTitle: string; editTitle: string; locale: string; }

export function WarehouseFormClient({ id, createTitle, editTitle, locale }: Props) {
  const t = useTranslations('common');
  const tw = useTranslations('master_data.warehouses');
  const router = useRouter();

  const { data } = useWarehouse(id);
  const { data: branches = [] } = useBranches();
  const create = useCreateWarehouse();
  const update = useUpdateWarehouse();

  const { register, handleSubmit, reset, setValue, watch, control, formState: { errors } } =
    useForm<WarehouseFormValues>({
      resolver: zodResolver(WarehouseFormSchema),
      defaultValues: { branch_id: '', code: '', name_ar: '', name_en: '', type: 'MAIN', is_active: true },
    });

  const isActive = watch('is_active');

  useEffect(() => {
    if (data) {
      reset({ branch_id: data.branch_id, code: data.code, name_ar: data.name_ar, name_en: data.name_en, type: data.type, is_active: data.is_active });
    }
  }, [data, reset]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      if (id) {
        await update.mutateAsync({ id, values });
      } else {
        await create.mutateAsync(values);
      }
      router.push(`/${locale}/master-data/warehouses`);
    } catch (error) {
      // Error handled by mutation hook
    }
  });

  const isSaving = create.isPending || update.isPending;

  return (
    <MasterDataFormLayout 
      title={id ? editTitle : createTitle} 
      backHref={`/${locale}/master-data/warehouses`} 
      isSaving={isSaving} 
      onSubmit={onSubmit}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Card className="bg-surface-container-low border-none overflow-hidden">
            <CardContent className="p-8 space-y-8">
              <div className="flex items-center gap-3 pb-4 border-b border-surface-variant/10">
                <div className="w-10 h-10 rounded-md bg-tertiary-container/10 flex items-center justify-center">
                  <Warehouse className="w-5 h-5 text-tertiary" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold tracking-[0.08em] text-foreground uppercase">{tw('title')}</h3>
                  <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-[0.08em] mt-0.5">
                    {tw('description')}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <Label htmlFor="wh-branch" className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">
                    {tw('fields.branch')}
                  </Label>
                  <Controller
                    name="branch_id"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger id="wh-branch">
                          <SelectValue placeholder="—" />
                        </SelectTrigger>
                        <SelectContent>
                          {branches.map((b) => (
                            <SelectItem key={b.id} value={b.id} className="font-semibold text-xs uppercase tracking-[0.08em]">
                              {b.code} — {b.name_en}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.branch_id && <p className="text-[10px] font-semibold text-status-error uppercase tracking-tight">{tw(`validation.${errors.branch_id.message}`)}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="wh-code" className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">
                    {tw('fields.code')}
                  </Label>
                  <Input 
                    id="wh-code" 
                    dir="ltr" 
                    {...register('code')} 
                    className="font-mono font-semibold uppercase tracking-[0.08em] text-status-active"
                    placeholder="e.g. WH-001"
                  />
                  {errors.code && <p className="text-[10px] font-semibold text-status-error uppercase tracking-tight">{tw(`validation.${errors.code.message}`)}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <Label htmlFor="wh-name-en" className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">
                    {tw('fields.name_en')}
                  </Label>
                  <Input id="wh-name-en" dir="ltr" {...register('name_en')} className="font-semibold" />
                  {errors.name_en && <p className="text-[10px] font-semibold text-status-error uppercase tracking-tight">{tw(`validation.${errors.name_en.message}`)}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wh-name-ar" className="text-[10px] font-semibold uppercase tracking-normal text-muted-foreground/70">
                    {tw('fields.name_ar')}
                  </Label>
                  <Input id="wh-name-ar" dir="rtl" {...register('name_ar')} className="font-semibold text-end" />
                  {errors.name_ar && <p className="text-[10px] font-semibold text-status-error uppercase tracking-tight">{tw(`validation.${errors.name_ar.message}`)}</p>}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-surface-container-low border-none overflow-hidden">
            <CardContent className="p-8 space-y-8">
              <div className="flex items-center gap-3 pb-4 border-b border-surface-variant/10">
                <div className="w-10 h-10 rounded-md bg-tertiary-container/10 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-tertiary" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold tracking-[0.08em] text-foreground uppercase">{tw('fields.type')}</h3>
                  <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-[0.08em] mt-0.5">
                    {t('operational_status')}
                  </p>
                </div>
              </div>

              <div className="space-y-2 max-w-md">
                <Label htmlFor="wh-type" className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">
                  {tw('fields.type')}
                </Label>
                <Controller
                  name="type"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="wh-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(['MAIN','DRY','COLD','VIRTUAL'] as const).map((ty) => (
                          <SelectItem key={ty} value={ty} className="font-semibold text-xs uppercase tracking-[0.08em]">
                            {tw(`types.${ty.toLowerCase()}` as any)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
          <Card className="bg-surface-container-low border-none overflow-hidden">
            <CardContent className="p-8 space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-surface-variant/10">
                <div className="w-10 h-10 rounded-md bg-tertiary-container/10 flex items-center justify-center">
                  <Activity className="w-5 h-5 text-tertiary" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold tracking-[0.08em] text-foreground uppercase">{t('status')}</h3>
                  <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-[0.08em] mt-0.5">
                    {t('operational_status')}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-surface-container-highest/20 rounded-md border border-surface-variant/10 group transition-all hover:bg-surface-container-highest/30">
                <div className="space-y-1">
                  <Label htmlFor="wh-active" className="text-[10px] font-semibold uppercase tracking-[0.08em] cursor-pointer text-muted-foreground/60">{tw('fields.is_active')}</Label>
                  <p className={`text-xs font-semibold uppercase tracking-tight ${isActive ? 'text-status-active' : 'text-status-error'}`}>
                    {isActive ? t('active') : t('inactive')}
                  </p>
                </div>
                <Switch 
                  id="wh-active" 
                  checked={isActive} 
                  onCheckedChange={(v: boolean) => setValue('is_active', v)} 
                  className="data-[state=checked]:bg-status-active"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MasterDataFormLayout>
  );
}
