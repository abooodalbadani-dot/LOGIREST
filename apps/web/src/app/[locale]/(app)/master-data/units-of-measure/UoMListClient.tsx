'use client';

import { useState, useMemo } from 'react';
import { useRouter, Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { Plus, Ruler, Search, Scale, BoxSelect } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { useUoMs } from '@/features/uoms/hooks/useUoMs';
import { type UoM } from '@/types/master-data';
import { PageHeader } from '@/components/shared/PageHeader';
import { Input } from '@/components/ui/input';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { MetricCard } from '@/components/ui/metric-card';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState';
import { PageSkeleton } from '@/components/shared/PageSkeleton';

export function UoMListClient({ locale }: { locale: string }) {
 const t = useTranslations('common');
 const tu = useTranslations('master_data.uoms');
 const router = useRouter();
 const [search, setSearch] = useState('');

  const { data, isLoading, isError, refetch } = useUoMs({ search });

  const columns = useMemo<ColumnDef<UoM, unknown>[]>(() => [
    { 
      accessorKey: 'code', 
      header: t('code'), 
      cell: ({ row }) => (
        <span className="font-mono text-label-xs font-bold text-operational-cyan uppercase px-2.5 py-1 bg-operational-cyan/10 rounded-lg border border-operational-cyan/5" dir="ltr">
          {row.original.code}
        </span>
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
      accessorKey: 'is_active',
      header: t('status'),
      cell: ({ row }) => (
        <StatusBadge status={row.original.is_active ? 'ACTIVE' : 'INACTIVE'} className="rounded-lg px-2.5" />
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
                router.push(`/master-data/units-of-measure/${row.original.id}`);
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
                router.push(`/master-data/units-of-measure/${row.original.id}/edit`);
              }}
            >
              {t('edit')}
            </Button>
          </PermissionGate>
        </div>
      ),
    },
  ], [t, router, locale]);

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
    { label: tu('title'), href: `/master-data/units-of-measure` }
  ];

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <div className="space-y-4">
        <Breadcrumb items={breadcrumbs} />
        <PageHeader 
          title={tu('title')} 
          description={tu('description')}
          actions={
            <PermissionGate action="create" resource="master_data">
              <Link href={`/master-data/units-of-measure/new`}>
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
          label={tu('metrics.total_uoms')}
          value={data?.meta?.total || 0}
          icon={Ruler}
          color="cyan"
          dir="ltr"
        />

        <MetricCard
          label={tu('metrics.precision')}
          value={tu('metrics.high')}
          icon={Scale}
          color="amber"
          dir="ltr"
        />

        <MetricCard
          label={tu('metrics.sync_status')}
          value={tu('metrics.synced')}
          icon={BoxSelect}
          color="emerald"
          dir="ltr"
        />
      </div>

      <DataTable 
        columns={columns} 
        data={data?.data ?? []} 
        isLoading={isLoading}
        collectionName="master_data_units_of_measure"
        onRowClick={(r: UoM) => router.push(`/master-data/units-of-measure/${r.id}`)}
        emptyState={
          <EmptyState 
            variant="minimal"
            title={t('no_data')}
          />
        }
        filters={
          <div className="flex flex-wrap items-end gap-6 w-full py-4 px-6 bg-surface-container-low/50 border border-surface-variant/10 rounded-sm">
            <div className="flex flex-col gap-2 min-w-[300px] flex-1">
              <label className="text-label-xs font-semibold uppercase text-muted-foreground/60">{t('search')}</label>
              <div className="relative">
                <Input
                  placeholder={tu('search_placeholder')}
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
