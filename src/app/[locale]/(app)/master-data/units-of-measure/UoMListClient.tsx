'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
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

export function UoMListClient({ locale }: { locale: string }) {
  const t = useTranslations('common');
  const tu = useTranslations('master_data.uoms');
  const router = useRouter();
  const [search, setSearch] = useState('');

  const { data, isLoading } = useUoMs({ search });

  const columns = useMemo<ColumnDef<UoM, unknown>[]>(() => [
    { 
      accessorKey: 'code', 
      header: t('code'), 
      cell: ({ row }) => (
        <span className="font-mono text-[11px] font-black text-cyan-500 tracking-widest uppercase px-2 py-0.5 bg-cyan-500/5 rounded-sm border border-cyan-500/10" dir="ltr">
          {row.original.code}
        </span>
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
      accessorKey: 'is_active',
      header: t('status'),
      cell: ({ row }) => (
        <StatusBadge status={row.original.is_active ? 'ACTIVE' : 'INACTIVE'} />
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
                router.push(`/${locale}/master-data/units-of-measure/${row.original.id}`);
              }}
            >
              {t('view')}
            </Button>
          </PermissionGate>
        </div>
      ),
    },
  ], [t, router, locale]);

  const breadcrumbs = [
    { label: t('home'), href: `/${locale}/dashboard` },
    { label: t('master_data'), href: `/${locale}/master-data` },
    { label: tu('title'), href: `/${locale}/master-data/units-of-measure` }
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
              <Link href={`/${locale}/master-data/units-of-measure/new`}>
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
        collectionName="uoms"
        onRowClick={(r: UoM) => router.push(`/${locale}/master-data/units-of-measure/${r.id}`)}
        filters={
          <div className="flex flex-wrap items-end gap-6 w-full py-4 px-6 bg-surface-container-low/50 border border-surface-variant/10 rounded-sm">
            <div className="flex flex-col gap-2 min-w-[300px] flex-1">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">{t('search')}</label>
              <div className="relative">
                <Input
                  placeholder={tu('search_placeholder')}
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
