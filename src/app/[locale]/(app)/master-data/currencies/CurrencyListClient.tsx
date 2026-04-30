'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Plus, CheckCircle2, Search, Coins, Landmark, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { useCurrencies } from '@/features/currencies/hooks/useCurrencies';
import { type Currency } from '@/types/master-data';
import { PageHeader } from '@/components/shared/PageHeader';
import { Input } from '@/components/ui/input';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { StatusBadge } from '@/components/ui/status-badge';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { MetricCard } from '@/components/ui/metric-card';
import { Badge } from '@/components/ui/badge';

export function CurrencyListClient({ locale }: { locale: string }) {
  const tc = useTranslations('common');
  const t = useTranslations('master_data.currencies');
  const router = useRouter();
  const [search, setSearch] = useState('');

  const { data: currencies = [], isLoading } = useCurrencies();

  const filteredCurrencies = useMemo(() => {
    if (!search) return currencies;
    const s = search.toLowerCase();
    return currencies.filter(c => 
      c.code.toLowerCase().includes(s) || 
      c.name_en.toLowerCase().includes(s) || 
      c.name_ar.includes(s)
    );
  }, [currencies, search]);

  const stats = useMemo(() => {
    const base = currencies.find(c => c.is_base_currency);
    return {
      total: currencies.length,
      active: currencies.filter(c => c.is_active).length,
      baseCurrency: base ? (locale === 'ar' ? base.name_ar : base.name_en) : '---'
    };
  }, [currencies, locale]);

  const columns = useMemo<ColumnDef<Currency, unknown>[]>(() => [
    { 
      accessorKey: 'code', 
      header: t('fields.code'), 
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
           <Coins className="w-3.5 h-3.5 text-cyan-500/50" />
           <span dir="ltr" className="font-mono text-cyan-500/90 font-bold tracking-wider uppercase bg-cyan-500/5 px-2 py-0.5 rounded-sm">
             {row.original.code}
           </span>
        </div>
      )
    },
    { 
      accessorKey: 'name', 
      header: tc('name'), 
      cell: ({ row }) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-bold text-xs tracking-tight">{row.original.name_en}</span>
          <span className="text-[10px] opacity-40" dir="rtl">{row.original.name_ar}</span>
        </div>
      )
    },
    { 
      accessorKey: 'symbol', 
      header: t('fields.symbol'), 
      cell: ({ row }) => (
        <span className="font-mono text-xs font-bold text-muted-foreground/60">
          {row.original.symbol || '---'}
        </span>
      )
    },
    {
      accessorKey: 'is_base_currency',
      header: t('fields.is_base'),
      cell: ({ row }) => row.original.is_base_currency ? (
        <Badge className="bg-amber-500/10 text-amber-500 border-none rounded-sm text-[9px] font-black uppercase tracking-widest px-2 h-5">
          {t('fields.is_base')}
        </Badge>
      ) : null
    },
    {
      accessorKey: 'is_active', 
      header: t('fields.is_active'),
      cell: ({ row }) => (
        <StatusBadge 
          status={row.original.is_active ? 'ACTIVE' : 'INACTIVE'} 
          className="rounded-sm h-5"
        />
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
                router.push(`/${locale}/master-data/currencies/${row.original.id}`);
              }}
            >
              {tc('view')}
            </Button>
          </PermissionGate>
        </div>
      ),
    },
  ], [tc, t, locale, router]);

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
              <Link href={`/${locale}/master-data/currencies/new`}>
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
          icon={Coins}
          color="cyan"
          dir="ltr"
        />

        <MetricCard
          label={t('fields.is_base')}
          value={stats.baseCurrency}
          icon={Landmark}
          color="amber"
          dir={locale === 'ar' ? 'rtl' : 'ltr'}
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
        data={filteredCurrencies} 
        isLoading={isLoading}
        collectionName="master_data_currencies"
        onRowClick={(r: Currency) => router.push(`/${locale}/master-data/currencies/${r.id}`)}
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
            <Landmark className="w-5 h-5 text-amber-500" />
          </div>
          <div className="space-y-1">
            <h4 className="text-[10px] font-black uppercase tracking-[0.1em] text-amber-500">{t('tips.base_currency_title')}</h4>
            <p className="text-[10px] text-muted-foreground font-semibold leading-relaxed uppercase tracking-tight">
              {t('tips.base_currency_desc')}
            </p>
          </div>
        </div>
        <div className="p-6 bg-surface-container-low/50 rounded-sm border border-white/5 flex items-start gap-4">
          <div className="w-10 h-10 rounded-sm bg-cyan-500/10 flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-5 h-5 text-cyan-500" />
          </div>
          <div className="space-y-1">
            <h4 className="text-[10px] font-black uppercase tracking-[0.1em] text-cyan-500">{t('tips.iso_standard_title')}</h4>
            <p className="text-[10px] text-muted-foreground font-semibold leading-relaxed uppercase tracking-tight">
              {t('tips.iso_standard_desc')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
