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
import { useFXRate, useCreateFXRate, useUpdateFXRate } from '@/features/fx-rates/hooks/useFXRates';
import { useCurrencies } from '@/features/currencies/hooks/useCurrencies';
import { FXRateFormSchema, type FXRateFormValues } from '@/types/master-data';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, ArrowRightLeft, Calendar, Activity, Info, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props { id: string | null; createTitle: string; editTitle: string; locale: string; }

export function FXRateFormClient({ id, createTitle, editTitle, locale }: Props) {
  const tc = useTranslations('common');
  const t = useTranslations('master_data.fx_rates');
  const router = useRouter();

  const { data: fxRate } = useFXRate(id);
  const { data: currencies = [] } = useCurrencies();
  const create = useCreateFXRate();
  const update = useUpdateFXRate();

  const { register, handleSubmit, reset, watch, control, formState: { errors } } =
    useForm<FXRateFormValues>({
      resolver: zodResolver(FXRateFormSchema),
      defaultValues: { 
        from_currency_id: '', 
        to_currency_id: '', 
        rate: 1,
        effective_date: new Date().toISOString().split('T')[0],
        is_active: true
      },
    });

  const isActive = watch('is_active');

  useEffect(() => {
    if (fxRate) {
      reset({ 
        from_currency_id: fxRate.from_currency_id, 
        to_currency_id: fxRate.to_currency_id, 
        rate: fxRate.rate,
        effective_date: fxRate.effective_date,
        is_active: fxRate.is_active
      });
    }
  }, [fxRate, reset]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      if (id) {
        await update.mutateAsync({ id, values });
      } else {
        await create.mutateAsync(values);
      }
      router.push(`/${locale}/master-data/fx-rates`);
    } catch (error) {
      // Error handled by mutation toast
    }
  });

  return (
    <MasterDataFormLayout 
      title={id ? editTitle : createTitle} 
      backHref={`/${locale}/master-data/fx-rates`}
      isSaving={create.isPending || update.isPending} 
      onSubmit={onSubmit}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Main Configuration Card */}
          <Card className="bg-surface-container-low border-none rounded-md overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-cyan-900/10">
            <CardContent className="p-8 space-y-8">
              <div className="flex items-center gap-3 pb-4 border-b border-surface-variant/10">
                <div className="w-10 h-10 rounded-md bg-cyan-500/10 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-cyan-500" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold tracking-tight text-foreground uppercase">{t('title')}</h3>
                  <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-[0.08em] mt-0.5">{t('description')}</p>
                </div>
              </div>

              {/* Currency Pair */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative">
                {/* Source Currency */}
                <div className="space-y-2">
                  <Label htmlFor="from-curr" className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">
                    {t('fields.from_currency')}
                  </Label>
                  <Controller
                    name="from_currency_id"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange} disabled={!!id}>
                        <SelectTrigger id="from-curr" className="h-11 border-none bg-surface-container-high/40 focus:bg-surface-container-high transition-colors font-mono font-bold text-xs uppercase tracking-widest text-cyan-500">
                          <SelectValue placeholder="—" />
                        </SelectTrigger>
                        <SelectContent>
                          {currencies.filter(c => c.is_active || c.id === field.value).map((c) => (
                            <SelectItem key={c.id} value={c.id} className="font-mono text-[11px] font-black uppercase tracking-widest">
                              {c.code} — {locale === 'ar' ? c.name_ar : c.name_en}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.from_currency_id && (
                    <p className="text-[10px] font-semibold text-rose-400 uppercase tracking-tight">
                      {t(`validation.${errors.from_currency_id.message?.split('.').pop()}` as any)}
                    </p>
                  )}
                </div>

                {/* Target Currency */}
                <div className="space-y-2">
                  <Label htmlFor="to-curr" className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">
                    {t('fields.to_currency')}
                  </Label>
                  <Controller
                    name="to_currency_id"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange} disabled={!!id}>
                        <SelectTrigger id="to-curr" className="h-11 border-none bg-surface-container-high/40 focus:bg-surface-container-high transition-colors font-mono font-bold text-xs uppercase tracking-widest text-amber-500">
                          <SelectValue placeholder="—" />
                        </SelectTrigger>
                        <SelectContent>
                          {currencies.filter(c => c.is_active || c.id === field.value).map((c) => (
                            <SelectItem key={c.id} value={c.id} className="font-mono text-[11px] font-black uppercase tracking-widest">
                              {c.code} — {locale === 'ar' ? c.name_ar : c.name_en}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.to_currency_id && (
                    <p className="text-[10px] font-semibold text-rose-400 uppercase tracking-tight">
                      {t(`validation.${errors.to_currency_id.message?.split('.').pop()}` as any)}
                    </p>
                  )}
                </div>

                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 mt-1 hidden md:flex w-8 h-8 rounded-full bg-surface-container-highest items-center justify-center border border-surface-variant/10 z-10">
                  <ArrowRightLeft className="w-4 h-4 text-muted-foreground/40" />
                </div>
              </div>

              {/* Rate and Date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Rate Field */}
                <div className="space-y-2">
                  <Label htmlFor="fx-rate" className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">
                    {t('fields.rate')}
                  </Label>
                  <div className="relative group">
                    <TrendingUp className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40 group-focus-within:text-emerald-500 transition-colors" />
                    <Input 
                      id="fx-rate" 
                      type="number"
                      step="0.000001"
                      placeholder="1.000000"
                      dir="ltr" 
                      {...register('rate', { valueAsNumber: true })} 
                      className="h-11 ps-10 border-none bg-surface-container-high/40 focus:bg-surface-container-high transition-colors font-mono font-bold text-xs text-emerald-500"
                    />
                  </div>
                  {errors.rate && (
                    <p className="text-[10px] font-semibold text-rose-400 uppercase tracking-tight">
                      {t(`validation.${errors.rate.message?.split('.').pop()}` as any)}
                    </p>
                  )}
                </div>

                {/* Effective Date Field */}
                <div className="space-y-2">
                  <Label htmlFor="fx-date" className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">
                    {t('fields.effective_date')}
                  </Label>
                  <div className="relative group">
                    <Calendar className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40 group-focus-within:text-cyan-500 transition-colors" />
                    <Input 
                      id="fx-date" 
                      type="date"
                      dir="ltr" 
                      {...register('effective_date')} 
                      className="h-11 ps-10 border-none bg-surface-container-high/40 focus:bg-surface-container-high transition-colors font-mono font-bold text-xs"
                    />
                  </div>
                  {errors.effective_date && (
                    <p className="text-[10px] font-semibold text-rose-400 uppercase tracking-tight">
                      {t(`validation.${errors.effective_date.message?.split('.').pop()}` as any)}
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
                  <h3 className="text-sm font-semibold tracking-tight text-foreground uppercase">Configuration</h3>
                  <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-[0.08em] mt-0.5">Control Panel</p>
                </div>
              </div>
              
              {/* Status Switch */}
              <div className="flex items-center justify-between p-4 bg-surface-container-highest/10 rounded-md border border-surface-variant/5">
                <div className="space-y-0.5">
                  <Label className="text-[10px] font-bold uppercase tracking-[0.08em] text-foreground/80">{t('fields.status')}</Label>
                  <p className={`text-[9px] uppercase font-bold ${isActive ? 'text-emerald-500' : 'text-rose-400'}`}>
                    {isActive ? tc('status.active') : tc('status.inactive')}
                  </p>
                </div>
                <Controller
                  name="is_active"
                  control={control}
                  render={({ field }) => (
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="data-[state=checked]:bg-emerald-500"
                    />
                  )}
                />
              </div>

              <div className="p-4 bg-blue-500/5 rounded-md border border-blue-500/10 flex gap-3">
                <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <p className="text-[10px] text-muted-foreground font-semibold leading-relaxed uppercase tracking-tight">
                  {t('tips.temporal_desc')}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Audit Standards */}
          <Card className="bg-surface-container-low border-none rounded-md overflow-hidden">
            <CardContent className="p-8 space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-surface-variant/10">
                <div className="w-10 h-10 rounded-md bg-tertiary-container/10 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-tertiary" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold tracking-tight text-foreground uppercase">Compliance</h3>
                  <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-[0.08em] mt-0.5">Audit Trail Guards</p>
                </div>
              </div>
              
              <ul className="space-y-4">
                <li className="text-[11px] text-muted-foreground/80 leading-relaxed font-medium flex gap-3">
                  <span className="text-cyan-500/60 font-semibold">/</span>
                  <span>Uniqueness is enforced per pair and date to prevent valuation ambiguity.</span>
                </li>
                <li className="text-[11px] text-muted-foreground/80 leading-relaxed font-medium flex gap-3">
                  <span className="text-cyan-500/60 font-semibold">/</span>
                  <span>Deactivation is blocked if the rate is referenced in posted operational documents.</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </MasterDataFormLayout>
  );
}
