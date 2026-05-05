'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { Lock, TrendingUp, History, PlusCircle, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { useMasterDataList, useMasterDataCreate, useMasterDataItem } from '@/features/master-data/hooks/useMasterDataCRUD';
import { FXRateSchema, FXRateFormSchema, CurrencySchema, type FXRate, type FXRateFormValues } from '@/types/master-data';
import { format } from 'date-fns';
import { MasterDataFormLayout } from '@/features/master-data/components/MasterDataFormLayout';
import { Card, CardContent } from '@/components/ui/card';

interface Props { currencyId: string; locale: string; }

export function FXRatesClient({ currencyId, locale }: Props) {
 const t = useTranslations('masterData.currencies');
 const tc = useTranslations('masterData.common');

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

 const { register, handleSubmit, reset, formState: { errors } } = useForm<FXRateFormValues>({
 resolver: zodResolver(FXRateFormSchema),
 defaultValues: {
 from_currency_id: currencyId,
 to_currency_id: '',
 rate: 0,
 effective_date: new Date().toISOString().substring(0, 10),
 },
 });

 const onSubmit = handleSubmit(async (values) => {
 await create.mutateAsync(values);
 reset({ from_currency_id: currencyId, to_currency_id: '', rate: 0, effective_date: new Date().toISOString().substring(0, 10) });
 });

 const columns: ColumnDef<FXRate>[] = [
 { 
 accessorKey: 'to_currency_id', 
 header: () => <span className="text-label-xs font-semibold uppercase">{t('to_currency')}</span>,
 cell: ({ row }) => (
 <div className="flex items-center gap-2">
 <div className="w-8 h-8 rounded-sm bg-surface-container-highest/20 flex items-center justify-center border border-outline-low">
 <span className="text-label-xs font-mono font-bold text-cyan-500">{row.original.to_currency_id}</span>
 </div>
 <span className="text-body-md font-medium">
 {currencies?.data?.find(c => c.id === row.original.to_currency_id)?.name_en || row.original.to_currency_id}
 </span>
 </div>
 )
 },
 {
 accessorKey: 'rate',
 header: () => <span className="text-label-xs font-semibold uppercase">{t('rate')}</span>,
 cell: ({ row }) => (
 <div className="flex items-center gap-2">
 <TrendingUp className="w-3.5 h-3.5 text-cyan-500/50" />
 <span dir="ltr" className="font-mono font-semibold text-body-md text-foreground tabular-nums">
 {row.original.rate.toFixed(4)}
 </span>
 </div>
 ),
 },
 {
 accessorKey: 'effective_date',
 header: () => <span className="text-label-xs font-semibold uppercase">{t('effective_date')}</span>,
 cell: ({ row }) => (
 <div className="flex items-center gap-2 text-muted-foreground/60">
 <History className="w-3.5 h-3.5 opacity-40" />
 <span dir="ltr" className="text-label-sm font-bold uppercase">
 {format(new Date(row.original.effective_date), 'MMM dd, yyyy')}
 </span>
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
 backHref={`/${locale}/master-data/currencies`}
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
 <p className="text-label-xs text-muted-foreground/60 uppercase font-bold">Audit log of valuation changes</p>
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
 <p className="text-label-xs text-muted-foreground/60 uppercase font-bold">Register new currency parity</p>
 </div>
 </div>

 <Card className="bg-surface-container-highest/10 border-outline-low rounded-sm shadow-none">
 <CardContent className="p-6 space-y-6">
 {/* To currency */}
 <div className="space-y-2">
 <Label className="text-label-xs font-semibold uppercase text-text-muted">
 {t('to_currency')}
 </Label>
 <select 
 id="fx-to" 
 {...register('to_currency_id')}
 className="h-11 px-4 bg-surface-container-highest/30 border border-outline-low rounded-sm w-full text-body-md focus:outline-none focus:ring-1 focus:ring-cyan-500/50 transition-all appearance-none"
 >
 <option value="">—</option>
 {currencies?.data
 ?.filter((c) => c.id !== currencyId)
 .map((c) => (
 <option key={c.id} value={c.id} className="bg-surface-container-low text-foreground">
 {c.code} — {c.name_en}
 </option>
 ))}
 </select>
 {errors.to_currency_id && <p className="text-label-xs font-bold text-red-500 uppercase">{errors.to_currency_id.message}</p>}
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
 {errors.rate && <p className="text-label-xs font-bold text-red-500 uppercase">{errors.rate.message}</p>}
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
 {...register('effective_date')} 
 />
 {errors.effective_date && <p className="text-label-xs font-bold text-red-500 uppercase">{errors.effective_date.message}</p>}
 </div>
 </CardContent>
 </Card>

 <div className="p-4 rounded-sm bg-surface-container-low border border-outline-low flex items-center justify-between">
 <span className="text-label-xxs font-semibold uppercase text-muted-foreground/60">Auto-Update Policy: OFF</span>
 <div className="w-2 h-2 rounded-full bg-outline-low" />
 </div>
 </div>
 </div>
 </MasterDataFormLayout>
 );
}
