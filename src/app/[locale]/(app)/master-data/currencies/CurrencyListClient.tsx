'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Plus, Coins, Star, Search, TrendingUp, Globe } from 'lucide-react';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { useMasterDataList } from '@/features/master-data/hooks/useMasterDataCRUD';
import { CurrencySchema, type Currency } from '@/types/master-data';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ColumnDef } from '@tanstack/react-table';
import { PageHeader } from '@/components/shared/PageHeader';
import { Input } from '@/components/ui/input';
import { Breadcrumb } from '@/components/shared/Breadcrumb';

export function CurrencyListClient({ locale }: { locale: string }) {
  const tc = useTranslations('masterData.common');
  const t = useTranslations('masterData.currencies');
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useMasterDataList(
    'currencies', 
    CurrencySchema, 
    { page: String(page), ...(search ? { search } : {}) }
  );

  const stats = useMemo(() => {
    const currencies = data?.data || [];
    const baseCurrency = currencies.find(c => c.is_base);
    return {
      total: data?.meta?.total || 0,
      baseCode: baseCurrency?.code || '---',
    };
  }, [data]);

  const columns = useMemo<ColumnDef<Currency, unknown>[]>(() => [
    {
      accessorKey: 'code',
      header: tc('code'),
      meta: { numeric: true },
      cell: ({ row }) => (
        <span className="font-mono text-[11px] font-black text-cyan-500 tracking-widest uppercase px-2 py-0.5 bg-cyan-500/5 rounded-sm border border-cyan-500/10">
          {row.original.code}
        </span>
      ),
    },
    { 
      accessorKey: 'symbol', 
      header: t('symbol'), 
      meta: { numeric: true },
      cell: ({ row }) => (
        <span className="font-mono text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-sm border border-emerald-500/20">
          {row.original.symbol}
        </span>
      ) 
    },
    { 
      accessorKey: 'name', 
      header: tc('name'), 
      cell: ({ row }) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-bold text-xs tracking-tight">{row.original.name_en}</span>
          <span className="text-[10px] text-muted-foreground/60" dir="rtl">{row.original.name_ar}</span>
        </div>
      ) 
    },
    {
      accessorKey: 'is_base',
      header: t('is_base'),
      cell: ({ row }) => row.original.is_base
        ? <div className="flex items-center gap-1.5 text-amber-400 font-black text-[9px] uppercase tracking-widest">
            <Star className="w-3 h-3 fill-amber-400 animate-pulse" />
            {t('base')}
          </div>
        : null,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="flex items-center gap-1.5 text-[10px] font-black text-emerald-400 hover:text-emerald-300 hover:bg-emerald-400/10 transition-all uppercase tracking-widest h-7"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/${locale}/master-data/currencies/${row.original.id}/fx-rates`);
            }}
          >
            <TrendingUp className="w-3 h-3" />
            {t('fx_rates_title')}
          </Button>
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

  const breadcrumbs = [
    { label: tc('master_data'), href: `/${locale}/master-data` },
    { label: tc('currencies'), href: `/${locale}/master-data/currencies` }
  ];

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <div className="space-y-4">
        <Breadcrumb items={breadcrumbs} />
        <PageHeader 
          title={t('title') || 'Currency Configuration'} 
          description={t('description') || "Global monetary units and exchange rate synchronization engine"}
          actions={
            <PermissionGate action="create" resource="master_data">
              <Link href={`/${locale}/master-data/currencies/new`}>
                <Button className="h-11 px-8 bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] font-black uppercase tracking-[0.15em] rounded-sm transition-all shadow-lg shadow-cyan-900/20">
                  <Plus className="w-3.5 h-3.5 me-2" />
                  {tc('create_new')}
                </Button>
              </Link>
            </PermissionGate>
          }
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-surface-container-low border-none rounded-sm overflow-hidden relative group transition-all hover:bg-surface-container-medium">
          <div className="absolute top-0 end-0 p-6 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
            <Coins className="w-24 h-24 text-white" />
          </div>
          <CardHeader className="pb-2 relative z-10">
            <CardDescription className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">{tc('supported_assets') || 'Supported Assets'}</CardDescription>
            <CardTitle className="text-4xl font-display font-bold tracking-tight text-foreground">{stats.total}</CardTitle>
          </CardHeader>
          <div className="absolute bottom-0 start-0 h-0.5 w-full bg-gradient-to-r from-cyan-500/50 to-transparent" />
        </Card>

        <Card className="bg-surface-container-low border-none rounded-sm overflow-hidden relative group transition-all hover:bg-surface-container-medium">
          <div className="absolute top-0 end-0 p-6 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
            <Star className="w-24 h-24 text-amber-400" />
          </div>
          <CardHeader className="pb-2 relative z-10">
            <CardDescription className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">{tc('base_standard') || 'Base Standard'}</CardDescription>
            <CardTitle className="text-4xl font-display font-bold tracking-tight text-amber-400">{stats.baseCode}</CardTitle>
          </CardHeader>
          <div className="absolute bottom-0 start-0 h-0.5 w-full bg-gradient-to-r from-amber-500/50 to-transparent" />
        </Card>

        <Card className="bg-surface-container-low border-none rounded-sm overflow-hidden relative group transition-all hover:bg-surface-container-medium">
          <div className="absolute top-0 end-0 p-6 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
            <Globe className="w-24 h-24 text-emerald-400" />
          </div>
          <CardHeader className="pb-2 relative z-10">
            <CardDescription className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">{tc('global_reach') || 'Global Reach'}</CardDescription>
            <CardTitle className="text-4xl font-display font-bold tracking-tight text-emerald-400">100%</CardTitle>
          </CardHeader>
          <div className="absolute bottom-0 start-0 h-0.5 w-full bg-gradient-to-r from-emerald-500/50 to-transparent" />
        </Card>
      </div>

      <DataTable 
        columns={columns} 
        data={data?.data ?? []} 
        isLoading={isLoading}
        collectionName="master_data_currencies"
        onRowClick={(r: Currency) => router.push(`/${locale}/master-data/currencies/${r.id}`)}
        pagination={data?.meta ? {
          page: data.meta.page,
          pageSize: data.meta.page_size,
          total: data.meta.total,
          totalPages: data.meta.total_pages,
          onPageChange: setPage
        } : undefined}
        filters={
          <div className="flex flex-wrap items-end gap-6 w-full py-4 px-6 bg-surface-container-low/50 border border-surface-variant/10 rounded-sm">
            <div className="flex flex-col gap-2 min-w-[300px] flex-1">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">{tc('search')}</label>
              <div className="relative">
                <Input
                  placeholder={tc('search_currencies_placeholder') || "Filter currencies by name or code..."}
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="w-full bg-surface-container-highest/30 border-none h-11 px-10 text-xs font-bold"
                />
                <Search className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
              </div>
            </div>
          </div>
        }
      />
    </div>
  );
}
