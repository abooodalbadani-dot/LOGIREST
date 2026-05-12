'use client';

import { useState, useMemo } from 'react';
import { useRouter, Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { Plus, Package, CheckCircle2, Search, Barcode, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { useItems } from '@/features/items/hooks/useItems';
import { type Item } from '@/types/master-data';
import { PageHeader } from '@/components/shared/PageHeader';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { MetricCard } from '@/components/ui/metric-card';
import { EmptyState } from '@/components/shared/EmptyState';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { Input } from '@/components/ui/input';
import { ErrorState } from '@/components/shared/ErrorState';
import { PageSkeleton } from '@/components/shared/PageSkeleton';

export function ItemListClient({ locale }: { locale: string }) {
  const t = useTranslations('common');
  const ti = useTranslations('master_data.items');
  const router = useRouter();
  const [search, setSearch] = useState('');

  const { data, isLoading, isError, refetch } = useItems({ search });

  const stats = useMemo(() => {
    const items = data?.data ?? [];
    return {
      total: items.length,
      active: items.filter(i => i.is_active).length,
      trackingLots: items.filter(i => i.track_lots).length,
    };
  }, [data]);

  const columns = useMemo<ColumnDef<Item, unknown>[]>(() => [
    { 
      accessorKey: 'code', 
      header: t('code'), 
      cell: ({ row }) => (
        <div className="flex flex-col gap-1">
          <span className="font-mono text-operational-cyan font-bold uppercase text-label-xs bg-operational-cyan/10 px-2 py-0.5 rounded-lg border border-operational-cyan/5 w-fit" dir="ltr">{row.original.code}</span>
          <span className="text-label-xxs text-muted-foreground/60 font-medium font-mono flex items-center gap-1.5 ps-1" dir="ltr">
            <Barcode className="w-3 h-3 opacity-40" />
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
          <span className="font-bold text-label-sm">{row.original.name_en}</span>
          <span className="text-label-xs text-muted-foreground/60 font-medium" dir="rtl">{row.original.name_ar}</span>
        </div>
      )
    },
    { 
      accessorKey: 'base_unit', 
      header: ti('fields.base_unit'), 
      cell: ({ row }) => (
        <span className="text-label-xs font-bold uppercase text-muted-foreground/80 px-2 py-0.5 bg-surface-container rounded-lg">
          {row.original.primary_uom.code}
        </span>
      )
    },
    {
      accessorKey: 'track_lots', 
      header: ti('fields.track_lots'),
      cell: ({ row }) => row.original.track_lots
        ? <div className="flex items-center gap-1.5 text-operational-cyan font-bold text-label-xxs uppercase bg-operational-cyan/10 px-2.5 py-1 rounded-lg border border-operational-cyan/5 w-fit">
            <div className="w-1.5 h-1.5 rounded-full bg-operational-cyan shadow-[0_0_8px_currentColor]" />
            {t('yes')}
          </div>
        : <div className="flex items-center gap-1.5 text-muted-foreground/40 font-bold text-label-xxs uppercase bg-surface-container px-2.5 py-1 rounded-lg w-fit">
            <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/20" />
            {t('no')}
          </div>,
    },
    {
      accessorKey: 'is_active', 
      header: t('status'),
      cell: ({ row }) => (
        <StatusBadge status={row.original.is_active ? 'ACTIVE' : 'INACTIVE'} className="rounded-lg px-2.5" />
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex justify-end gap-3">
          <PermissionGate action="view" resource="master_data">
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-label-xs font-bold uppercase text-operational-cyan hover:bg-operational-cyan/10 h-9 px-4 rounded-xl transition-all"
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/master-data/items/${row.original.id}`);
              }}
            >
              {t('view')}
            </Button>
          </PermissionGate>
          <PermissionGate action="edit" resource="master_data">
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-label-xs font-bold uppercase text-status-warning hover:bg-status-warning/10 h-9 px-4 rounded-xl transition-all"
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/master-data/items/${row.original.id}/edit`);
              }}
            >
              {t('edit')}
            </Button>
          </PermissionGate>
        </div>
      ),
    },
  ], [t, ti, locale, router]);

  if (isLoading && !data) {
    return <PageSkeleton variant="list" />;
  }

  if (isError) {
    return (
      <div className="p-8">
        <ErrorState 
          type="server_error"
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  const breadcrumbs = [
    { label: t('home'), href: `/dashboard` },
    { label: t('master_data'), href: `/master-data` },
    { label: ti('title'), href: `/master-data/items` }
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
              <Link href={`/master-data/items/new`}>
                <Button className="h-11 px-8 bg-operational-cyan hover:bg-operational-cyan/90 text-white text-label-xs font-semibold uppercase rounded-xl transition-all shadow-lg shadow-operational-cyan/20">
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
        />

        <MetricCard
          label={t('active')}
          value={stats.active}
          icon={CheckCircle2}
          color="emerald"
        />

        <MetricCard
          label={ti('metrics.tracking_lots')}
          value={stats.trackingLots}
          icon={ShieldAlert}
          color="amber"
        />
      </div>

      <DataTable 
        columns={columns} 
        data={data?.data ?? []} 
        isLoading={isLoading}
        collectionName="master_data_items"
        emptyState={
          <EmptyState 
            variant="minimal"
            title={t('no_data')}
          />
        }
        onRowClick={(r: Item) => router.push(`/master-data/items/${r.id}`)}
        filters={
          <div className="flex flex-wrap items-end gap-6 w-full py-4 px-6 bg-surface-container-low/50 border border-surface-variant/10 rounded-sm">
            <div className="flex flex-col gap-2 min-w-[300px] flex-1">
              <label className="text-label-xs font-semibold uppercase text-muted-foreground/60">{t('search')}</label>
              <div className="relative">
                <Input
                  placeholder={ti('search_placeholder')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-surface-container-highest/30 border-none h-11 ps-10 text-label-sm font-bold"
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
