'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { MasterDataFormLayout } from '@/features/master-data/components/MasterDataFormLayout';
import { useCurrency, useCreateCurrency, useUpdateCurrency } from '@/features/currencies/hooks/useCurrencies';
import { CurrencyFormSchema, type CurrencyFormValues } from '@/types/master-data';
import { Card, CardContent } from '@/components/ui/card';
import { Landmark, Type, Coins, Activity, ShieldCheck, TrendingUp } from 'lucide-react';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { ErrorState } from '@/components/shared/ErrorState';

import { useUnsavedChangesGuard } from '@/lib/unsaved-changes/useUnsavedChangesGuard';
import { useConflictHandler } from '@/core/concurrency/useConflictHandler';
import { toast } from 'sonner';
import { ConflictDialog } from '@/core/concurrency/ConflictDialog';
import { useAbortController } from '@/hooks/useAbortController';
import { useAudioFeedback } from '@/hooks/useAudioFeedback';
import { onFormError } from '@/hooks/useFormError';

interface Props {
  id: string | null;
  createTitle: string;
  editTitle: string;
  viewTitle?: string;
  isReadOnly?: boolean;
}

export function CurrencyFormClient({
  id,
  createTitle,
  editTitle,
  viewTitle = '',
  isReadOnly = false,
}: Props) {
  const t = useTranslations('master_data.currencies');
  const tv = useTranslations();
  const abortController = useAbortController();
  const { data: currency, isLoading, isError, isFetched, refetch } = useCurrency(id);
  const createCurrency = useCreateCurrency();
  const conflict = useConflictHandler('currency', id ?? '');
  const updateCurrency = useUpdateCurrency({ onConflict: conflict.triggerConflict });
  const { playSound } = useAudioFeedback();

  const { register, handleSubmit, reset, control, formState: { errors, isDirty, isValid } } =
    useForm<CurrencyFormValues>({
      resolver: zodResolver(CurrencyFormSchema),
      disabled: isReadOnly,
      defaultValues: {
        code: '',
        name: '',
        symbol: '',
        isBase: false,
        isActive: true,
        version: undefined
      },
    });

  const { router: guardedRouter } = useUnsavedChangesGuard(isDirty);

  useWatch({ control, name: 'code' });

  useEffect(() => {
    if (currency) {
      reset({
        code: currency.code,
        name: currency.name,
        symbol: currency.symbol || '',
        isBase: currency.isBase,
        isActive: currency.isActive,
        version: currency.version
      });
    }
  }, [currency, reset]);

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

  const onValid = (values: CurrencyFormValues) => {
    if (isReadOnly) return;

    if (id) {
      updateCurrency.mutate({ id, values, signal: abortController.signal }, {
        onSuccess: () => {
          toast.success(t('updated_success'));
          reset(values);
          guardedRouter.push('/master-data/currencies', { skipGuard: true });
        },
        onError: (error) => {
          console.error('Update failed:', error);
        }
      });
    } else {
      createCurrency.mutate({ values, signal: abortController.signal }, {
        onSuccess: () => {
          toast.success(t('created_success'));
          reset(values);
          guardedRouter.push('/master-data/currencies', { skipGuard: true });
        },
        onError: (error) => {
          console.error('Create failed:', error);
        }
      });
    }
  };

  const onSubmit = handleSubmit(onValid, onFormError);

  const displayTitle = isReadOnly ? viewTitle : (id ? editTitle : createTitle);

  return (
    <>
      <MasterDataFormLayout
        title={displayTitle}
        backHref='/master-data/currencies'
        isSaving={createCurrency.isPending || updateCurrency.isPending}
        onSubmit={onSubmit}
        onCancel={() => guardedRouter.push('/master-data/currencies')}
        hideSave={isReadOnly}
        isDirty={isDirty}
        isValid={isValid}
        resource="master_data_currencies"
        headerActions={
          id ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => guardedRouter.push(`/master-data/currencies/${id}/fx-rates`)}
              className="rounded-xl border-surface-variant/20 bg-card border border-border shadow-sm hover:bg-operational-cyan/10 hover:text-operational-cyan transition-all text-label-xs font-semibold uppercase h-11 px-6 shadow-sm flex items-center gap-2"
            >
              <TrendingUp className="w-4 h-4 text-foreground" />
              <span>{`${t('fx_rates_for')} ${currency?.code || ''}`}</span>
            </Button>
          ) : undefined
        }
      >
        <div className="col-span-12 w-full max-w-3xl mx-auto flex flex-col gap-8 p-6 bg-card border border-border rounded-xl mt-6">
          {/* Identity Section */}
          <div className="w-full min-w-0 flex flex-col gap-6">
            <div className="flex items-center gap-2 border-b border-border pb-3 mb-4">
              <Landmark className="text-muted-foreground w-5 h-5" />
              <h3 className="text-base font-bold text-foreground">{t('title')}</h3>
            </div>

            <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Code Field */}
              <div className="w-full min-w-0 flex flex-col gap-1.5 text-start">
                <Label htmlFor="curr-code" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                  {t('fields.code')}
                </Label>
                <div className="relative group">
                  <Coins className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40 group-focus-within:text-foreground transition-colors" />
                  <Controller
                    control={control}
                    name="code"
                    render={({ field }) => (
                      <Input
                        id="curr-code"
                        placeholder={t('placeholders.code')}
                        dir="ltr"
                        maxLength={3}
                        {...field}
                        disabled={isReadOnly}
                        className="h-11 ps-10 border-none bg-surface-container-high/40 focus:bg-surface-container-high transition-colors font-mono font-bold text-label-sm uppercase text-foreground disabled:opacity-70 w-full"
                      />
                    )}
                  />
                </div>
                {errors.code?.message && (
                  <p className="text-xs text-red-500 mt-1">
                    {tv(errors.code.message as Parameters<typeof tv>[0])}
                  </p>
                )}
              </div>

              {/* Symbol Field */}
              <div className="w-full min-w-0 flex flex-col gap-1.5 text-start">
                <Label htmlFor="curr-symbol" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                  {t('fields.symbol')}
                </Label>
                <div className="relative group">
                  <Type className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40 group-focus-within:text-amber-500 transition-colors" />
                  <Controller
                    control={control}
                    name="symbol"
                    render={({ field }) => (
                      <Input
                        id="curr-symbol"
                        placeholder={t('placeholders.symbol')}
                        {...field}
                        value={field.value ?? ''}
                        disabled={isReadOnly}
                        className="h-11 ps-10 border-none bg-surface-container-high/40 focus:bg-surface-container-high transition-colors font-mono font-bold text-label-sm text-amber-500 disabled:opacity-70 w-full"
                      />
                    )}
                  />
                </div>
              </div>

              {/* Name Field */}
              <div className="w-full min-w-0 flex flex-col gap-1.5 text-start md:col-span-2">
                <Label htmlFor="curr-name" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                  {t('fields.name') || 'Name'}
                </Label>
                <Controller
                  control={control}
                  name="name"
                  render={({ field }) => (
                    <Input
                      id="curr-name"
                      {...field}
                      disabled={isReadOnly}
                      className="h-11 border-none bg-surface-container-high/40 focus:bg-surface-container-high transition-colors text-label-sm font-bold disabled:opacity-70 w-full"
                    />
                  )}
                />
                {errors.name?.message && (
                  <p className="text-xs text-red-500 mt-1">
                    {tv(errors.name.message as Parameters<typeof tv>[0])}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Configuration Section */}
          <div className="w-full min-w-0 flex flex-col gap-6">
            <div className="flex items-center gap-2 border-b border-border pb-3 mb-4">
              <Activity className="text-muted-foreground w-5 h-5" />
              <h3 className="text-base font-bold text-foreground">{t('config_title')}</h3>
            </div>

            <div className="flex flex-col gap-4">
              {/* Base Currency Switch */}
              <div className="flex flex-row items-center justify-between w-full rounded-lg border border-border p-4 shadow-sm bg-transparent transition-colors hover:bg-muted/30">
                <div className="flex flex-col space-y-1 text-start min-w-0">
                  <span className="text-sm font-medium text-text-main dark:text-white">{t('fields.is_base')}</span>
                  <span className="text-xs text-muted-foreground dark:text-gray-400">{t('placeholders.base_desc')}</span>
                </div>
                <Controller
                  name="isBase"
                  control={control}
                  render={({ field }) => (
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isReadOnly}
                      activeClassName="bg-amber-500"
                    />
                  )}
                />
              </div>

              {/* Status Switch */}
              <div className="flex flex-row items-center justify-between w-full rounded-lg border border-border p-4 shadow-sm bg-transparent transition-colors hover:bg-muted/30">
                <div className="flex flex-col space-y-1 text-start min-w-0">
                  <span className="text-sm font-medium text-text-main dark:text-white">{t('fields.is_active')}</span>
                  <span className="text-xs text-muted-foreground dark:text-gray-400">{t('placeholders.active_desc')}</span>
                </div>
                <Controller
                  name="isActive"
                  control={control}
                  render={({ field }) => (
                    <Switch
                      checked={!!field.value}
                      onCheckedChange={field.onChange}
                      disabled={isReadOnly}
                      activeClassName="bg-status-active"
                    />
                  )}
                />
              </div>
            </div>
          </div>

          {/* Guidelines Section */}
          <div className="w-full min-w-0 flex flex-col gap-6">
            <div className="flex items-center gap-2 border-b border-border pb-3 mb-4">
              <ShieldCheck className="text-muted-foreground w-5 h-5" />
              <h3 className="text-base font-bold text-foreground">{t('standards_title')}</h3>
            </div>

            <ul className="space-y-4 text-start">
              <li className="text-label-xs text-muted-foreground/80 leading-relaxed font-medium flex gap-3">
                <span className="text-foreground/60 font-semibold">/</span>
                <span>{t('tips.base_currency_desc')}</span>
              </li>
              <li className="text-label-xs text-muted-foreground/80 leading-relaxed font-medium flex gap-3">
                <span className="text-foreground/60 font-semibold">/</span>
                <span>{t('tips.iso_standard_desc')}</span>
              </li>
            </ul>
          </div>
        </div>

      </MasterDataFormLayout>
      <ConflictDialog open={conflict.open} onReload={conflict.handleReload} onClose={conflict.handleClose} />
    </>
  );
}

