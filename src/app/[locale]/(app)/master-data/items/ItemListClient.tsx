'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Plus, Package, CheckCircle2, Search, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { useMasterDataList } from '@/features/master-data/hooks/useMasterDataCRUD';
import { ItemSchema, type Item } from '@/types/master-data';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/shared/PageHeader';
import { Input } from '@/components/ui/input';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { MetricCard } from '@/components/ui/metric-card';
import { EmptyState } from '@/components/shared/EmptyState';


export function ItemListClient({ locale }: { locale: string }) {
  const tc = useTranslations('masterData.common');
  const ti = useTranslations('masterData.items');
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useMasterDataList(
    'items',
    ItemSchema,
    { page: String(page), ...(search ? { search } : {}) },
  );

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
      header: tc('code'), 
      meta: { numeric: true },
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-mono text-cyan-500 font-black tracking-wider uppercase">{row.original.code}</span>
          <span className="text-[9px] text-muted-foreground/60 font-medium">{row.original.barcode}</span>
        </div>
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
      accessorKey: 'primary_uom', 
      header: ti('primary_uom'), 
      cell: ({ row }) => (
        <Badge variant="outline" className="h-5 px-1.5 text-[9px] font-black bg-surface-container-low/30 border-surface-variant/10 uppercase tracking-tighter text-cyan-400">
          {row.original.primary_uom.code}
        </Badge>
      )
    },
    {
      accessorKey: 'track_lots', 
      header: ti('track_lots'),
      cell: ({ row }) => row.original.track_lots
        ? <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-[9px] uppercase tracking-wider">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
            {tc('yes')}
          </div>
        : <div className="flex items-center gap-1.5 text-muted-foreground/30 font-bold text-[9px] uppercase tracking-wider">
            <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/20" />
            {tc('no')}
          </div>,
    },
    {
      accessorKey: 'is_active', 
      header: tc('is_active'),
      cell: ({ row }) => (
        <Badge variant={row.original.is_active ? 'default' : 'outline'} className="text-[9px] font-black uppercase tracking-widest rounded-sm">
          {row.original.is_active ? tc('active') : tc('inactive')}
        </Badge>
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
              {tc('view')}
            </Button>
          </PermissionGate>
        </div>
      ),
    },
  ], [tc, ti, locale, router]);

  const breadcrumbs = [
    { label: tc('master_data'), href: `/${locale}/master-data` },
    { label: ti('title'), href: '#' }
  ];

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <Breadcrumb items={breadcrumbs} />
      
      <PageHeader 
        title={ti('title')} 
        description={ti('description')}
        actions={
          <PermissionGate action="create" resource="master_data">
            <Link href={`/${locale}/master-data/items/new`}>
              <Button className="h-11 px-8 bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] font-black uppercase tracking-[0.15em] rounded-sm transition-all shadow-lg shadow-cyan-900/20">
                <Plus className="w-3.5 h-3.5 me-2" />
                {tc('create_new')}
              </Button>
            </Link>
          </PermissionGate>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          label={tc('total_skus')}
          value={stats.total}
          icon={Package}
          color="cyan"
          dir="ltr"
        />

        <MetricCard
          label={tc('active')}
          value={stats.active}
          icon={CheckCircle2}
          color="emerald"
          dir="ltr"
        />

        <MetricCard
          label={ti('track_lots')}
          value={stats.trackingLots}
          icon={Info}
          color="amber"
          dir="ltr"
        />
      </div>

      <DataTable 
        columns={columns} 
        data={data?.data ?? []} 
        isLoading={isLoading}
        collectionName="master_data_items"
        emptyState={
          <EmptyState 
            title={ti('no_items_title')}
            description={ti('no_items_desc')}
            action={
              <PermissionGate action="create" resource="master_data">
                <Link href={`/${locale}/master-data/items/new`}>
                  <Button className="h-10 px-6 bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] font-black uppercase tracking-widest rounded-sm transition-all shadow-lg">
                    <Plus className="w-3.5 h-3.5 me-2" />
                    {tc('create_new')}
                  </Button>
                </Link>
              </PermissionGate>
            }
          />
        }
        onRowClick={(r: Item) => router.push(`/${locale}/master-data/items/${r.id}`)}
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
                  placeholder={ti('scan_or_type')}
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
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
