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

interface Props { id: string | null; createTitle: string; editTitle: string; locale: string; }

export function CurrencyFormClient({ id, createTitle, editTitle, locale }: Props) {
 const t = useTranslations('master_data.currencies');
 const router = useRouter();

 const { data: currency } = useCurrency(id);
 const create = useCreateCurrency();
 const update = useUpdateCurrency();

 const { register, handleSubmit, reset, control, formState: { errors } } =
 useForm<CurrencyFormValues>({
 resolver: zodResolver(CurrencyFormSchema),
 defaultValues: { 
 code: '', 
 name_ar: '', 
 name_en: '', 
 symbol: '',
 is_base_currency: false,
 is_active: true
 },
 });

 useWatch({ control, name: 'code' });

 useEffect(() => {
 if (currency) {
 reset({ 
 code: currency.code, 
 name_ar: currency.name_ar,
 name_en: currency.name_en, 
 symbol: currency.symbol || '',
 is_base_currency: currency.is_base_currency,
 is_active: currency.is_active
 });
 }
 }, [currency, reset]);

 const onSubmit = handleSubmit(async (values) => {
 try {
 if (id) {
 await update.mutateAsync({ id, values });
 } else {
 await create.mutateAsync(values);
 }
 router.push(`/master-data/currencies`);
 } catch {
 // Error handled by mutation toast
 }
 });

 return (
 <MasterDataFormLayout 
 title={id ? editTitle : createTitle} 
 backHref={`/master-data/currencies`}
 isSaving={create.isPending || update.isPending} 
 onSubmit={onSubmit}
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
 placeholder="e.g. SAR"
 dir="ltr" 
 maxLength={3}
 {...register('code')} 
 className="h-11 ps-10 border-none bg-surface-container-high/40 focus:bg-surface-container-high transition-colors font-mono font-bold text-label-sm uppercase text-cyan-500"
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
 placeholder="e.g. SR"
 {...register('symbol')} 
 className="h-11 ps-10 border-none bg-surface-container-high/40 focus:bg-surface-container-high transition-colors font-mono font-bold text-label-sm text-amber-500"
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
 className="h-11 border-none bg-surface-container-high/40 focus:bg-surface-container-high transition-colors text-label-sm font-bold"
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
 className="h-11 border-none bg-surface-container-high/40 focus:bg-surface-container-high transition-colors text-label-sm font-bold"
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
 <h3 className="text-body-md font-semibold text-foreground uppercase">Configuration</h3>
 <p className="text-label-xs font-semibold text-muted-foreground/60 uppercase mt-0.5">Financial Controls</p>
 </div>
 </div>
 
 {/* Base Currency Switch */}
 <div className="flex items-center justify-between p-4 bg-amber-500/5 rounded-md border border-amber-500/10">
 <div className="space-y-0.5">
 <Label className="text-label-xs font-bold uppercase text-foreground/80">{t('fields.is_base')}</Label>
 <p className="text-label-xxs text-muted-foreground uppercase font-medium">System valuation anchor</p>
 </div>
 <Controller
 name="is_base_currency"
 control={control}
 render={({ field }) => (
 <Switch
 checked={field.value}
 onCheckedChange={field.onChange}
 className="data-[state=checked]:bg-amber-500"
 />
 )}
 />
 </div>

 {/* Status Switch */}
 <div className="flex items-center justify-between p-4 bg-surface-container-highest/10 rounded-md border border-surface-variant/5">
 <div className="space-y-0.5">
 <Label className="text-label-xs font-bold uppercase text-foreground/80">{t('fields.is_active')}</Label>
 <p className="text-label-xxs text-muted-foreground uppercase font-medium">Operationally available</p>
 </div>
 <Controller
 name="is_active"
 control={control}
 render={({ field }) => (
 <Switch
 checked={field.value}
 onCheckedChange={field.onChange}
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
 <h3 className="text-body-md font-semibold text-foreground uppercase">Standards</h3>
 <p className="text-label-xs font-semibold text-muted-foreground/60 uppercase mt-0.5">Regulatory compliance</p>
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
 );
}
