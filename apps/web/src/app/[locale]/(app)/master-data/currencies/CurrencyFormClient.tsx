'use client';

import { useEffect } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { MasterDataFormLayout } from '@/features/master-data/components/MasterDataFormLayout';
import { useCurrency, useCreateCurrency, useUpdateCurrency } from '@/features/currencies/hooks/useCurrencies';
import { CurrencyFormSchema, type CurrencyFormValues } from '@/types/master-data';
import { Card, CardContent } from '@/components/ui/card';
import { Landmark, Type, Coins, Activity, ShieldCheck } from 'lucide-react';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { ErrorState } from '@/components/shared/ErrorState';

import { useUnsavedChangesGuard } from '@/lib/unsaved-changes/useUnsavedChangesGuard';
import { useConflictHandler } from '@/core/concurrency/useConflictHandler';
import { ConflictDialog } from '@/core/concurrency/ConflictDialog';

interface Props {
  id: string | null;
  createTitle: string;
  editTitle: string;
  viewTitle?: string;
  isReadOnly?: boolean;
  locale: string;
}

export function CurrencyFormClient({ 
  id, 
  createTitle, 
  editTitle, 
  viewTitle = '',
  isReadOnly = false,
  locale 
}: Props) {
  const t = useTranslations('master_data.currencies');
  const { data: currency, isLoading, isError, isFetched, refetch } = useCurrency(id);
  const create = useCreateCurrency();
  const conflict = useConflictHandler('currency', id ?? '');
  const update = useUpdateCurrency({ onConflict: conflict.triggerConflict });

  const { register, handleSubmit, reset, control, formState: { errors, isDirty, isValid } } =
    useForm<CurrencyFormValues>({
      resolver: zodResolver(CurrencyFormSchema),
      disabled: isReadOnly,
      defaultValues: { 
        code: '', 
        name_ar: '', 
        name_en: '', 
        symbol: '',
        is_base_currency: false,
        is_active: true,
        version: undefined
      },
    });

  const { router: guardedRouter } = useUnsavedChangesGuard(isDirty);

  useWatch({ control, name: 'code' });

  // 1. Loading State
  if (id && isLoading) {
    return <PageSkeleton variant="detail" />;
  }

  // 2. Error State (Server/Network Error)
  if (id && isError) {
    return (
      <ErrorState 
        type="server_error"
        onRetry={() => refetch()}
      />
    );
  }

  // 3. Not Found State (Smart 404)
  if (id && isFetched && !currency) {
    return (
      <ErrorState 
        type="not_found"
        onBack={() => guardedRouter.push('/master-data/currencies', { skipGuard: true })}
      />
    );
  }

  useEffect(() => {
    if (currency) {
      reset({ 
        code: currency.code, 
        name_ar: currency.name_ar,
        name_en: currency.name_en, 
        symbol: currency.symbol || '',
        is_base_currency: currency.is_base_currency,
        is_active: currency.is_active,
        version: currency.version
      });
    }
  }, [currency, reset]);

  const onSubmit = handleSubmit(async (values) => {
    if (isReadOnly) return;
    
    try {
      if (id) {
        await update.mutateAsync({ id, values });
      } else {
        await create.mutateAsync(values);
      }
      guardedRouter.push('/master-data/currencies', { skipGuard: true });
    } catch {
      // Error handled by mutation hooks or conflict handler
    }
  });

  const displayTitle = isReadOnly ? viewTitle : (id ? editTitle : createTitle);

  return (
    <>
    <MasterDataFormLayout 
      title={displayTitle} 
      backHref='/master-data/currencies'
      isSaving={create.isPending || update.isPending} 
      onSubmit={onSubmit}
      onCancel={() => guardedRouter.push('/master-data/currencies')}
      hideSave={isReadOnly}
      isDirty={isDirty}
      isValid={isValid}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Identity Card */}
          <Card className="bg-surface-container-low border-none rounded-md overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-cyan-900/10">
            <CardContent className="p-8 space-y-8">
              <div className="flex items-center gap-3 pb-4 border-b border-surface-variant/10">
                <div className="w-10 h-10 rounded-md bg-cyan-500/10 flex items-center justify-center">
                  <Landmark className="w-5 h-5 text-cyan-500" />
                </div>
                <div>
                  <h3 className="text-body-md font-semibold text-foreground uppercase">{t('title')}</h3>
                  <p className="text-label-xs font-semibold text-muted-foreground/60 uppercase mt-0.5">{t('description')}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Code Field */}
                <div className="space-y-2">
                  <Label htmlFor="curr-code" className="text-label-xs font-semibold uppercase text-muted-foreground/70">
                    {t('fields.code')}
                  </Label>
                  <div className="relative group">
                    <Coins className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40 group-focus-within:text-cyan-500 transition-colors" />
                    <Input 
                      id="curr-code" 
                      placeholder={t('placeholders.code')}
                      dir="ltr" 
                      maxLength={3}
                      {...register('code')} 
                      disabled={isReadOnly}
                      className="h-11 ps-10 border-none bg-surface-container-high/40 focus:bg-surface-container-high transition-colors font-mono font-bold text-label-sm uppercase text-cyan-500 disabled:opacity-70"
                    />
                  </div>
                  {errors.code?.message && (
                    <p className="text-label-xs font-semibold text-rose-400 uppercase">
                      {t(errors.code.message as Parameters<typeof t>[0])}
                    </p>
                  )}
                </div>

                {/* Symbol Field */}
                <div className="space-y-2">
                  <Label htmlFor="curr-symbol" className="text-label-xs font-semibold uppercase text-muted-foreground/70">
                    {t('fields.symbol')}
                  </Label>
                  <div className="relative group">
                    <Type className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40 group-focus-within:text-amber-500 transition-colors" />
                    <Input 
                      id="curr-symbol" 
                      placeholder={t('placeholders.symbol')}
                      {...register('symbol')} 
                      disabled={isReadOnly}
                      className="h-11 ps-10 border-none bg-surface-container-high/40 focus:bg-surface-container-high transition-colors font-mono font-bold text-label-sm text-amber-500 disabled:opacity-70"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Name EN */}
                <div className="space-y-2">
                  <Label htmlFor="curr-name-en" className="text-label-xs font-semibold uppercase text-muted-foreground/70">
                    {t('fields.name_en')}
                  </Label>
                  <Input 
                    id="curr-name-en" 
                    {...register('name_en')} 
                    disabled={isReadOnly}
                    className="h-11 border-none bg-surface-container-high/40 focus:bg-surface-container-high transition-colors text-label-sm font-bold disabled:opacity-70"
                  />
                  {errors.name_en?.message && (
                    <p className="text-label-xs font-semibold text-rose-400 uppercase">
                      {t(errors.name_en.message as Parameters<typeof t>[0])}
                    </p>
                  )}
                </div>

                {/* Name AR */}
                <div className="space-y-2">
                  <Label htmlFor="curr-name-ar" className="text-label-xs font-semibold uppercase text-muted-foreground/70">
                    {t('fields.name_ar')}
                  </Label>
                  <Input 
                    id="curr-name-ar" 
                    dir="rtl"
                    {...register('name_ar')} 
                    disabled={isReadOnly}
                    className="h-11 border-none bg-surface-container-high/40 focus:bg-surface-container-high transition-colors text-label-sm font-bold disabled:opacity-70"
                  />
                  {errors.name_ar?.message && (
                    <p className="text-label-xs font-semibold text-rose-400 uppercase">
                      {t(errors.name_ar.message as Parameters<typeof t>[0])}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Configuration */}
        <div className="space-y-8">
          <Card className="bg-surface-container-low border-none rounded-md overflow-hidden">
            <CardContent className="p-8 space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-surface-variant/10">
                <div className="w-10 h-10 rounded-md bg-status-active/10 flex items-center justify-center">
                  <Activity className="w-5 h-5 text-status-active" />
                </div>
                <div>
                  <h3 className="text-body-md font-semibold text-foreground uppercase">{t('config_title')}</h3>
                  <p className="text-label-xs font-semibold text-muted-foreground/60 uppercase mt-0.5">{t('config_subtitle')}</p>
                </div>
              </div>
              
              {/* Base Currency Switch */}
              <div className="flex items-center justify-between p-4 bg-amber-500/5 rounded-md border border-amber-500/10">
                <div className="space-y-0.5">
                  <Label className="text-label-xs font-bold uppercase text-foreground/80">{t('fields.is_base')}</Label>
                  <p className="text-label-xxs text-muted-foreground uppercase font-medium">{t('placeholders.base_desc')}</p>
                </div>
                <Controller
                  name="is_base_currency"
                  control={control}
                  render={({ field }) => (
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isReadOnly}
                      className="data-[state=checked]:bg-amber-500"
                    />
                  )}
                />
              </div>

              {/* Status Switch */}
              <div className="flex items-center justify-between p-4 bg-surface-container-highest/10 rounded-md border border-surface-variant/5">
                <div className="space-y-0.5">
                  <Label className="text-label-xs font-bold uppercase text-foreground/80">{t('fields.is_active')}</Label>
                  <p className="text-label-xxs text-muted-foreground uppercase font-medium">{t('placeholders.active_desc')}</p>
                </div>
                <Controller
                  name="is_active"
                  control={control}
                  render={({ field }) => (
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isReadOnly}
                      className="data-[state=checked]:bg-status-active"
                    />
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Guidelines */}
          <Card className="bg-surface-container-low border-none rounded-md overflow-hidden">
            <CardContent className="p-8 space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-surface-variant/10">
                <div className="w-10 h-10 rounded-md bg-tertiary-container/10 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-tertiary" />
                </div>
                <div>
                  <h3 className="text-body-md font-semibold text-foreground uppercase">{t('standards_title')}</h3>
                  <p className="text-label-xs font-semibold text-muted-foreground/60 uppercase mt-0.5">{t('standards_subtitle')}</p>
                </div>
              </div>
              
              <ul className="space-y-4">
                <li className="text-label-xs text-muted-foreground/80 leading-relaxed font-medium flex gap-3">
                  <span className="text-cyan-500/60 font-semibold">/</span>
                  <span>{t('tips.base_currency_desc')}</span>
                </li>
                <li className="text-label-xs text-muted-foreground/80 leading-relaxed font-medium flex gap-3">
                  <span className="text-cyan-500/60 font-semibold">/</span>
                  <span>{t('tips.iso_standard_desc')}</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </MasterDataFormLayout>
      <ConflictDialog open={conflict.open} onReload={conflict.handleReload} onClose={conflict.handleClose} />
    </>
  );
}

