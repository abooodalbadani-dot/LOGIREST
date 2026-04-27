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
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/shared/PageHeader';
import { Input } from '@/components/ui/input';
import { Breadcrumb } from '@/components/shared/Breadcrumb';

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

  const columns: ColumnDef<Item, unknown>[] = [
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
        <Badge variant="outline" className="h-5 px-1.5 text-[9px] font-black bg-surface-container-low/30 border-white/5 uppercase tracking-tighter text-cyan-400">
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
        </div>
      ),
    },
  ];

  const breadcrumbs = [
    { label: tc('title'), href: `/${locale}/master-data` },
    { label: ti('title'), href: '#' }
  ];

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <Breadcrumb items={breadcrumbs} />
      
      <PageHeader 
        title={ti('title')} 
        description={ti('description')}
        actions={
          <Link href={`/${locale}/master-data/items/new`}>
            <Button className="h-11 px-8 bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] font-black uppercase tracking-[0.15em] rounded-sm transition-all shadow-lg shadow-cyan-900/20">
              <Plus className="w-3.5 h-3.5 mr-2" />
              {tc('create_new')}
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-surface-container-low border-none rounded-sm overflow-hidden relative group transition-all hover:bg-surface-container-medium">
          <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
            <Package className="w-24 h-24 text-white" />
          </div>
          <CardHeader className="pb-2 relative z-10">
            <CardDescription className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">{tc('total_skus')}</CardDescription>
            <CardTitle className="text-4xl font-display font-bold tracking-tight text-foreground" dir="ltr">{stats.total}</CardTitle>
          </CardHeader>
          <div className="absolute bottom-0 left-0 h-0.5 w-full bg-gradient-to-r from-cyan-500/50 to-transparent" />
        </Card>

        <Card className="bg-surface-container-low border-none rounded-sm overflow-hidden relative group transition-all hover:bg-surface-container-medium">
          <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
            <CheckCircle2 className="w-24 h-24 text-emerald-400" />
          </div>
          <CardHeader className="pb-2 relative z-10">
            <CardDescription className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">{tc('active')}</CardDescription>
            <CardTitle className="text-4xl font-display font-bold tracking-tight text-emerald-400" dir="ltr">{stats.active}</CardTitle>
          </CardHeader>
          <div className="absolute bottom-0 left-0 h-0.5 w-full bg-gradient-to-r from-emerald-500/50 to-transparent" />
        </Card>

        <Card className="bg-surface-container-low border-none rounded-sm overflow-hidden relative group transition-all hover:bg-surface-container-medium">
          <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
            <Info className="w-24 h-24 text-amber-400" />
          </div>
          <CardHeader className="pb-2 relative z-10">
            <CardDescription className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">{ti('track_lots')}</CardDescription>
            <CardTitle className="text-4xl font-display font-bold tracking-tight text-amber-400" dir="ltr">{stats.trackingLots}</CardTitle>
          </CardHeader>
          <div className="absolute bottom-0 left-0 h-0.5 w-full bg-gradient-to-r from-amber-500/50 to-transparent" />
        </Card>
      </div>

      <DataTable 
        columns={columns} 
        data={data?.data ?? []} 
        isLoading={isLoading}
        collectionName="master_data_items"
        onRowClick={(r: Item) => router.push(`/${locale}/master-data/items/${r.id}`)}
        pagination={data?.meta ? {
          page: data.meta.page,
          pageSize: data.meta.page_size,
          total: data.meta.total,
          totalPages: data.meta.total_pages,
          onPageChange: setPage
        } : undefined}
        filters={
          <div className="flex flex-wrap items-end gap-6 w-full py-4 px-6 bg-surface-container-low/50 border border-white/5 rounded-sm">
            <div className="flex flex-col gap-2 min-w-[300px] flex-1">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">{tc('search')}</label>
              <div className="relative">
                <Input
                  placeholder={ti('scan_or_type')}
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="w-full bg-surface-container-highest/30 border-none h-11 px-10 text-xs font-bold"
                />
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
              </div>
            </div>
          </div>
        }
      />
    </div>
  );
}
