'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Plus, Home, MapPin, CheckCircle2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { useWarehouses } from '@/features/warehouses/hooks/useWarehouses';
import { type Warehouse } from '@/types/master-data';
import { PageHeader } from '@/components/shared/PageHeader';
import { Input } from '@/components/ui/input';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { StatusBadge } from '@/components/ui/status-badge';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { MetricCard } from '@/components/ui/metric-card';

export function WarehouseListClient({ locale }: { locale: string }) {
  const tc = useTranslations('common');
  const t = useTranslations('master_data.warehouses');
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const WAREHOUSE_TYPE_STYLES: Record<string, { label: string, color: string, shadow: string }> = useMemo(() => ({
    MAIN: { label: t('types.main'), color: 'text-blue-400', shadow: 'shadow-[0_0_8px_rgba(96,165,250,0.4)]' },
    DRY: { label: t('types.dry'), color: 'text-amber-400', shadow: 'shadow-[0_0_8px_rgba(251,191,36,0.4)]' },
    COLD: { label: t('types.cold'), color: 'text-cyan-400', shadow: 'shadow-[0_0_8px_rgba(34,211,238,0.4)]' },
    VIRTUAL: { label: t('types.virtual'), color: 'text-indigo-400', shadow: 'shadow-[0_0_8px_rgba(129,140,248,0.4)]' }
  }), [t]);

  const { data: queryData, isLoading } = useWarehouses({ search });
  const warehouses = queryData?.data || [];

  const stats = useMemo(() => {
    return {
      total: warehouses.length,
      active: warehouses.filter(w => w.is_active).length,
      physical: warehouses.filter(w => w.type !== 'VIRTUAL').length
    };
  }, [warehouses]);

  const columns = useMemo<ColumnDef<Warehouse, unknown>[]>(() => [
    { 
      accessorKey: 'code', 
      header: t('fields.code'), 
      cell: ({ row }) => <span dir="ltr" className="font-mono text-cyan-500/90 font-bold tracking-wider uppercase bg-cyan-500/5 px-2 py-0.5 rounded-sm">{row.original.code}</span> 
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
      accessorKey: 'type', 
      header: t('fields.type'),
      cell: ({ row }) => {
        const style = WAREHOUSE_TYPE_STYLES[row.original.type] || { label: row.original.type, color: 'text-muted-foreground', shadow: '' };
        return (
          <div className={`flex items-center gap-2 ${style.color} font-black text-[9px] uppercase tracking-widest`}>
            <div className={`w-1.5 h-1.5 rounded-full bg-current ${style.shadow}`} />
            {style.label}
          </div>
        );
      }
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
                router.push(`/${locale}/master-data/warehouses/${row.original.id}`);
              }}
            >
              {tc('view')}
            </Button>
          </PermissionGate>
        </div>
      ),
    },
  ], [tc, t, locale, router, WAREHOUSE_TYPE_STYLES]);

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
              <Link href={`/${locale}/master-data/warehouses/new`}>
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
          label={tc('total_locations')}
          value={stats.total}
          icon={Home}
          color="cyan"
          dir="ltr"
        />

        <MetricCard
          label={tc('status.active')}
          value={stats.active}
          icon={CheckCircle2}
          color="emerald"
          dir="ltr"
        />

        <MetricCard
          label={t('fields.type')}
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
        onRowClick={(r: Warehouse) => router.push(`/${locale}/master-data/warehouses/${r.id}`)}
        filters={
          <div className="flex flex-wrap items-end gap-6 w-full py-6 px-8 bg-surface-container-medium/30 rounded-sm">
            <div className="flex flex-col gap-2 min-w-[300px] flex-1">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 ps-1">{tc('search')}</label>
              <div className="relative">
                <Input
                  placeholder={tc('search')}
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="w-full bg-surface-container-highest/30 border-none h-12 px-12 text-xs font-bold rounded-sm shadow-inner shadow-black/20"
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
