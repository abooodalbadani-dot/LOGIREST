'use client';

import { useState, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Plus, CheckCircle2, Search, ArrowRightLeft, Calendar, TrendingUp, ShieldCheck, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { useFXRates } from '@/features/fx-rates/hooks/useFXRates';
import { useCurrencies } from '@/features/currencies/hooks/useCurrencies';
import { type FXRate, type Currency } from '@/types/master-data';
import { PageHeader } from '@/components/shared/PageHeader';
import { Input } from '@/components/ui/input';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { MetricCard } from '@/components/ui/metric-card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export default function FXRateListClient() {
 const { locale } = useParams();
 const tc = useTranslations('common');
 const t = useTranslations('master_data.fx_rates');
 const router = useRouter();
 const [search, setSearch] = useState('');

 const { data: fxRates = [], isLoading: loadingFX } = useFXRates();
 const { data: currencies = [], isLoading: loadingCurrencies } = useCurrencies();

 const currencyMap = useMemo(() => {
 return new Map(currencies.map(c => [c.id, c]));
 }, [currencies]);

 const filteredRates = useMemo(() => {
 if (!search) return fxRates;
 const s = search.toLowerCase();
 return fxRates.filter(r => {
 const from = currencyMap.get(r.from_currency_id);
 const to = currencyMap.get(r.to_currency_id);
 return (
 from?.code.toLowerCase().includes(s) ||
 to?.code.toLowerCase().includes(s) ||
 from?.name_en.toLowerCase().includes(s) ||
 from?.name_ar.includes(s) ||
 to?.name_en.toLowerCase().includes(s) ||
 to?.name_ar.includes(s) ||
 r.effective_date.includes(s)
 );
 });
 }, [fxRates, search, currencyMap]);

 const stats = useMemo(() => {
 const active = fxRates.filter(r => r.is_active);
 const latestDate = fxRates.length > 0 
 ? [...fxRates].sort((a, b) => b.effective_date.localeCompare(a.effective_date))[0].effective_date 
 : '---';

 return {
 total: fxRates.length,
 active: active.length,
 latestDate
 };
 }, [fxRates]);

 const columns = useMemo<ColumnDef<FXRate, unknown>[]>(() => [
 {
 accessorKey: 'pair',
 header: t('fields.from_currency_id'),
 cell: ({ row }) => {
 const from = currencyMap.get(row.original.from_currency_id);
 const to = currencyMap.get(row.original.to_currency_id);
 return (
 <div className="flex items-center gap-3">
 <div className="flex items-center gap-1.5">
 <span dir="ltr" className="font-mono text-label-xs font-semibold text-cyan-500 bg-cyan-500/5 px-2 py-0.5 rounded-sm">
 {from?.code || '---'}
 </span>
 <ArrowRightLeft className="w-3 h-3 text-muted-foreground/30" />
 <span dir="ltr" className="font-mono text-label-xs font-semibold text-amber-500 bg-amber-500/5 px-2 py-0.5 rounded-sm">
 {to?.code || '---'}
 </span>
 </div>
 <div className="hidden lg:flex flex-col gap-0.5 opacity-40">
 <span className="text-label-xxs font-bold leading-none uppercase">
 {from?.name_en} → {to?.name_en}
 </span>
 </div>
 </div>
 );
 }
 },
 {
 accessorKey: 'rate',
 header: t('fields.rate'),
 cell: ({ row }) => (
 <div className="flex flex-col gap-0.5">
 <span dir="ltr" className="font-mono text-body-md font-semibold text-foreground">
 {row.original.rate.toFixed(6)}
 </span>
 <span className="text-label-xxs font-bold text-muted-foreground/40 uppercase">
 {tc('unit_price')}
 </span>
 </div>
 )
 },
 {
 accessorKey: 'effective_date',
 header: t('fields.effective_date'),
 cell: ({ row }) => (
 <div className="flex items-center gap-2 text-muted-foreground/60">
 <Calendar className="w-3 h-3 opacity-40" />
 <span dir="ltr" className="font-mono text-label-xs font-bold">
 {row.original.effective_date}
 </span>
 </div>
 )
 },
 {
 accessorKey: 'is_active',
 header: tc('status.label'),
 cell: ({ row }) => (
 <StatusBadge 
 status={row.original.is_active ? 'ACTIVE' : 'INACTIVE'} className="rounded-sm h-5"
 />
 )
 },
 {
 id: 'actions',
 header: '',
 cell: ({ row }) => (
 <div className="flex justify-end">
 <PermissionGate action="update" resource="master_data">
 <Button 
 variant="ghost" 
 size="sm" 
 className="text-label-xs font-semibold uppercase text-cyan-500 hover:text-cyan-400 hover:bg-cyan-500/10 h-7"
 onClick={(e) => {
 e.stopPropagation();
 router.push(`/${locale}/master-data/fx-rates/${row.original.id}/edit`);
 }}
 >
 {tc('edit')}
 </Button>
 </PermissionGate>
 </div>
 ),
 },
 ], [tc, t, locale, router, currencyMap]);

 return (
 <div className="p-8 max-w-[1600px] mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
 <div className="space-y-4">
 <Breadcrumb 
 items={[
 { label: tc('home'), href: `/${locale}/dashboard` },
 { label: tc('master_data'), href: `/${locale}/master-data` },
 { label: t('title') }
 ]} 
 />
 <PageHeader 
 title={t('title')} 
 description={t('description')}
 actions={
 <PermissionGate action="create" resource="master_data">
 <Link href={`/${locale}/master-data/fx-rates/new`}>
 <Button className="h-11 px-8 bg-cyan-600 hover:bg-cyan-500 text-white text-label-xs font-semibold uppercase rounded-sm transition-all shadow-lg shadow-cyan-900/20">
 <Plus className="w-3.5 h-3.5 me-2" />
 {tc('create')}
 </Button>
 </Link>
 </PermissionGate>
 }
 />
 </div>

 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
 <MetricCard
 label={tc('total_records')}
 value={stats.total}
 icon={ArrowRightLeft}
 color="cyan"
 dir="ltr"
 />

 <MetricCard
 label={t('tips.temporal_integrity_title')}
 value={stats.latestDate}
 icon={Calendar}
 color="emerald"
 dir="ltr"
 />

 <MetricCard
 label={tc('status.active')}
 value={stats.active}
 icon={CheckCircle2}
 color="amber"
 dir="ltr"
 />
 </div>

 <DataTable 
 columns={columns} 
 data={filteredRates} 
 isLoading={loadingFX || loadingCurrencies}
 collectionName="master_data_fx_rates"
 onRowClick={(r: FXRate) => router.push(`/${locale}/master-data/fx-rates/${r.id}/edit`)}
 filters={
 <div className="flex flex-wrap items-end gap-6 w-full py-6 px-8 bg-surface-container-medium/30 rounded-sm">
 <div className="flex flex-col gap-2 min-w-[300px] flex-1">
 <label className="text-label-xs font-semibold uppercase text-muted-foreground/60 ps-1">{tc('search')}</label>
 <div className="relative">
 <Input
 placeholder={t('search_placeholder')}
 value={search}
 onChange={(e) => { setSearch(e.target.value); }}
 className="w-full bg-surface-container-highest/30 border-none h-12 px-12 text-label-sm font-bold rounded-sm shadow-inner shadow-black/20 focus-visible:ring-1 focus-visible:ring-cyan-500/30"
 />
 <Search className="absolute start-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
 </div>
 </div>
 </div>
 }
 />

 {/* Financial Integrity Notes */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 opacity-60 hover:opacity-100 transition-opacity duration-500 pb-10 pt-4 border-t border-surface-variant/5">
 <div className="p-6 bg-surface-container-low/50 rounded-sm border border-white/5 flex items-start gap-4">
 <div className="w-10 h-10 rounded-sm bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
 <TrendingUp className="w-5 h-5 text-emerald-500" />
 </div>
 <div className="space-y-1">
 <h4 className="text-label-xs font-semibold uppercase text-emerald-500">{t('tips.precision_title')}</h4>
 <p className="text-label-xs text-muted-foreground font-semibold leading-relaxed uppercase">
 {t('tips.precision_desc')}
 </p>
 </div>
 </div>
 <div className="p-6 bg-surface-container-low/50 rounded-sm border border-white/5 flex items-start gap-4">
 <div className="w-10 h-10 rounded-sm bg-cyan-500/10 flex items-center justify-center flex-shrink-0">
 <History className="w-5 h-5 text-cyan-500" />
 </div>
 <div className="space-y-1">
 <h4 className="text-label-xs font-semibold uppercase text-cyan-500">{t('tips.temporal_integrity_title')}</h4>
 <p className="text-label-xs text-muted-foreground font-semibold leading-relaxed uppercase">
 {t('tips.temporal_integrity_desc')}
 </p>
 </div>
 </div>
 </div>
 </div>
 );
}
