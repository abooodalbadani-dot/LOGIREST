'use client';

import { useEffect } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { useForm, Controller, useWatch } from 'react-hook-form';
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
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { ErrorState } from '@/components/shared/ErrorState';

interface Props {
  id: string | null;
  createTitle: string;
  editTitle: string;
  viewTitle?: string;
  locale: string;
  isReadOnly?: boolean;
}

export function WarehouseFormClient({ id, createTitle, editTitle, viewTitle, locale, isReadOnly = false }: Props) {
  const t = useTranslations('common');
  const tw = useTranslations('master_data.warehouses');
  const router = useRouter();

  const { data, isLoading, isError, isFetched, refetch } = useWarehouse(id);
  const { data: branchesData, isLoading: isLoadingBranches, isError: isErrorBranches } = useBranches();
  const branches = branchesData?.data || [];
  const create = useCreateWarehouse();
  const update = useUpdateWarehouse();

  const { register, handleSubmit, reset, setValue, control, formState: { errors, isDirty, isValid } } =
    useForm<WarehouseFormValues>({
      resolver: zodResolver(WarehouseFormSchema),
      disabled: isReadOnly,
      defaultValues: { branch_id: '', code: '', name_ar: '', name_en: '', type: 'MAIN', is_active: true },
    });

  const isActive = useWatch({ control, name: 'is_active' });

  useEffect(() => {
    if (data) {
      reset({ branch_id: data.branch_id, code: data.code, name_ar: data.name_ar, name_en: data.name_en, type: data.type, is_active: data.is_active });
    }
  }, [data, reset]);

  // 1. Loading State
  if ((id && isLoading) || isLoadingBranches) {
    return <PageSkeleton variant="detail" />;
  }

  // 2. Not Found State (Smart 404)
  if (id && isFetched && !data) {
    return (
      <ErrorState 
        type="not_found" 
        onRetry={() => router.push('/master-data/warehouses')} 
      />
    );
  }

  // 3. Server Error State
  if (isError || isErrorBranches) {
    return (
      <ErrorState 
        type="server_error" 
        onRetry={() => refetch()} 
      />
    );
  }

  const onSubmit = handleSubmit(async (values) => {
    if (isReadOnly) return;
    try {
      if (id) {
        await update.mutateAsync({ id, values });
      } else {
        await create.mutateAsync(values);
      }
      router.push('/master-data/warehouses');
    } catch (error) {
      // Error handled by mutation hook
    }
  });

  const isSaving = create.isPending || update.isPending;

  // Determine the display title
  const displayTitle = id 
    ? (isReadOnly ? (viewTitle || tw('view_title')) : editTitle)
    : createTitle;

  return (
    <MasterDataFormLayout 
      title={displayTitle} 
      backHref='/master-data/warehouses' 
      isSaving={isSaving} 
      onSubmit={onSubmit}
      hideSave={isReadOnly}
      isDirty={isDirty}
      isValid={isValid}
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
                  <h3 className="text-body-md font-semibold text-foreground uppercase">{tw('title')}</h3>
                  <p className="text-label-xs font-semibold text-muted-foreground/60 uppercase mt-0.5">
                    {tw('description')}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <Label htmlFor="wh-branch" className="text-label-xs font-semibold uppercase text-muted-foreground/70">
                    {tw('fields.branch')}
                  </Label>
                  <Controller
                    name="branch_id"
                    control={control}
                    render={({ field }) => (
                      <Select 
                        value={field.value} 
                        onValueChange={field.onChange}
                        disabled={isReadOnly}
                      >
                        <SelectTrigger id="wh-branch">
                          <SelectValue placeholder="—" />
                        </SelectTrigger>
                        <SelectContent>
                          {branches.map((b) => (
                            <SelectItem key={b.id} value={b.id} className="font-semibold text-label-sm uppercase">
                              {b.code} — {b.name_en}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.branch_id && <p className="text-label-xs font-semibold text-status-error uppercase">{tw(`validation.${errors.branch_id.message}`)}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="wh-code" className="text-label-xs font-semibold uppercase text-muted-foreground/70">
                    {tw('fields.code')}
                  </Label>
                  <Input 
                    id="wh-code" 
                    dir="ltr" 
                    {...register('code')} 
                    disabled={isReadOnly}
                    className="font-mono font-semibold uppercase text-status-active"
                    placeholder="e.g. WH-001"
                  />
                  {errors.code && <p className="text-label-xs font-semibold text-status-error uppercase">{tw(`validation.${errors.code.message}`)}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <Label htmlFor="wh-name-en" className="text-label-xs font-semibold uppercase text-muted-foreground/70">
                    {tw('fields.name_en')}
                  </Label>
                  <Input 
                    id="wh-name-en" 
                    dir="ltr" 
                    {...register('name_en')} 
                    disabled={isReadOnly}
                    className="font-semibold" 
                  />
                  {errors.name_en && <p className="text-label-xs font-semibold text-status-error uppercase">{tw(`validation.${errors.name_en.message}`)}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wh-name-ar" className="text-label-xs font-semibold uppercase text-muted-foreground/70">
                    {tw('fields.name_ar')}
                  </Label>
                  <Input 
                    id="wh-name-ar" 
                    dir="rtl" 
                    {...register('name_ar')} 
                    disabled={isReadOnly}
                    className="font-semibold text-end" 
                  />
                  {errors.name_ar && <p className="text-label-xs font-semibold text-status-error uppercase">{tw(`validation.${errors.name_ar.message}`)}</p>}
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
                  <h3 className="text-body-md font-semibold text-foreground uppercase">{tw('fields.type')}</h3>
                  <p className="text-label-xs font-semibold text-muted-foreground/60 uppercase mt-0.5">
                    {t('operational_status')}
                  </p>
                </div>
              </div>

              <div className="space-y-2 max-w-md">
                <Label htmlFor="wh-type" className="text-label-xs font-semibold uppercase text-muted-foreground/70">
                  {tw('fields.type')}
                </Label>
                <Controller
                  name="type"
                  control={control}
                  render={({ field }) => (
                    <Select 
                      value={field.value} 
                      onValueChange={field.onChange}
                      disabled={isReadOnly}
                    >
                      <SelectTrigger id="wh-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(['MAIN','DRY','COLD','VIRTUAL'] as const).map((ty) => (
                          <SelectItem key={ty} value={ty} className="font-semibold text-label-sm uppercase">
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
                  <h3 className="text-body-md font-semibold text-foreground uppercase">{t('status')}</h3>
                  <p className="text-label-xs font-semibold text-muted-foreground/60 uppercase mt-0.5">
                    {t('operational_status')}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-surface-container-highest/20 rounded-md border border-surface-variant/10 group transition-all hover:bg-surface-container-highest/30">
                <div className="space-y-1">
                  <Label htmlFor="wh-active" className="text-label-xs font-semibold uppercase cursor-pointer text-muted-foreground/60">{tw('fields.is_active')}</Label>
                  <p className={`text-label-sm font-semibold uppercase ${isActive ? 'text-status-active' : 'text-status-error'}`}>
                    {isActive ? t('active') : t('inactive')}
                  </p>
                </div>
                <Switch 
                  id="wh-active" 
                  checked={isActive} 
                  onCheckedChange={(v: boolean) => !isReadOnly && setValue('is_active', v)} 
                  disabled={isReadOnly}
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
