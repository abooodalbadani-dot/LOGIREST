'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useGRNList, type GRNSummary } from '@/features/purchasing/hooks/useGRNList';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { StatusBadge, type BadgeStatus } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/PageHeader';
import { Plus, Filter, Search, CheckCircle2, Clock, Inbox, ArrowRight } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { Breadcrumb } from '@/components/shared/Breadcrumb';

export function GRNListClient({
  initialStatus,
  initialPage,
  locale,
}: {
  initialStatus?: string;
  initialPage: number;
  locale: 'ar' | 'en';
}) {
  const t = useTranslations('procurement.grn');
  const tc = useTranslations('common');
  const router = useRouter();

  const [status, setStatus] = useState<string | undefined>(initialStatus);
  const [page, setPage] = useState(initialPage);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading } = useGRNList({ status, page, search: debouncedSearch });

  const columns: ColumnDef<GRNSummary, unknown>[] = [
    {
      accessorKey: 'status',
      header: tc('status_label'),
      cell: ({ row }) => <StatusBadge status={row.original.status as BadgeStatus} />,
    },
    {
      accessorKey: 'document_number',
      header: tc('doc_number'),
      cell: ({ row }) => (
        <div className="flex flex-col gap-0.5">
          <span dir="ltr" className="font-mono text-cyan-500/90 font-black tracking-widest text-[13px]">{row.original.document_number}</span>
          <span className="text-[9px] font-black uppercase tracking-tighter opacity-20">{t('received_manifest_sub')}</span>
        </div>
      ),
    },
    {
      accessorKey: 'supplier_id',
      header: tc('supplier'),
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span dir="ltr" className="text-[11px] font-bold tracking-tight text-foreground/80 text-left rtl:text-right">{row.original.supplier_id}</span>
          <span className="text-[9px] font-medium opacity-40 uppercase tracking-widest">{t('verified_vendor_sub')}</span>
        </div>
      ),
    },
    {
      accessorKey: 'posted_at',
      header: tc('posted_at'),
      cell: ({ row }) =>
        row.original.posted_at ? (
          <div className="flex items-center gap-2">
            <Clock className="w-3 h-3 opacity-20" />
            <span dir="ltr" className="text-[10px] opacity-60 font-mono font-bold tracking-tighter">
              {new Date(row.original.posted_at).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US', { day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
          </div>
        ) : <span className="opacity-10 text-[10px] font-black italic">{t('pending_label')}</span>,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            className="text-[9px] font-black uppercase tracking-[0.2em] text-cyan-500 hover:text-white hover:bg-cyan-500/20 h-8 px-4 rounded-sm transition-all group"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/${locale}/goods-received/${row.original.id}`);
            }}
          >
            {tc('view')}
            <ArrowRight className="w-3 h-3 ml-2 rtl:mr-2 rtl:ml-0 opacity-0 group-hover:opacity-100 transition-all translate-x-[-4px] group-hover:translate-x-0" />
          </Button>
        </div>
      ),
    },
  ];

  const totalGRNs = data?.meta?.total || 0;
  const postedCount = data?.data?.filter(g => g.status === 'POSTED').length || 0;
  const draftCount = data?.data?.filter(g => g.status === 'DRAFT').length || 0;

  return (
    <div className="p-10 max-w-[1600px] mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-1000">
      <Breadcrumb 
        items={[
          { label: tc('sidebar.dashboard'), href: `/${locale}` },
          { label: tc('sidebar.grn') }
        ]} 
      />
      <PageHeader
        title={t('title')}
        description={t('description')}
        actions={
          <div className="flex items-center gap-6">
            <Link href={`/${locale}/goods-received/new`}>
              <Button className="h-12 px-10 bg-cyan-500 hover:bg-cyan-400 text-black text-[10px] font-black uppercase tracking-[0.2em] rounded-sm transition-all shadow-[0_0_25px_rgba(6,182,212,0.25)] border-none">
                <Plus className="w-4 h-4 mr-2" />
                {t('create_new')}
              </Button>
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <Card className="bg-surface-container-low border border-white/5 rounded-sm overflow-hidden relative group transition-all hover:bg-surface-container-medium hover:border-white/10 shadow-2xl">
          <div className="absolute top-0 right-0 p-8 opacity-[0.02] group-hover:opacity-[0.08] transition-all transform group-hover:scale-110">
            <Inbox className="w-24 h-24 text-white" />
          </div>
          <CardHeader className="pb-4 relative z-10">
            <CardDescription className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/40 group-hover:text-cyan-500/60 transition-colors">{t('stats.total_manifests')}</CardDescription>
            <CardTitle className="text-5xl font-display font-black tracking-tighter text-foreground mt-2" dir="ltr">{totalGRNs}</CardTitle>
          </CardHeader>
          <div className="absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r from-cyan-500/40 to-transparent opacity-50" />
        </Card>

        <Card className="bg-surface-container-low border border-white/5 rounded-sm overflow-hidden relative group transition-all hover:bg-surface-container-medium hover:border-white/10 shadow-2xl">
          <div className="absolute top-0 right-0 p-8 opacity-[0.02] group-hover:opacity-[0.08] transition-all transform group-hover:scale-110">
            <CheckCircle2 className="w-24 h-24 text-emerald-400" />
          </div>
          <CardHeader className="pb-4 relative z-10">
            <CardDescription className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/40 group-hover:text-emerald-400/60 transition-colors">{t('stats.committed_batches')}</CardDescription>
            <CardTitle className="text-5xl font-display font-black tracking-tighter text-emerald-400 mt-2" dir="ltr">{postedCount}</CardTitle>
          </CardHeader>
          <div className="absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r from-emerald-500/40 to-transparent opacity-50" />
        </Card>

        <Card className="bg-surface-container-low border border-white/5 rounded-sm overflow-hidden relative group transition-all hover:bg-surface-container-medium hover:border-white/10 shadow-2xl">
          <div className="absolute top-0 right-0 p-8 opacity-[0.02] group-hover:opacity-[0.08] transition-all transform group-hover:scale-110">
            <Clock className="w-24 h-24 text-amber-400" />
          </div>
          <CardHeader className="pb-4 relative z-10">
            <CardDescription className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/40 group-hover:text-amber-400/60 transition-colors">{t('stats.awaiting_audit')}</CardDescription>
            <CardTitle className="text-5xl font-display font-black tracking-tighter text-amber-400 mt-2" dir="ltr">{draftCount}</CardTitle>
          </CardHeader>
          <div className="absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r from-amber-500/40 to-transparent opacity-50" />
        </Card>
      </div>

      <div className="bg-surface-container-low/30 border border-white/5 rounded-sm p-1">
        <DataTable
          columns={columns}
          data={data?.data || []}
          isLoading={isLoading}
          onRowClick={(row: GRNSummary) => router.push(`/${locale}/goods-received/${row.id}`)}
          collectionName="procurement_grns"
          pagination={data?.meta ? {
            page: data.meta.page,
            pageSize: data.meta.page_size,
            total: data.meta.total,
            totalPages: data.meta.total_pages,
            onPageChange: setPage
          } : undefined}
          filters={
            <div className="flex flex-wrap items-end gap-8 w-full py-6 px-8 bg-surface-container-low border-b border-white/5">
              <div className="flex flex-col gap-3 min-w-[240px] flex-1">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/40">{tc('status_filtering')}</label>
                <Select
                  value={status || 'ALL'}
                  onValueChange={(val) => { setStatus(val === 'ALL' ? undefined : (val ?? undefined)); setPage(1); }}
                >
                  <SelectTrigger className="w-full bg-surface-container-highest/20 border-white/5 h-12 px-4 text-[10px] font-black uppercase tracking-widest focus:ring-cyan-500/20">
                    <SelectValue placeholder={tc('status.all')} />
                  </SelectTrigger>
                  <SelectContent className="bg-surface-container-high border-white/10">
                    <SelectItem value="ALL" className="text-[10px] font-black uppercase tracking-widest">{tc('status.all')}</SelectItem>
                    <SelectItem value="DRAFT" className="text-[10px] font-black uppercase tracking-widest">{tc('status.draft')}</SelectItem>
                    <SelectItem value="POSTED" className="text-[10px] font-black uppercase tracking-widest">{tc('status.posted')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-3 min-w-[300px] flex-[2]">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/40">{t('stream_identifier')}</label>
                <div className="relative">
                  <Input
                    placeholder={t('search_placeholder')}
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    className="w-full bg-surface-container-highest/20 border-white/5 h-12 px-12 text-xs font-bold focus:ring-cyan-500/20 placeholder:text-muted-foreground/20 rounded-sm"
                  />
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-500/40" />
                  {search && (
                    <button 
                      onClick={() => { setSearch(''); setPage(1); }}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 hover:text-cyan-500 transition-colors"
                    >
                      {tc('reset')}
                    </button>
                  )}
                </div>
              </div>

              <Button 
                variant="outline"
                onClick={() => { setStatus(undefined); setSearch(''); setPage(1); }}
                className="h-12 px-10 bg-surface-container-highest/30 hover:bg-surface-container-highest text-[10px] font-black uppercase tracking-[0.2em] rounded-sm transition-all border border-white/5 group"
              >
                <Filter className="w-4 h-4 mr-2 group-hover:text-cyan-500 transition-colors" />
                {tc('reset')}
              </Button>
            </div>
          }
        />
      </div>
    </div>
  );
}
