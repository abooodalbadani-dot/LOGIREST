'use client';

import { useEffect } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { useUnsavedChangesGuard } from '@/lib/unsaved-changes/useUnsavedChangesGuard';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { MasterDataFormLayout } from '@/features/master-data/components/MasterDataFormLayout';
import { useFXRate, useCreateFXRate, useUpdateFXRate } from '@/features/fx-rates/hooks/useFXRates';
import { useCurrencies } from '@/features/currencies/hooks/useCurrencies';
import { FXRateFormSchema, type FXRateFormValues, type Currency } from '@/types/master-data';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { ArrowRightLeft, Calendar, TrendingUp, History, Info, ShieldCheck, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { ErrorState } from '@/components/shared/ErrorState';

interface Props { 
  id: string | null; 
  createTitle: string; 
  editTitle: string; 
  viewTitle?: string;
  isReadOnly?: boolean;
  locale: string;
}

export function FXRateFormClient({ 
  id, 
  createTitle, 
  editTitle, 
  viewTitle = '',
  isReadOnly: isReadOnlyProp = false,
  locale 
}: Props) {
  const tc = useTranslations('common');
  const t = useTranslations('master_data.fx_rates');
  
  const { data: fxRate, isLoading: loadingRate, isError: rateError, refetch: refetchRate } = useFXRate(id);
  const { data: currencies, isLoading: loadingCurrencies, isError: currenciesError, refetch: refetchCurrencies } = useCurrencies();
  
  const create = useCreateFXRate();
  const update = useUpdateFXRate();

  const { register, handleSubmit, reset, control, formState: { errors, isDirty, isValid } } =
    useForm<FXRateFormValues>({
      resolver: zodResolver(FXRateFormSchema),
      disabled: isReadOnlyProp,
      defaultValues: { 
        from_currency_id: '',
        to_currency_id: '',
        rate: 1,
        effective_date: new Date().toISOString().split('T')[0],
        is_active: true
      },
    });
    
  const { router: guardedRouter } = useUnsavedChangesGuard(isDirty);

  useEffect(() => {
    if (fxRate) {
      reset({ 
        from_currency_id: fxRate.from_currency_id,
        to_currency_id: fxRate.to_currency_id,
        rate: fxRate.rate,
        effective_date: fxRate.effective_date.split('T')[0],
        is_active: fxRate.is_active
      });
    }
  }, [fxRate, reset]);
  
  if ((id && loadingRate && !fxRate) || loadingCurrencies) {
    return <PageSkeleton variant="detail" />;
  }

  if (rateError || currenciesError) {
    return (
      <ErrorState 
        error={500} 
        onRetry={() => {
          refetchRate();
          refetchCurrencies();
        }}
      />
    );
  }

  if (id && !fxRate && !loadingRate) {
    return (
      <ErrorState 
        error={404} 
        onBack={() => guardedRouter.push('/master-data/fx-rates', { skipGuard: true })}
      />
    );
  }

  const onSubmit = handleSubmit((values) => {
    if (isReadOnlyProp) return;
    
    if (id) {
      update.mutate({ id, values }, {
        onSuccess: () => {
          guardedRouter.push('/master-data/fx-rates', { skipGuard: true });
        }
      });
    } else {
      create.mutate(values, {
        onSuccess: () => {
          guardedRouter.push('/master-data/fx-rates', { skipGuard: true });
        }
      });
    }
  });

  const isReadOnly = isReadOnlyProp || id === 'FX-001'; // Simulated guard for posted documents
  const displayTitle = isReadOnlyProp ? viewTitle : (id ? editTitle : createTitle);

  return (
    <MasterDataFormLayout 
      title={displayTitle} 
      backHref='/master-data/fx-rates'
      isSaving={create.isPending || update.isPending} 
      onSubmit={onSubmit}
      onCancel={() => guardedRouter.push('/master-data/fx-rates')}
      hideSave={isReadOnlyProp}
      isDirty={isDirty}
      isValid={isValid}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Main Financial Card */}
          <Card className="bg-surface-container-low border-none rounded-md overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-cyan-900/10">
            <CardContent className="p-8 space-y-8">
              <div className="flex items-center gap-3 pb-4 border-b border-surface-variant/10">
                <div className="w-10 h-10 rounded-md bg-cyan-500/10 flex items-center justify-center">
                  <ArrowRightLeft className="w-5 h-5 text-cyan-500" />
                </div>
                <div>
                  <h3 className="text-body-md font-semibold text-foreground uppercase">{t('title')}</h3>
                  <p className="text-label-xs font-semibold text-muted-foreground/60 uppercase mt-0.5">{t('description')}</p>
                </div>
              </div>

              {isReadOnly && !isReadOnlyProp && (
                <div className="flex items-center gap-3 p-4 bg-amber-500/5 rounded-sm border border-amber-500/10 mb-4">
                  <Info className="w-4 h-4 text-amber-500" />
                  <p className="text-label-xs font-bold text-amber-500 uppercase leading-relaxed">
                    {t('financial_integrity_note')}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* From Currency */}
                <div className="space-y-2">
                  <Label className="text-label-xs font-semibold uppercase text-muted-foreground/70">
                    {t('fields.from_currency_id')}
                  </Label>
                  <Controller
                    name="from_currency_id"
                    control={control}
                    render={({ field }) => (
                      <Select 
                        value={field.value} 
                        onValueChange={field.onChange}
                        disabled={isReadOnly}
                      >
                        <SelectTrigger className="disabled:opacity-70">
                          <SelectValue placeholder={t('fields.from_currency_id')} />
                        </SelectTrigger>
                        <SelectContent>
                          {(currencies || []).filter((c: Currency) => c.is_active).map((c: Currency) => (
                            <SelectItem key={c.id} value={c.id}>
                              <span dir="ltr" className="font-mono font-bold text-cyan-500">{c.code}</span>
                              <span className="text-label-xs opacity-60">
                                {locale === 'ar' ? c.name_ar : c.name_en}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.from_currency_id && <p className="text-label-xs font-semibold text-rose-400 uppercase">{t(errors.from_currency_id.message as any)}</p>}
                </div>

                {/* To Currency */}
                <div className="space-y-2">
                  <Label className="text-label-xs font-semibold uppercase text-muted-foreground/70">
                    {t('fields.to_currency_id')}
                  </Label>
                  <Controller
                    name="to_currency_id"
                    control={control}
                    render={({ field }) => (
                      <Select 
                        value={field.value} 
                        onValueChange={field.onChange}
                        disabled={isReadOnly}
                      >
                        <SelectTrigger className="disabled:opacity-70">
                          <SelectValue placeholder={t('fields.to_currency_id')} />
                        </SelectTrigger>
                        <SelectContent>
                          {(currencies || []).filter((c: Currency) => c.is_active).map((c: Currency) => (
                            <SelectItem key={c.id} value={c.id}>
                              <span dir="ltr" className="font-mono font-bold text-amber-500">{c.code}</span>
                              <span className="text-label-xs opacity-60">
                                {locale === 'ar' ? c.name_ar : c.name_en}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.to_currency_id && <p className="text-label-xs font-semibold text-rose-400 uppercase">{t(errors.to_currency_id.message as any)}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Rate Field */}
                <div className="space-y-2">
                  <Label htmlFor="fx-rate" className="text-label-xs font-semibold uppercase text-muted-foreground/70">
                    {t('fields.rate')}
                  </Label>
                  <div className="relative group">
                    <TrendingUp className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40 group-focus-within:text-cyan-500 transition-colors" />
                    <Input 
                      id="fx-rate" 
                      type="number"
                      step="0.000001"
                      placeholder={t('placeholders.rate')}
                      dir="ltr" 
                      disabled={isReadOnly}
                      {...register('rate', { valueAsNumber: true })} 
                      className="h-11 ps-10 border-none bg-surface-container-high/40 focus:bg-surface-container-high transition-colors font-mono font-bold text-label-sm disabled:opacity-70"
                    />
                  </div>
                  {errors.rate && <p className="text-label-xs font-semibold text-rose-400 uppercase">{t(errors.rate.message as any)}</p>}
                </div>

                {/* Effective Date Field */}
                <div className="space-y-2">
                  <Label htmlFor="fx-date" className="text-label-xs font-semibold uppercase text-muted-foreground/70">
                    {t('fields.effective_date')}
                  </Label>
                  <div className="relative group">
                    <Calendar className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40 group-focus-within:text-cyan-500 transition-colors" />
                    <Input 
                      id="fx-date" 
                      type="date"
                      dir="ltr" 
                      disabled={isReadOnly}
                      {...register('effective_date')} 
                      className="h-11 ps-10 border-none bg-surface-container-high/40 focus:bg-surface-container-high transition-colors font-mono font-bold text-label-sm disabled:opacity-70"
                    />
                  </div>
                  {errors.effective_date && <p className="text-label-xs font-semibold text-rose-400 uppercase">{t(errors.effective_date.message as any)}</p>}
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
              
              {/* Status Switch */}
              <div className="flex items-center justify-between p-4 bg-surface-container-highest/10 rounded-md border border-surface-variant/5">
                <div className="space-y-0.5">
                  <Label className="text-label-xs font-bold uppercase text-foreground/80">{t('fields.is_active')}</Label>
                  <p className="text-label-xxs text-muted-foreground uppercase font-medium">{t('active_desc')}</p>
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
                  <h3 className="text-body-md font-semibold text-foreground uppercase">{t('rules_title')}</h3>
                  <p className="text-label-xs font-semibold text-muted-foreground/60 uppercase mt-0.5">{t('rules_subtitle')}</p>
                </div>
              </div>
              
              <ul className="space-y-4">
                <li className="text-label-xs text-muted-foreground/80 leading-relaxed font-medium flex gap-3">
                  <span className="text-cyan-500/60 font-semibold">/</span>
                  <span>{t('tips.precision_desc')}</span>
                </li>
                <li className="text-label-xs text-muted-foreground/80 leading-relaxed font-medium flex gap-3">
                  <span className="text-cyan-500/60 font-semibold">/</span>
                  <span>{t('tips.temporal_integrity_desc')}</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </MasterDataFormLayout>
  );
}

