'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { Lock, TrendingUp, History, PlusCircle, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { useMasterDataList, useMasterDataCreate, useMasterDataItem } from '@/features/master-data/hooks/useMasterDataCRUD';
import { FXRateSchema, FXRateFormSchema, CurrencySchema, type FXRate, type FXRateFormValues } from '@/types/master-data';
import { ClientOnlyTime } from '@/components/shared/ClientOnlyTime';
import { formatRate } from '@/utils/currency';
import { MasterDataFormLayout } from '@/features/master-data/components/MasterDataFormLayout';
import { Card, CardContent } from '@/components/ui/card';
import { SmartCombobox } from '@/components/shared/SmartCombobox';
import { useAudioFeedback } from '@/hooks/useAudioFeedback';

interface Props { currencyId: string; locale: 'ar' | 'en'; }

export function FXRatesClient({ currencyId, locale }: Props) {
 const t = useTranslations('master_data.currencies');
 const tc = useTranslations('master_data.common');
 const tv = useTranslations();

 // Fetch current currency details for context
 const { data: baseCurrency } = useMasterDataItem('currencies', currencyId, CurrencySchema);

 // Fetch rates for this currency pair
 const { data: ratesData, isLoading } = useMasterDataList(
 'currencies/fx-rates',
 FXRateSchema,
 { from: currencyId },
 );

 // Fetch all currencies for the "To" selector
 const { data: currencies } = useMasterDataList('currencies', CurrencySchema);

  const create = useMasterDataCreate('currencies/fx-rates', FXRateSchema);
  const { playSound } = useAudioFeedback();

   const toCurrencyItems = useMemo(() => {
    const list = currencies?.data
      ?.filter((c) => c.id !== currencyId)
      .map((c) => ({
        id: c.id,
        name_en: `${c.code} — ${c.name}`,
        name_ar: `${c.code} — ${c.name}`,
      })) || [];
    return [{ id: '', name_en: '—', name_ar: '—' }, ...list];
  }, [currencies?.data, currencyId]);

  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<FXRateFormValues>({
    resolver: zodResolver(FXRateFormSchema),
    defaultValues: {
      fromCurrencyId: currencyId,
      toCurrencyId: '',
      rate: 0,
      effectiveDate: new Date().toISOString().substring(0, 10),
    },
  });

 const onSubmit = handleSubmit(async (values) => {
     await create.mutateAsync({ body: values });
 reset({ fromCurrencyId: currencyId, toCurrencyId: '', rate: 0, effectiveDate: new Date().toISOString().substring(0, 10) });
 });

  const columns: ColumnDef<FXRate>[] = [
   { 
   accessorKey: 'toCurrencyId', 
   header: () => <span className="text-label-xs font-semibold uppercase">{t('to_currency')}</span>,
   cell: ({ row }) => {
     const currency = currencies?.data?.find(c => c.id === row.original.toCurrencyId);
     return (
       <div className="flex items-center gap-2">
         <div className="w-12 h-8 rounded-sm bg-surface-container-highest/20 flex items-center justify-center border border-outline-low shrink-0">
           <span className="text-label-xs font-mono font-bold text-cyan-500 uppercase">{currency?.code || row.original.toCurrencyId}</span>
         </div>
         <span className="text-body-md font-medium">
           {currency?.name || row.original.toCurrencyId}
         </span>
       </div>
     );
   }
   },
  {
  accessorKey: 'rate',
  header: () => <span className="text-label-xs font-semibold uppercase">{t('rate')}</span>,
  cell: ({ row }) => (
  <div className="flex items-center gap-2">
  <TrendingUp className="w-3.5 h-3.5 text-cyan-500/50" />
  <span dir="ltr" className="font-mono font-semibold text-body-md text-foreground tabular-nums">
  {formatRate(row.original.rate, locale, 4)}
  </span>
  </div>
  ),
  },
   {
     accessorKey: 'effectiveDate',
     header: () => <span className="text-label-xs font-semibold uppercase">{t('effective_date')}</span>,
     cell: ({ row }) => (
       <div className="flex items-center gap-2 text-muted-foreground/60">
         <History className="w-3.5 h-3.5 opacity-40" />
         <ClientOnlyTime 
           date={row.original.effectiveDate} 
           mode="date" 
           className="text-label-sm font-bold uppercase"
         />
       </div>
     ),
   },
 {
 id: 'lock',
 header: '',
 cell: () => (
 <div className="flex justify-end pe-4">
 <div className="p-1.5 rounded-sm bg-surface-container-highest/10 border border-outline-low opacity-40 group-hover:opacity-100 transition-opacity">
 <Lock className="w-3 h-3 text-text-muted" />
 </div>
 </div>
 ),
 },
 ];

 return (
 <MasterDataFormLayout
 title={`${t('fx_rates_for')} ${baseCurrency?.code || currencyId}`}
 backHref="/master-data/currencies"
 isSaving={create.isPending}
 onSubmit={onSubmit}
 >
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
 {/* Existing Rates Table */}
 <div className="lg:col-span-2 space-y-6">
 <div className="flex items-center gap-3 mb-2">
 <div className="w-10 h-10 rounded-sm bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
 <History className="w-5 h-5 text-cyan-500" />
 </div>
 <div>
 <h2 className="text-title-sm font-semibold uppercase">{t('historical_rates')}</h2>
 <p className="text-label-xs text-muted-foreground/60 uppercase font-bold">{t('fx_rates_subtitle')}</p>
 </div>
 </div>

 <Card className="bg-transparent border-outline-low rounded-sm overflow-hidden shadow-none">
 <DataTable columns={columns} data={ratesData?.data ?? []} isLoading={isLoading} />
 </Card>

 <div className="flex items-start gap-3 p-4 rounded-sm bg-amber-500/5 border border-amber-500/20 text-amber-200/60">
 <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
 <p className="text-label-sm leading-relaxed">
 <span className="font-semibold uppercase block mb-1 text-amber-500/80">{tc('warning')}</span>
 {t('rate_immutable_note')}
 </p>
 </div>
 </div>

 {/* Add Rate Form */}
 <div className="space-y-6">
 <div className="flex items-center gap-3 mb-2">
 <div className="w-10 h-10 rounded-sm bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
 <PlusCircle className="w-5 h-5 text-cyan-500" />
 </div>
 <div>
 <h2 className="text-title-sm font-semibold uppercase">{t('add_rate')}</h2>
 <p className="text-label-xs text-muted-foreground/60 uppercase font-bold">{t('add_rate_subtitle')}</p>
 </div>
 </div>

 <Card className="bg-surface-container-highest/10 border-outline-low rounded-sm shadow-none">
 <CardContent className="p-6 space-y-6">
  {/* To currency */}
  <div className="space-y-2">
  <Label className="text-label-xs font-semibold uppercase text-text-muted">
  {t('to_currency')}
  </Label>
  <Controller
    name="toCurrencyId"
    control={control}
    render={({ field }) => (
       <SmartCombobox
         value={field.value}
         onSelect={(item) => field.onChange(item.id)}
         items={toCurrencyItems}
         placeholder="—"
         className="w-full bg-surface-container-highest/30 border border-outline-low text-label-xs font-bold"
       />
    )}
  />
  {errors.toCurrencyId && <p className="text-label-xs font-bold text-red-500 uppercase">{tv(errors.toCurrencyId.message as never)}</p>}
  </div>

 {/* Rate */}
 <div className="space-y-2">
 <Label className="text-label-xs font-semibold uppercase text-text-muted">
 {t('rate')}
 </Label>
 <Input 
 id="fx-rate" 
 type="number" 
 dir="ltr" 
 step="any" 
 min={0}
 className="h-11 bg-surface-container-highest/30 border-outline-low rounded-sm focus:ring-cyan-500/50"
 {...register('rate', { valueAsNumber: true })} 
 />
 {errors.rate && <p className="text-label-xs font-bold text-red-500 uppercase">{tv(errors.rate.message as never)}</p>}
 </div>

 {/* Effective date */}
 <div className="space-y-2">
 <Label className="text-label-xs font-semibold uppercase text-text-muted">
 {t('effective_date')}
 </Label>
 <Input 
 id="fx-date" 
 type="date" 
 dir="ltr" 
 className="h-11 bg-surface-container-highest/30 border-outline-low rounded-sm focus:ring-cyan-500/50"
 {...register('effectiveDate')} 
 />
 {errors.effectiveDate && <p className="text-label-xs font-bold text-red-500 uppercase">{tv(errors.effectiveDate.message as never)}</p>}
 </div>
 </CardContent>
 </Card>

 <div className="p-4 rounded-sm bg-surface-container-low border border-outline-low flex items-center justify-between">
 <span className="text-label-xxs font-semibold uppercase text-muted-foreground/60">{t('auto_update_policy')}</span>
 <div className="w-2 h-2 rounded-full bg-outline-low" />
 </div>
 </div>
 </div>
 </MasterDataFormLayout>
 );
}
