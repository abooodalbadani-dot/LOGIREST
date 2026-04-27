'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Plus, Barcode as BarcodeIcon, Tag, Search, Box } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { useMasterDataList } from '@/features/master-data/hooks/useMasterDataCRUD';
import { BarcodeSchema, type Barcode } from '@/types/master-data';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ColumnDef } from '@tanstack/react-table';
import { PageHeader } from '@/components/shared/PageHeader';
import { Input } from '@/components/ui/input';
import { Breadcrumb } from '@/components/shared/Breadcrumb';

export function BarcodeListClient({ locale }: { locale: string }) {
  const tc = useTranslations('masterData.common');
  const tb = useTranslations('masterData.barcodes');
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useMasterDataList(
    'barcodes', 
    BarcodeSchema, 
    { page: String(page), ...(search ? { search } : {}) }
  );

  const stats = useMemo(() => {
    const barcodes = data?.data || [];
    const uniqueItems = new Set(barcodes.map(b => b.item_id)).size;
    return {
      total: data?.meta?.total || 0,
      uniqueSKUs: uniqueItems,
    };
  }, [data]);

  const columns: ColumnDef<Barcode, unknown>[] = [
    { 
      accessorKey: 'barcode', 
      header: tb('barcode_label'), 
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <BarcodeIcon className="w-3.5 h-3.5 text-cyan-500/50" />
          <span dir="ltr" className="font-mono text-xs font-black text-cyan-500 tracking-widest uppercase">
            {row.original.barcode}
          </span>
        </div>
      )
    },
    { 
      accessorKey: 'item_id', 
      header: tb('item'), 
      cell: ({ row }) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-bold text-xs tracking-tight">{row.original.item_id}</span>
          <span className="text-[10px] text-muted-foreground/60 uppercase tracking-tighter">{tb('sku_link_verified')}</span>
        </div>
      )
    },
    { 
      accessorKey: 'default_qty', 
      header: tb('default_qty'), 
      cell: ({ row }) => (
        <span className="font-mono text-[11px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-sm border border-emerald-500/20">
          {row.original.default_qty}
        </span>
      )
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex justify-end">
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-[10px] font-black uppercase tracking-widest text-cyan-500 hover:text-cyan-500 hover:bg-cyan-500/10 h-7"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/${locale}/master-data/barcodes/${row.original.id}`);
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
    { label: tb('title'), href: '#' }
  ];

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <Breadcrumb items={breadcrumbs} />

      <PageHeader 
        title={tb('title')} 
        description={tb('description')}
        actions={
          <Link href={`/${locale}/master-data/barcodes/new`}>
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
            <BarcodeIcon className="w-24 h-24 text-white" />
          </div>
          <CardHeader className="pb-2 relative z-10">
            <CardDescription className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">{tb('total_identities')}</CardDescription>
            <CardTitle className="text-4xl font-display font-bold tracking-tight text-foreground">{stats.total}</CardTitle>
          </CardHeader>
          <div className="absolute bottom-0 left-0 h-0.5 w-full bg-gradient-to-r from-cyan-500/50 to-transparent" />
        </Card>

        <Card className="bg-surface-container-low border-none rounded-sm overflow-hidden relative group transition-all hover:bg-surface-container-medium">
          <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
            <Box className="w-24 h-24 text-amber-400" />
          </div>
          <CardHeader className="pb-2 relative z-10">
            <CardDescription className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">{tb('linked_assets')}</CardDescription>
            <CardTitle className="text-4xl font-display font-bold tracking-tight text-amber-400">{stats.uniqueSKUs}</CardTitle>
          </CardHeader>
          <div className="absolute bottom-0 left-0 h-0.5 w-full bg-gradient-to-r from-amber-500/50 to-transparent" />
        </Card>

        <Card className="bg-surface-container-low border-none rounded-sm overflow-hidden relative group transition-all hover:bg-surface-container-medium">
          <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
            <Tag className="w-24 h-24 text-emerald-400" />
          </div>
          <CardHeader className="pb-2 relative z-10">
            <CardDescription className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">{tb('active_mappings')}</CardDescription>
            <CardTitle className="text-4xl font-display font-bold tracking-tight text-emerald-400">100%</CardTitle>
          </CardHeader>
          <div className="absolute bottom-0 left-0 h-0.5 w-full bg-gradient-to-r from-emerald-500/50 to-transparent" />
        </Card>
      </div>

      <DataTable 
        columns={columns} 
        data={data?.data ?? []} 
        isLoading={isLoading}
        collectionName="master_data_barcodes"
        onRowClick={(r: Barcode) => router.push(`/${locale}/master-data/barcodes/${r.id}`)}
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
                  placeholder={tb('search_placeholder')}
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
