'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Plus, Package, CheckCircle2, Search, Barcode, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { useItems } from '@/features/items/hooks/useItems';
import { type Item } from '@/types/master-data';
import { PageHeader } from '@/components/shared/PageHeader';
import { Input } from '@/components/ui/input';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { MetricCard } from '@/components/ui/metric-card';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { EmptyState } from '@/components/shared/EmptyState';

export function ItemListClient({ locale }: { locale: string }) {
  const t = useTranslations('common');
  const ti = useTranslations('master_data.items');
  const router = useRouter();
  const [search, setSearch] = useState('');

  const { data, isLoading } = useItems({ search });

  const stats = useMemo(() => {
    const items = data?.data || [];
    return {
      total: data?.meta?.total || 0,
      active: items.filter(i => i.is_active).length,
      trackingLots: items.filter(i => i.track_lots).length,
    };
  }, [data]);

  const columns = useMemo<ColumnDef<Item, unknown>[]>(() => [
    { 
      accessorKey: 'code', 
      header: t('code'), 
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-mono text-cyan-500 font-black tracking-wider uppercase" dir="ltr">{row.original.code}</span>
          <span className="text-[9px] text-muted-foreground/60 font-medium font-mono flex items-center gap-1" dir="ltr">
            <Barcode className="w-2.5 h-2.5 opacity-40" />
            {row.original.barcode || '—'}
          </span>
        </div>
      )
    },
    { 
      accessorKey: 'name', 
      header: t('name'), 
      cell: ({ row }) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-bold text-xs tracking-tight">{row.original.name_en}</span>
          <span className="text-[10px] text-muted-foreground/60" dir="rtl">{row.original.name_ar}</span>
        </div>
      )
    },
    { 
      accessorKey: 'base_unit', 
      header: ti('fields.base_unit'), 
      cell: ({ row }) => (
        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80">
          {row.original.primary_uom.code}
        </span>
      )
    },
    {
      accessorKey: 'track_lots', 
      header: ti('fields.track_lots'),
      cell: ({ row }) => row.original.track_lots
        ? <div className="flex items-center gap-1.5 text-status-active font-bold text-[9px] uppercase tracking-wider">
            <div className="w-1.5 h-1.5 rounded-full bg-status-active shadow-[0_0_8px_currentColor]" />
            {t('yes')}
          </div>
        : <div className="flex items-center gap-1.5 text-muted-foreground/30 font-bold text-[9px] uppercase tracking-wider">
            <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/20" />
            {t('no')}
          </div>,
    },
    {
      accessorKey: 'is_active', 
      header: t('status'),
      cell: ({ row }) => (
        <StatusBadge status={row.original.is_active ? 'ACTIVE' : 'INACTIVE'} />
      ),
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
                router.push(`/${locale}/master-data/items/${row.original.id}`);
              }}
            >
              {t('view')}
            </Button>
          </PermissionGate>
        </div>
      ),
    },
  ], [t, ti, locale, router]);

  const breadcrumbs = [
    { label: t('home'), href: `/${locale}/dashboard` },
    { label: t('master_data'), href: `/${locale}/master-data` },
    { label: ti('title'), href: `/${locale}/master-data/items` }
  ];

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <div className="space-y-4">
        <Breadcrumb items={breadcrumbs} />
        <PageHeader 
          title={ti('title')} 
          description={ti('description')}
          actions={
            <PermissionGate action="create" resource="master_data">
              <Link href={`/${locale}/master-data/items/new`}>
                <Button className="h-11 px-8 bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] font-black uppercase tracking-[0.15em] rounded-sm transition-all shadow-lg shadow-cyan-900/20">
                  <Plus className="w-3.5 h-3.5 me-2" />
                  {t('create_new')}
                </Button>
              </Link>
            </PermissionGate>
          }
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          label={ti('metrics.total_items')}
          value={stats.total}
          icon={Package}
          color="cyan"
          dir="ltr"
        />

        <MetricCard
          label={t('active')}
          value={stats.active}
          icon={CheckCircle2}
          color="emerald"
          dir="ltr"
        />

        <MetricCard
          label={ti('metrics.tracking_lots')}
          value={stats.trackingLots}
          icon={ShieldAlert}
          color="amber"
          dir="ltr"
        />
      </div>

      <DataTable 
        columns={columns} 
        data={data?.data ?? []} 
        isLoading={isLoading}
        collectionName="items"
        emptyState={
          <EmptyState 
            title={ti('empty.title')}
            description={ti('empty.description')}
            action={
              <PermissionGate action="create" resource="master_data">
                <Link href={`/${locale}/master-data/items/new`}>
                  <Button className="h-10 px-6 bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] font-black uppercase tracking-widest rounded-sm transition-all shadow-lg">
                    <Plus className="w-3.5 h-3.5 me-2" />
                    {t('create_new')}
                  </Button>
                </Link>
              </PermissionGate>
            }
          />
        }
        onRowClick={(r: Item) => router.push(`/${locale}/master-data/items/${r.id}`)}
        filters={
          <div className="flex flex-wrap items-end gap-6 w-full py-4 px-6 bg-surface-container-low/50 border border-surface-variant/10 rounded-sm">
            <div className="flex flex-col gap-2 min-w-[300px] flex-1">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">{t('search')}</label>
              <div className="relative">
                <Input
                  placeholder={ti('search_placeholder')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-surface-container-highest/30 border-none h-11 ps-10 text-xs font-bold"
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
