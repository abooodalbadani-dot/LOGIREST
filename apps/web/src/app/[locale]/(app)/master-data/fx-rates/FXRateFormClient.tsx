'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useUnsavedChangesGuard } from '@/lib/unsaved-changes/useUnsavedChangesGuard';
import { useForm, Controller, type FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { MasterDataFormLayout } from '@/features/master-data/components/MasterDataFormLayout';
import { useFXRate, useCreateFXRate, useUpdateFXRate } from '@/features/fx-rates/hooks/useFXRates';
import { useCurrencies } from '@/features/currencies/hooks/useCurrencies';
import { FXRateFormSchema, type FXRateFormValues, type Currency } from '@/types/master-data';
import { Card, CardContent } from '@/components/ui/card';
import { SmartCombobox } from '@/components/shared/SmartCombobox';
import { ArrowRightLeft, Calendar, TrendingUp, Info, ShieldCheck, Activity } from 'lucide-react';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { ErrorState } from '@/components/shared/ErrorState';
import { useConflictHandler } from '@/core/concurrency/useConflictHandler';
import { ConflictDialog } from '@/core/concurrency/ConflictDialog';
import { useAbortController } from '@/hooks/useAbortController';
import { useAudioFeedback } from '@/hooks/useAudioFeedback';
import { useRouter } from '@/i18n/navigation';
import { useAuth } from '@/providers/AuthProvider';
import { toast } from 'sonner';
import { onFormError } from '@/hooks/useFormError';

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
  const t = useTranslations('master_data.fx_rates');
  const tCommon = useTranslations('common');
  const tAuth = useTranslations('auth');
  const tPermissions = useTranslations('permissions');
  const abortController = useAbortController();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const redirectFired = useRef(false);

  const { user, isLoading: authLoading } = useAuth();
  const { data: fxRate, isLoading: loadingRate, isError: rateError, refetch: refetchRate } = useFXRate(id);
  const { data: currencies, isLoading: loadingCurrencies, isError: currenciesError, refetch: refetchCurrencies } = useCurrencies();

  const create = useCreateFXRate();
  const conflict = useConflictHandler('fx-rate', id ?? '');
  const update = useUpdateFXRate({ onConflict: conflict.triggerConflict });
  const { playSound } = useAudioFeedback();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMounted(true);
  }, []);

  const normalizedRole = useMemo(() => {
    if (authLoading || !user) return null;
    return user.role === 'ADMIN' ? 'admin' :
      user.role === 'AUDITOR' ? 'auditor' :
        ['GM', 'INV_MGR', 'STORE_MGR', 'PROC_OFFICER'].includes(user.role) ? 'manager' : 'clerk';
  }, [user, authLoading]);

  const activeCurrencies = useMemo(() => {
    return (currencies || []).filter((c: Currency) => c.isActive);
  }, [currencies]);

  const fromCurrencyItems = useMemo(() => {
    return activeCurrencies.map((c: Currency) => ({
      id: c.id,
      name_en: `${c.code} — ${c.name}`,
      name_ar: `${c.code} — ${c.name}`,
    }));
  }, [activeCurrencies]);

  const toCurrencyItems = useMemo(() => {
    return activeCurrencies.map((c: Currency) => ({
      id: c.id,
      name_en: `${c.code} — ${c.name}`,
      name_ar: `${c.code} — ${c.name}`,
    }));
  }, [activeCurrencies]);

  const getUnauthorizedMessage = () => {
    try {
      const msg1 = tCommon('errors.unauthorized');
      if (msg1 && msg1 !== 'errors.unauthorized') return msg1;
    } catch (e) { }

    try {
      const msg2 = tAuth('errors.unauthorized');
      if (msg2 && msg2 !== 'errors.unauthorized') return msg2;
    } catch (e) { }

    try {
      const msg3 = tPermissions('access_denied');
      if (msg3 && msg3 !== 'access_denied') return msg3;
    } catch (e) { }

    return locale === 'ar'
      ? 'ليس لديك صلاحية للوصول إلى هذه الصفحة.'
      : 'You do not have permission to access this page.';
  };

  useEffect(() => {
    if (isMounted && !authLoading) {
      if (!user || normalizedRole === 'clerk') {
        if (!redirectFired.current) {
          redirectFired.current = true;
          playSound('error');
          toast.error(getUnauthorizedMessage());
          router.replace('/dashboard');
        }
      }
    }
  }, [isMounted, authLoading, user, normalizedRole, router, locale]);

  const isReadOnly = isReadOnlyProp || id === 'FX-001' || normalizedRole === 'auditor';

  const { register, handleSubmit, reset, control, formState: { errors, isDirty, isValid } } =
    useForm<FXRateFormValues>({
      resolver: zodResolver(FXRateFormSchema),
      defaultValues: {
        fromCurrencyId: '',
        toCurrencyId: '',
        rate: 1,
        effectiveDate: new Date().toISOString().split('T')[0],
        isActive: true,
        version: undefined
      },
    });

  const { router: guardedRouter } = useUnsavedChangesGuard(isDirty);

  useEffect(() => {
    if (fxRate) {
      reset({
        fromCurrencyId: fxRate.fromCurrencyId,
        toCurrencyId: fxRate.toCurrencyId,
        rate: fxRate.rate,
        effectiveDate: fxRate.effectiveDate.split('T')[0],
        isActive: fxRate.isActive,
        version: fxRate.version
      });
    }
  }, [fxRate, reset]);

  if (authLoading || !isMounted || (id && loadingRate && !fxRate) || loadingCurrencies) {
    return <PageSkeleton variant="detail" />;
  }

  if (!user || normalizedRole === 'clerk') {
    return null;
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

  const onValid = (values: FXRateFormValues) => {
    if (isReadOnly) return;

    const payload = {
      fromCurrencyId: values.fromCurrencyId,
      toCurrencyId: values.toCurrencyId,
      rate: values.rate,
      effectiveDate: values.effectiveDate,
      isActive: values.isActive ?? true,
    };

    if (id) {
      update.mutate(
        {
          id,
          values: {
            ...payload,
            version: values.version || undefined,
          },
          signal: abortController.signal
        },
        {
          onSuccess: () => {
            reset(values);
            guardedRouter.push('/master-data/fx-rates', { skipGuard: true });
          },
          onError: (error) => {
            console.error('Update failed:', error);
          }
        }
      );
    } else {
      create.mutate(
        {
          values: payload,
          signal: abortController.signal
        },
        {
          onSuccess: () => {
            reset(values);
            guardedRouter.push('/master-data/fx-rates', { skipGuard: true });
          },
          onError: (error) => {
            console.error('Create failed:', error);
          }
        }
      );
    }
  };

  const onInvalid = (errors: FieldErrors<FXRateFormValues>) => {
    console.log('3. [FXRateForm] Validation FAILED (Silent Zod Blocker):', errors);
    onFormError(errors);
  };

  const onSubmit = handleSubmit(onValid, onInvalid);

  const displayTitle = (isReadOnlyProp || normalizedRole === 'auditor') ? (viewTitle || t('view_title') || editTitle) : (id ? editTitle : createTitle);

  return (
    <>
      <MasterDataFormLayout
        title={displayTitle}
        backHref='/master-data/fx-rates'
        isSaving={create.isPending || update.isPending}
        onSubmit={onSubmit}
        onCancel={() => guardedRouter.push('/master-data/fx-rates')}
        hideSave={isReadOnly}
        isDirty={isDirty}
        isValid={isValid}
      >
        <div className="col-span-12 w-full max-w-3xl mx-auto flex flex-col gap-8 p-6 bg-card border border-border rounded-xl mt-6">
          {/* Main Financial Card */}
          <div className="w-full min-w-0 flex flex-col gap-6">
            <div className="flex items-center gap-2 border-b border-border pb-3 mb-4">
              <ArrowRightLeft className="text-muted-foreground w-5 h-5" />
              <h3 className="text-base font-bold text-foreground">{t('title')}</h3>
            </div>

            {isReadOnly && !isReadOnlyProp && (
              <div className="flex items-center gap-3 p-4 bg-amber-500/5 rounded-xl border border-amber-500/10 mb-4 text-start">
                <Info className="w-4 h-4 text-amber-500 shrink-0" />
                <p className="text-label-xs font-bold text-amber-500 uppercase leading-relaxed">
                  {t('financial_integrity_note')}
                </p>
              </div>
            )}

            <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* From Currency */}
              <div className="w-full min-w-0 flex flex-col gap-1.5 text-start">
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                  {t('fields.from_currency_id')}
                </Label>
                <Controller
                  name="fromCurrencyId"
                  control={control}
                  render={({ field }) => (
                    <SmartCombobox
                      disabled={isReadOnly}
                      value={field.value}
                      onSelect={(item) => field.onChange(item.id)}
                      items={fromCurrencyItems}
                      placeholder={t('fields.from_currency_id')}
                      className="w-full bg-surface-container-high/40 hover:bg-surface-container-high transition-colors text-label-xs font-bold"
                    />
                  )}
                />
                {errors.fromCurrencyId && <p className="text-xs text-red-500 mt-1">{t(errors.fromCurrencyId.message as Parameters<typeof t>[0])}</p>}
              </div>

              {/* To Currency */}
              <div className="w-full min-w-0 flex flex-col gap-1.5 text-start">
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                  {t('fields.to_currency_id')}
                </Label>
                <Controller
                  name="toCurrencyId"
                  control={control}
                  render={({ field }) => (
                    <SmartCombobox
                      disabled={isReadOnly}
                      value={field.value}
                      onSelect={(item) => field.onChange(item.id)}
                      items={toCurrencyItems}
                      placeholder={t('fields.to_currency_id')}
                      className="w-full bg-surface-container-high/40 hover:bg-surface-container-high transition-colors text-label-xs font-bold"
                    />
                  )}
                />
                {errors.toCurrencyId && <p className="text-xs text-red-500 mt-1">{t(errors.toCurrencyId.message as Parameters<typeof t>[0])}</p>}
              </div>

              {/* Rate Field */}
              <div className="w-full min-w-0 flex flex-col gap-1.5 text-start">
                <Label htmlFor="fx-rate" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                  {t('fields.rate')}
                </Label>
                <div className="relative group">
                  <TrendingUp className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40 group-focus-within:text-foreground transition-colors" />
                  <Input
                    id="fx-rate"
                    type="number"
                    step="0.000001"
                    placeholder={t('placeholders.rate')}
                    dir="ltr"
                    readOnly={isReadOnly}
                    {...register('rate', { valueAsNumber: true })}
                    className="h-11 ps-10 border-none bg-surface-container-high/40 focus:bg-surface-container-high transition-colors font-mono font-bold text-label-sm read-only:opacity-70 read-only:cursor-default w-full"
                  />
                </div>
                {errors.rate && <p className="text-xs text-red-500 mt-1">{t(errors.rate.message as Parameters<typeof t>[0])}</p>}
              </div>

              {/* Effective Date Field */}
              <div className="w-full min-w-0 flex flex-col gap-1.5 text-start">
                <Label htmlFor="fx-date" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                  {t('fields.effective_date')}
                </Label>
                <div className="relative group">
                  <Calendar className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40 group-focus-within:text-foreground transition-colors" />
                  <Input
                    id="fx-date"
                    type="date"
                    dir="ltr"
                    readOnly={isReadOnly}
                    {...register('effectiveDate')}
                    className="h-11 ps-10 border-none bg-surface-container-high/40 focus:bg-surface-container-high transition-colors font-mono font-bold text-label-sm read-only:opacity-70 read-only:cursor-default w-full"
                  />
                </div>
                {errors.effectiveDate && <p className="text-xs text-red-500 mt-1">{t(errors.effectiveDate.message as Parameters<typeof t>[0])}</p>}
              </div>
            </div>
          </div>

          {/* Configuration Section */}
          <div className="w-full min-w-0 flex flex-col gap-6">
            <div className="flex items-center gap-2 border-b border-border pb-3 mb-4">
              <Activity className="text-muted-foreground w-5 h-5" />
              <h3 className="text-base font-bold text-foreground">{t('config_title')}</h3>
            </div>

            {/* Status Switch */}
            <div className="flex flex-row items-center justify-between w-full rounded-lg border border-border p-4 shadow-sm bg-transparent transition-colors hover:bg-muted/30">
              <div className="flex flex-col space-y-1 text-start min-w-0">
                <span className="text-sm font-medium text-text-main dark:text-white">{t('fields.is_active')}</span>
                <span className="text-xs text-muted-foreground dark:text-gray-400">{t('active_desc')}</span>
              </div>
              <Controller
                name="isActive"
                control={control}
                render={({ field }) => (
                  <Switch
                    checked={field.value ?? true}
                    onCheckedChange={field.onChange}
                    disabled={isReadOnly}
                    activeClassName="bg-status-active"
                  />
                )}
              />
            </div>
          </div>

          {/* Guidelines Section */}
          <div className="w-full min-w-0 flex flex-col gap-6">
            <div className="flex items-center gap-2 border-b border-border pb-3 mb-4">
              <ShieldCheck className="text-muted-foreground w-5 h-5" />
              <h3 className="text-base font-bold text-foreground">{t('rules_title')}</h3>
            </div>

            <ul className="space-y-4 text-start">
              <li className="text-label-xs text-muted-foreground/80 leading-relaxed font-medium flex gap-3">
                <span className="text-foreground/60 font-semibold">/</span>
                <span>{t('tips.precision_desc')}</span>
              </li>
              <li className="text-label-xs text-muted-foreground/80 leading-relaxed font-medium flex gap-3">
                <span className="text-foreground/60 font-semibold">/</span>
                <span>{t('tips.temporal_integrity_desc')}</span>
              </li>
            </ul>
          </div>
        </div>
      </MasterDataFormLayout>
      <ConflictDialog open={conflict.open} onReload={conflict.handleReload} onClose={conflict.handleClose} />
    </>
  );
}

