'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { FilterPanel } from '@/components/shared/DataTable/FilterPanel';
import { Pagination } from '@/components/shared/DataTable/Pagination';
import { useTransferList, TransferSummary } from '@/features/operations/hooks/useTransferList';
import { Button } from '@/components/ui/button';
import { Plus, Filter, Repeat, Truck, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { format } from 'date-fns';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/PageHeader';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/shared/StatusBadge';

export function TransferListClient() {
  const t = useTranslations('operations.transfer');
  const tCommon = useTranslations('common');
  const router = useRouter();
  
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string>('');

  const { data, isLoading } = useTransferList({ status, page });

  const columns: ColumnDef<TransferSummary>[] = [
    {
      accessorKey: 'transfer_status',
      header: tCommon('status_label'),
      cell: ({ row }) => <StatusBadge status={row.original.transfer_status} />,
    },
    {
      accessorKey: 'document_number',
      header: tCommon('doc_number'),
      cell: ({ row }) => (
        <span dir="ltr" className="font-mono text-cyan-500/90 font-bold tracking-wider">
          {row.original.document_number}
        </span>
      ),
    },
    {
      accessorKey: 'from_warehouse_id',
      header: t('from_warehouse'),
      cell: ({ row }) => (
        <span className="opacity-80 font-medium">
          {tCommon('warehouses.' + row.original.from_warehouse_id.toLowerCase())}
        </span>
      ),
    },
    {
      accessorKey: 'to_warehouse_id',
      header: t('to_warehouse'),
      cell: ({ row }) => (
        <span className="opacity-80 font-medium">
          {tCommon('warehouses.' + row.original.to_warehouse_id.toLowerCase())}
        </span>
      ),
    },
    {
      accessorKey: 'shipped_at',
      header: t('shipped_at'),
      cell: ({ row }) =>
        row.original.shipped_at ? (
          <span dir="ltr" className="text-[11px] opacity-40 font-mono italic">{format(new Date(row.original.shipped_at), 'MMM dd, yyyy')}</span>
        ) : <span className="opacity-20">—</span>,
    },
    {
      accessorKey: 'created_at',
      header: tCommon('created_at'),
      cell: ({ row }) =>
        row.original.created_at ? (
          <span dir="ltr" className="text-[11px] opacity-40 font-mono italic">
            {format(new Date(row.original.created_at), 'MMM dd, yyyy')}
          </span>
        ) : <span className="opacity-20">—</span>,
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
              router.push(`transfers/${row.original.id}`);
            }}
          >
            {tCommon('view') || 'Inspect'}
          </Button>
        </div>
      ),
    },
  ];

  const totalTransfers = data?.meta?.total || 0;
  const inTransitCount = data?.data?.filter(t => t.transfer_status === 'IN_TRANSIT').length || 0;
  const completedCount = data?.data?.filter(t => t.transfer_status === 'POSTED' || t.transfer_status === 'RECEIVED').length || 0;

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <Breadcrumb 
        items={[
          { label: tCommon('modules.operations'), href: `transfers` },
          { label: t('title') }
        ]} 
      />

      <PageHeader 
        title={t('title')} 
        description={t('description')}
        actions={
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-end gap-1 border-r border-white/5 pr-6 hidden md:flex">
               <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse shadow-[0_0_8px_rgba(0,229,255,0.8)]" />
                  {tCommon('status.live_updates')}
               </div>
               <div className="text-[9px] font-bold text-muted-foreground/40" dir="ltr">
                  {tCommon('status.last_sync')}: {new Date().toLocaleTimeString()}
               </div>
            </div>
            <Link href="transfers/new">
              <Button className="h-11 px-8 bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] font-black uppercase tracking-[0.15em] rounded-sm transition-all shadow-lg shadow-cyan-900/20">
                <Plus className="w-3.5 h-3.5 mr-2" />
                {t('create_new')}
              </Button>
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-surface-container-low border-none rounded-2xl overflow-hidden relative group transition-all hover:bg-surface-container-medium border-l-4 border-cyan-500 shadow-[0_0_20px_rgba(8,145,178,0.05)]">
          <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
            <Repeat className="w-24 h-24 text-white" />
          </div>
          <CardHeader className="pb-3 relative z-10">
            <CardDescription className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">{t('total_transfers')}</CardDescription>
            <CardTitle className="text-4xl font-display font-bold tracking-tight text-foreground">{totalTransfers}</CardTitle>
          </CardHeader>
        </Card>

        <Card className="bg-surface-container-low border-none rounded-2xl overflow-hidden relative group transition-all hover:bg-surface-container-medium border-l-4 border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.05)]">
          <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
            <Truck className="w-24 h-24 text-amber-400" />
          </div>
          <CardHeader className="pb-3 relative z-10">
            <CardDescription className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">{tCommon('status.in_transit')}</CardDescription>
            <CardTitle className="text-4xl font-display font-bold tracking-tight text-amber-400">{inTransitCount}</CardTitle>
          </CardHeader>
        </Card>

        <Card className="bg-surface-container-low border-none rounded-2xl overflow-hidden relative group transition-all hover:bg-surface-container-medium border-l-4 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.05)]">
          <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
            <CheckCircle className="w-24 h-24 text-emerald-400" />
          </div>
          <CardHeader className="pb-3 relative z-10">
            <CardDescription className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">{t('completed')}</CardDescription>
            <CardTitle className="text-4xl font-display font-bold tracking-tight text-emerald-400">{completedCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <DataTable 
        columns={columns}
        data={data?.data || []}
        isLoading={isLoading}
        onRowClick={(row: TransferSummary) => router.push(`transfers/${row.id}`)}
        collectionName="operations_transfers"
        pagination={data?.meta ? {
          page: page,
          pageSize: 10,
          total: data.meta.total,
          totalPages: data.meta.total_pages,
          onPageChange: setPage
        } : undefined}
        filters={
          <div className="flex flex-wrap items-end gap-6 w-full py-6 px-8 bg-surface-container-low border border-white/5 rounded-2xl shadow-xl">
            <div className="flex flex-col gap-2 min-w-[240px] flex-1">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 ml-1">{tCommon('status_label')}</label>
              <Select
                value={status || 'ALL'}
                onValueChange={(val) => { setStatus(val === 'ALL' ? '' : (val ?? '')); setPage(1); }}
              >
                <SelectTrigger className="w-full bg-surface-container-highest/40 border-none h-12 px-4 text-xs font-bold rounded-xl transition-all hover:bg-surface-container-highest/60 focus:ring-1 focus:ring-cyan-500/30">
                  <SelectValue placeholder={tCommon('status.all')} />
                </SelectTrigger>
                <SelectContent className="bg-surface-container-highest border-white/5 rounded-xl">
                  <SelectItem value="ALL">{tCommon('status.all')}</SelectItem>
                  <SelectItem value="DRAFT">{tCommon('status.draft')}</SelectItem>
                  <SelectItem value="IN_TRANSIT">{tCommon('status.in_transit')}</SelectItem>
                  <SelectItem value="RECEIVED">{tCommon('status.posted')}</SelectItem>
                  <SelectItem value="POSTED">{tCommon('status.posted')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2 min-w-[300px] flex-[2]">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 ml-1">{tCommon('search')}</label>
              <div className="relative group">
                <Input
                  placeholder={t('search_placeholder')}
                  className="w-full bg-surface-container-highest/40 border-none h-12 px-12 text-xs font-bold rounded-xl transition-all group-hover:bg-surface-container-highest/60 focus:ring-1 focus:ring-cyan-500/30"
                />
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40 transition-colors group-hover:text-cyan-500/60" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
              </div>
            </div>

            <Button className="h-12 px-8 bg-surface-container-highest/60 hover:bg-cyan-500 hover:text-black text-foreground text-[10px] font-black uppercase tracking-[0.15em] rounded-xl transition-all border border-white/5 shadow-lg group">
              <Filter className="w-3.5 h-3.5 mr-2 transition-transform group-hover:rotate-180" />
              {tCommon('filters')}
            </Button>
          </div>
        }
      />
    </div>
  );
}
