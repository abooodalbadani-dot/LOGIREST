'use client';

import { useState, useMemo } from 'react';
import { useRouter, Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { Plus, Home, MapPin, CheckCircle2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { useWarehouses } from '@/features/warehouses/hooks/useWarehouses';
import { type Warehouse } from '@/types/master-data';
import { PageHeader } from '@/components/shared/PageHeader';
import { Input } from '@/components/ui/input';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { MetricCard } from '@/components/ui/metric-card';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { ErrorState } from '@/components/shared/ErrorState';
import { EmptyState } from '@/components/shared/EmptyState';

export function WarehouseListClient({ locale }: { locale: string }) {
  const t = useTranslations('master_data.warehouses');
  const tc = useTranslations('common');
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, refetch } = useWarehouses({ search });
  const warehouses = data?.data || [];

  const WAREHOUSE_TYPE_STYLES: Record<string, { label: string; color: string; shadow: string }> = useMemo(() => ({
    MAIN: { label: t('types.main'), color: 'text-primary', shadow: 'shadow-[0_0_8px_rgba(var(--primary-rgb),0.4)]' },
    COLD: { label: t('types.cold'), color: 'text-operational-cyan', shadow: 'shadow-[0_0_8px_rgba(var(--cyan-rgb),0.4)]' },
    DRY: { label: t('types.dry'), color: 'text-operational-orange', shadow: 'shadow-[0_0_8px_rgba(var(--orange-rgb),0.4)]' },
  }), [t]);

  const stats = useMemo(() => ({
    total: data?.meta?.total || 0,
    active: warehouses.filter(w => w.is_active).length,
    physical: warehouses.filter(w => w.type === 'MAIN' || w.type === 'COLD').length,
  }), [data, warehouses]);

  const columns = useMemo<ColumnDef<Warehouse, unknown>[]>(() => [
    {
      accessorKey: 'code',
      header: tc('code'),
      cell: ({ row }) => (
        <span className="font-mono text-label-xs font-bold text-operational-cyan uppercase px-2.5 py-1 bg-operational-cyan/10 rounded-lg border border-operational-cyan/5 whitespace-nowrap inline-block min-w-max" dir="ltr">
          {row.original.code}
        </span>
      )
    },
    { 
      accessorKey: 'name', 
      header: tc('name'), 
      cell: ({ row }) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-bold text-label-sm">{row.original.name_en}</span>
          <span className="text-label-xs opacity-40 font-medium" dir="rtl">{row.original.name_ar}</span>
        </div>
      )
    },
    {
      accessorKey: 'type', 
      header: tc('fields.type'),
      cell: ({ row }) => {
        const style = WAREHOUSE_TYPE_STYLES[row.original.type] || { label: row.original.type, color: 'text-muted-foreground', shadow: '' };
        return (
          <div className={`flex items-center gap-2 ${style.color} font-bold text-label-xxs uppercase bg-current/5 px-2.5 py-1 rounded-lg border border-current/10 w-fit`}>
            <div className={`w-1.5 h-1.5 rounded-full bg-current ${style.shadow}`} />
            {style.label}
          </div>
        );
      }
    },
    {
      accessorKey: 'is_active', 
      header: tc('fields.is_active'),
      cell: ({ row }) => (
        <StatusBadge 
          status={row.original.is_active ? 'ACTIVE' : 'INACTIVE'} className="rounded-lg px-2.5"
        />
      )
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
                router.push(`/master-data/warehouses/${row.original.id}`);
              }}
            >
              {tc('view')}
            </Button>
          </PermissionGate>
          <PermissionGate action="edit" resource="master_data">
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-label-xs font-bold uppercase text-status-warning hover:bg-status-warning/10 h-9 px-4 rounded-xl transition-all"
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/master-data/warehouses/${row.original.id}/edit`);
              }}
            >
              {tc('edit')}
            </Button>
          </PermissionGate>
        </div>
      ),
    },
  ], [tc, t, locale, router, WAREHOUSE_TYPE_STYLES]);

  if (isLoading) return <PageSkeleton variant="list" />;
  if (isError) return <ErrorState onRetry={refetch} />;

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
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
              <Link href={`/master-data/warehouses/new`}>
                <Button className="h-11 px-8 bg-operational-cyan hover:bg-operational-cyan/90 text-white text-label-xs font-semibold uppercase rounded-xl transition-all shadow-lg shadow-operational-cyan/20">
                  <Plus className="w-3.5 h-3.5 me-2" />
                  {tc('create_new')}
                </Button>
              </Link>
            </PermissionGate>
          }
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          label={t('total_locations')}
          value={stats.total}
          icon={Home}
          color="cyan"
          dir="ltr"
        />

        <MetricCard
          label={tc('statuses.active')}
          value={stats.active}
          icon={CheckCircle2}
          color="emerald"
          dir="ltr"
        />

        <MetricCard
          label={tc('fields.type')}
          value={stats.physical}
          icon={MapPin}
          color="amber"
          dir="ltr"
        />
      </div>

      <DataTable 
        columns={columns} 
        data={warehouses} 
        isLoading={isLoading}
        collectionName="master_data_warehouses"
        onRowClick={(r: Warehouse) => router.push(`/master-data/warehouses/${r.id}`)}
        emptyState={
          <EmptyState 
            variant="minimal"
            title={tc('no_data')}
          />
        }
        filters={
          <div className="flex flex-wrap items-end gap-6 w-full py-6 px-8 bg-surface-container-medium/30 rounded-sm">
            <div className="flex flex-col gap-2 min-w-[300px] flex-1">
              <label className="text-label-xs font-semibold uppercase text-muted-foreground/60 ps-1">{tc('search')}</label>
              <div className="relative">
                <Input
                  placeholder={tc('search')}
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="w-full bg-surface-container-highest/30 border-none h-12 px-12 text-label-sm font-bold rounded-sm shadow-inner shadow-black/20"
                />
                <Search className="absolute start-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
              </div>
            </div>
          </div>
        }
      />
    </div>
  );
}
