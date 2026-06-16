'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import { Plus, CheckCircle2, Search, Coins, Landmark, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { useCurrencies } from '@/features/currencies/hooks/useCurrencies';
import { type Currency } from '@/types/master-data';
import { PageHeader } from '@/components/shared/PageHeader';
import { Input } from '@/components/ui/input';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { MetricCard } from '@/components/ui/metric-card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState';

export function CurrencyListClient({ locale }: { locale: string }) {
 const tc = useTranslations('common');
 const t = useTranslations('master_data.currencies');
 const router = useRouter();
 const [search, setSearch] = useState('');

 const { data: currencies = [], isLoading, isError, refetch } = useCurrencies();

 const filteredCurrencies = useMemo(() => {
 if (!search) return currencies;
 const s = search.toLowerCase();
 return currencies.filter((c: Currency) => 
 c.code.toLowerCase().includes(s) || 
 c.name.toLowerCase().includes(s)
 );
 }, [currencies, search]);

 const stats = useMemo(() => {
 const base = currencies.find((c: Currency) => c.isBase);
 return {
 total: currencies.length,
 active: currencies.filter((c: Currency) => c.isActive).length,
 baseCurrency: base ? base.name : '---'
 };
 }, [currencies, locale]);

 const columns = useMemo<ColumnDef<Currency, unknown>[]>(() => [
 { 
 accessorKey: 'code', 
 header: t('fields.code'), 
 cell: ({ row }) => (
 <div className="flex items-center gap-2">
 <Coins className="w-3.5 h-3.5 text-cyan-500/50" />
 <span dir="ltr" className="font-mono text-cyan-500/90 font-bold uppercase bg-cyan-500/5 px-2 py-0.5 rounded-sm whitespace-nowrap inline-block min-w-max">
 {row.original.code}
 </span>
 </div>
 )
 },
 { 
 accessorKey: 'name', 
 header: tc('name'), 
 cell: ({ row }) => (
 <span className="font-bold text-label-sm">{row.original.name}</span>
 )
 },
 { 
 accessorKey: 'symbol', 
 header: t('fields.symbol'), 
 cell: ({ row }) => (
 <span className="font-mono text-label-sm font-bold text-muted-foreground/60">
 {row.original.symbol || '---'}
 </span>
 )
 },
 {
 accessorKey: 'isBase',
 header: t('fields.is_base'),
 cell: ({ row }) => row.original.isBase ? (
 <Badge className="bg-amber-500/10 text-amber-500 border-none rounded-sm text-label-xxs font-semibold uppercase px-2 h-5">
 {t('fields.is_base')}
 </Badge>
 ) : null
 },
 {
 accessorKey: 'isActive', 
 header: t('fields.is_active'),
 cell: ({ row }) => (
 <StatusBadge 
 status={row.original.isActive ? 'ACTIVE' : 'INACTIVE'} className="rounded-sm h-5"
 />
 )
 },
 {
 id: 'actions',
 header: '',
 cell: ({ row }) => (
 <div className="flex justify-end gap-2">

 <PermissionGate action="view" resource="master_data">
 <Button 
 variant="ghost" 
 size="sm" 
 className="text-label-xs font-semibold uppercase text-cyan-500 hover:text-cyan-400 hover:bg-cyan-500/10 h-7"
 onClick={(e) => {
 e.stopPropagation();
 router.push(`/master-data/currencies/${row.original.id}`);
 }}
 >
 {tc('view')}
 </Button>
 </PermissionGate>
 
    <PermissionGate action="edit" resource="master_data">
     <Button
      variant="ghost"
      size="sm"
      className="text-label-xs font-semibold uppercase text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 h-7"
      onClick={(e) => {
       e.stopPropagation();
       router.push(`/master-data/currencies/${row.original.id}/edit`);
      }}
     >
      {t('edit')}
     </Button>
    </PermissionGate>
   </div>
 ),
 },
 ], [tc, t, locale, router]);

 if (isError) {
 return (
  <div className="min-w-0 gap-6 flex-1 p-8 flex-col flex w-full">
  <ErrorState 
   type="server_error"
   onRetry={() => refetch()}
  />
  </div>
 );
 }

 return (
 <div className="w-full max-w-full overflow-x-hidden p-4 sm:p-6 md:p-8 flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-1000 min-w-0">
 <div className="space-y-4">
 <Breadcrumb 
    items={[
     { label: tc('home'), href: `/dashboard` },
     { label: tc('master_data'), href: `/master-data` },
     { label: t('title') }
    ]} 
 />
 <PageHeader 
 title={t('title')} 
 description={t('description')}
 actions={
 <PermissionGate action="create" resource="master_data">
    <Link href={`/master-data/currencies/new`}>
     <Button className="h-11 px-8 bg-primary hover:bg-primary/90 text-primary-foreground text-label-xs font-semibold uppercase rounded-sm transition-all shadow-sm shadow-primary/20">
 <Plus className="w-3.5 h-3.5 me-2" />
 {tc('create')}
 </Button>
 </Link>
 </PermissionGate>
 }
 />
 </div>

 <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
 <MetricCard
 label={tc('total_records')}
 value={stats.total}
 icon={Coins}
 color="cyan"
 dir="ltr"
 />

 <MetricCard
 label={t('fields.is_base')}
 value={stats.baseCurrency}
 icon={Landmark}
 color="amber"
 dir={locale === 'ar' ? 'rtl' : 'ltr'} />

 <MetricCard
 label={tc('statuses.active')}
 value={stats.active}
 icon={CheckCircle2}
 color="emerald"
 dir="ltr"
 />
 </div>

 <DataTable 
 columns={columns} 
 data={filteredCurrencies} 
 isLoading={isLoading}
 collectionName="master_data_currencies"
 onRowClick={(r: Currency) => router.push(`/master-data/currencies/${r.id}`)}
  emptyState={
   <EmptyState 
    variant="minimal"
    title={tc('no_data')}
   />
  }
 filters={
      <div className="relative w-full sm:max-w-md flex-1 shrink-0 min-w-[250px]">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
         placeholder={tc('search')}
         value={search}
         onChange={(e) => { setSearch(e.target.value); }} className="w-full ps-10 pe-4 bg-background border-border text-foreground focus:ring-operational-cyan focus:border-operational-cyan shadow-sm transition-all rounded-lg"
        />
       </div>
     }
 />

 {/* Quick Tips */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 opacity-60 hover:opacity-100 transition-opacity duration-500 pb-10 pt-4 border-t border-surface-variant/5">
 <div className="p-6 bg-card border border-border shadow-sm/50 rounded-sm border border-white/5 flex items-start gap-4">
 <div className="w-10 h-10 rounded-sm bg-amber-500/10 flex items-center justify-center flex-shrink-0">
 <Landmark className="w-5 h-5 text-amber-500" />
 </div>
 <div className="space-y-1">
 <h4 className="text-label-xs font-semibold uppercase text-amber-500">{t('tips.base_currency_title')}</h4>
 <p className="text-label-xs text-muted-foreground font-semibold leading-relaxed uppercase">
 {t('tips.base_currency_desc')}
 </p>
 </div>
 </div>
 <div className="p-6 bg-card border border-border shadow-sm/50 rounded-sm border border-white/5 flex items-start gap-4">
 <div className="w-10 h-10 rounded-sm bg-cyan-500/10 flex items-center justify-center flex-shrink-0">
 <ShieldCheck className="w-5 h-5 text-cyan-500" />
 </div>
 <div className="space-y-1">
 <h4 className="text-label-xs font-semibold uppercase text-cyan-500">{t('tips.iso_standard_title')}</h4>
 <p className="text-label-xs text-muted-foreground font-semibold leading-relaxed uppercase">
 {t('tips.iso_standard_desc')}
 </p>
 </div>
 </div>
 </div>
 </div>
 );
}
