'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Plus, CheckCircle2, Search, ArrowRightLeft, Calendar, History, TrendingUp, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { useFXRates } from '@/features/fx-rates/hooks/useFXRates';
import { useCurrencies } from '@/features/currencies/hooks/useCurrencies';
import { type FXRate, type Currency } from '@/types/master-data';
import { PageHeader } from '@/components/shared/PageHeader';
import { Input } from '@/components/ui/input';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { StatusBadge } from '@/components/ui/status-badge';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { MetricCard } from '@/components/ui/metric-card';
import { cn } from '@/lib/utils';

export function FXRateListClient({ locale }: { locale: string }) {
  const tc = useTranslations('common');
  const t = useTranslations('master_data.fx_rates');
  const router = useRouter();
  const [search, setSearch] = useState('');

  const { data: fxRates = [], isLoading } = useFXRates();
  const { data: currencies = [] } = useCurrencies();

  const getCurrencyCode = (id: string) => {
    return currencies.find(c => c.id === id)?.code || '---';
  };

  const filteredRates = useMemo(() => {
    if (!search) return fxRates;
    const s = search.toLowerCase();
    return fxRates.filter(r => {
      const from = getCurrencyCode(r.from_currency_id).toLowerCase();
      const to = getCurrencyCode(r.to_currency_id).toLowerCase();
      return from.includes(s) || to.includes(s) || r.effective_date.includes(s);
    });
  }, [fxRates, search, currencies]);

  const stats = useMemo(() => {
    return {
      total: fxRates.length,
      active: fxRates.filter(r => r.is_active).length,
      latestDate: fxRates.length > 0 ? fxRates[0].effective_date : '---'
    };
  }, [fxRates]);

  const columns = useMemo<ColumnDef<FXRate, unknown>[]>(() => [
    {
      id: 'currency_pair',
      header: t('fields.currency_pair'),
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span dir="ltr" className="font-mono text-[11px] font-black text-cyan-500 bg-cyan-500/5 px-2 py-0.5 rounded-sm border border-cyan-500/10">
              {getCurrencyCode(row.original.from_currency_id)}
            </span>
            <ArrowRightLeft className="w-3 h-3 text-muted-foreground/30" />
            <span dir="ltr" className="font-mono text-[11px] font-black text-amber-500 bg-amber-500/5 px-2 py-0.5 rounded-sm border border-amber-500/10">
              {getCurrencyCode(row.original.to_currency_id)}
            </span>
          </div>
        </div>
      )
    },
    {
      accessorKey: 'rate',
      header: t('fields.rate'),
      cell: ({ row }) => (
        <span dir="ltr" className="font-mono text-xs font-bold text-foreground tracking-tight">
          {row.original.rate.toFixed(6)}
        </span>
      )
    },
    {
      accessorKey: 'effective_date',
      header: t('fields.effective_date'),
      cell: ({ row }) => (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="w-3.5 h-3.5 opacity-40" />
          <span dir="ltr" className="text-[11px] font-bold tracking-tight">
            {row.original.effective_date}
          </span>
        </div>
      )
    },
    {
      accessorKey: 'is_active',
      header: t('fields.status'),
      cell: ({ row }) => (
        <StatusBadge 
          status={row.original.is_active ? 'ACTIVE' : 'INACTIVE'} 
          className="rounded-sm h-5"
        />
      )
    },
    {
      accessorKey: 'created_at',
      header: tc('created_at'),
      cell: ({ row }) => (
        <span dir="ltr" className="text-[10px] text-muted-foreground/50 font-medium">
          {new Date(row.original.created_at).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US')}
        </span>
      )
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex justify-end">
          <PermissionGate action="view" resource="master_data">
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-[10px] font-black uppercase tracking-widest text-cyan-500 hover:text-cyan-400 hover:bg-cyan-500/10 h-7"
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/${locale}/master-data/fx-rates/${row.original.id}`);
              }}
            >
              {tc('view')}
            </Button>
          </PermissionGate>
        </div>
      ),
    },
  ], [tc, t, locale, router, currencies]);

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
                <Button className="h-11 px-8 bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] font-black uppercase tracking-[0.15em] rounded-sm transition-all shadow-lg shadow-cyan-900/20">
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
          icon={History}
          color="cyan"
          dir="ltr"
        />

        <MetricCard
          label={t('fields.effective_date')}
          value={stats.latestDate}
          icon={Calendar}
          color="amber"
          dir="ltr"
        />

        <MetricCard
          label={tc('status.active')}
          value={stats.active}
          icon={CheckCircle2}
          color="emerald"
          dir="ltr"
        />
      </div>

      <DataTable 
        columns={columns} 
        data={filteredRates} 
        isLoading={isLoading}
        collectionName="master_data_fx_rates"
        onRowClick={(r: FXRate) => router.push(`/${locale}/master-data/fx-rates/${r.id}`)}
        filters={
          <div className="flex flex-wrap items-end gap-6 w-full py-6 px-8 bg-surface-container-medium/30 rounded-sm">
            <div className="flex flex-col gap-2 min-w-[300px] flex-1">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 ps-1">{tc('search')}</label>
              <div className="relative">
                <Input
                  placeholder={tc('search')}
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); }}
                  className="w-full bg-surface-container-highest/30 border-none h-12 px-12 text-xs font-bold rounded-sm shadow-inner shadow-black/20 focus-visible:ring-1 focus-visible:ring-cyan-500/30"
                />
                <Search className="absolute start-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
              </div>
            </div>
          </div>
        }
      />

      {/* Quick Tips */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 opacity-60 hover:opacity-100 transition-opacity duration-500 pb-10 pt-4 border-t border-surface-variant/5">
        <div className="p-6 bg-surface-container-low/50 rounded-sm border border-white/5 flex items-start gap-4">
          <div className="w-10 h-10 rounded-sm bg-amber-500/10 flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-5 h-5 text-amber-500" />
          </div>
          <div className="space-y-1">
            <h4 className="text-[10px] font-black uppercase tracking-[0.1em] text-amber-500">{t('tips.temporal_title')}</h4>
            <p className="text-[10px] text-muted-foreground font-semibold leading-relaxed uppercase tracking-tight">
              {t('tips.temporal_desc')}
            </p>
          </div>
        </div>
        <div className="p-6 bg-surface-container-low/50 rounded-sm border border-white/5 flex items-start gap-4">
          <div className="w-10 h-10 rounded-sm bg-cyan-500/10 flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-5 h-5 text-cyan-500" />
          </div>
          <div className="space-y-1">
            <h4 className="text-[10px] font-black uppercase tracking-[0.1em] text-cyan-500">PRECISION GUARD</h4>
            <p className="text-[10px] text-muted-foreground font-semibold leading-relaxed uppercase tracking-tight">
              Rates are stored with 6 decimal places to ensure financial accuracy in multi-currency transactions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
