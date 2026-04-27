'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { FilterPanel } from '@/components/shared/DataTable/FilterPanel';
import { Pagination } from '@/components/shared/DataTable/Pagination';
import { useAdjustmentList, AdjustmentSummary } from '@/features/operations/hooks/useAdjustmentList';
import { Button } from '@/components/ui/button';
import { Plus, CheckCircle2, Clock, XCircle, Filter, Activity, FileCheck, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/shared/StatusBadge';
import Link from 'next/link';
import { format } from 'date-fns';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/PageHeader';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

// Status → badge variant
const STATUS_VARIANT: Record<string, string> = {
  POSTED:   'bg-black/40 text-emerald-400 border-emerald-400/20',
  APPROVED: 'bg-black/40 text-cyan-400 border-cyan-400/20',
  DRAFT:    'bg-black/40 text-white/40 border-white/5',
};

// Reason → TailwindCSS classes for colour-coded chip
const REASON_CHIP: Record<string, string> = {
  DAMAGE:        'bg-rose-500/10 text-rose-400 border border-rose-500/20',
  EXPIRY:        'bg-rose-500/10 text-rose-400 border border-rose-500/20',
  THEFT:         'bg-rose-500/10 text-rose-400 border border-rose-500/20',
  COUNTING_ERROR:'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  OTHER:         'bg-white/5 text-white/40 border border-white/5',
};

// Human-readable reason labels (EN only; locale text comes from i18n if desired)
const REASON_LABEL: Record<string, string> = {
  DAMAGE:        'Damage',
  EXPIRY:        'Expiry',
  THEFT:         'Theft',
  COUNTING_ERROR:'Count Error',
  OTHER:         'Other',
};

export function AdjustmentListClient() {
  const t = useTranslations('operations.adjustment');
  const tCommon = useTranslations('common');
  const router = useRouter();

  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string>('');

  const { data, isLoading } = useAdjustmentList({ status, page });

  const columns: ColumnDef<AdjustmentSummary>[] = [
    {
      accessorKey: 'status',
      header: tCommon('status_label'),
      cell: ({ row }) => (
        <StatusBadge status={row.original.status} />
      ),
    },
    {
      accessorKey: 'document_number',
      header: t('doc_number'),
      cell: ({ row }) => (
        <span dir="ltr" className="font-mono text-cyan-500 font-bold tracking-wider">
          {row.original.document_number}
        </span>
      ),
    },
    {
      accessorKey: 'reason',
      header: t('reason'),
      cell: ({ row }) => {
        const reason = row.original.reason.toLowerCase();
        const cls = REASON_CHIP[row.original.reason as keyof typeof REASON_CHIP] ?? REASON_CHIP.OTHER;
        const label = t.has(`reasons.${reason}`) ? t(`reasons.${reason}`) : row.original.reason;
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${cls}`}>
            {label}
          </span>
        );
      },
    },
    {
      accessorKey: 'warehouse_id',
      header: tCommon('warehouse'),
      cell: ({ row }) => <span className="opacity-80 font-medium">{tCommon('warehouses.' + row.original.warehouse_id.toLowerCase())}</span>,
    },
    {
      accessorKey: 'approved_by',
      header: t('approved_by'),
      cell: ({ row }) =>
        row.original.approved_by ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400/90">
            <CheckCircle2 className="w-3 h-3" />
            {row.original.approved_by}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-white/20 italic">
            <Clock className="w-3 h-3" />
            {tCommon('status.pending') || 'Pending'}
          </span>
        ),
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
              router.push(`adjustments/${row.original.id}`);
            }}
          >
            {tCommon('view')}
          </Button>
        </div>
      ),
    },
  ];

  const totalAdjustments = data?.meta?.total || 0;
  const pendingApprovals = data?.data?.filter(a => a.status === 'DRAFT').length || 0;
  const majorAdjustments = data?.data?.filter(a => a.reason === 'DAMAGE' || a.reason === 'THEFT').length || 0;

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <Breadcrumb 
        items={[
          { label: tCommon('inventory'), href: '#' },
          { label: t('title'), href: '/adjustments' }
        ]} 
      />
      <PageHeader 
        title={t('title')} 
        description={t('description') || 'Corrective inventory volume adjustments and audits'}
        actions={
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-end gap-1 border-r border-white/5 pr-6 hidden md:flex">
               <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse shadow-[0_0_8px_rgba(0,229,255,0.8)]" />
                  {tCommon('status.live_updates') || 'Correction Pulse'}
               </div>
                <div dir="ltr" className="text-[9px] font-bold text-muted-foreground/40">
                   {tCommon('status.last_sync') || 'Last Sync'}: {new Date().toLocaleTimeString()}
                </div>
            </div>
            <Link href="adjustments/new">
              <Button className="h-11 px-8 bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] font-black uppercase tracking-[0.15em] rounded-sm transition-all shadow-lg shadow-cyan-900/20">
                <Plus className="w-3.5 h-3.5 mr-2" />
                {t('create_new')}
              </Button>
            </Link>
          </div>
        }
      />

      {/* Summary Cards - Operational Nocturne Standard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-surface-container-low border-none rounded-2xl overflow-hidden relative group transition-all hover:bg-surface-container-medium border-l-4 border-cyan-500 shadow-[0_0_20px_rgba(8,145,178,0.05)]">
          <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
            <Activity className="w-24 h-24 text-white" />
          </div>
          <CardHeader className="pb-3 relative z-10">
            <CardDescription className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">{t('correction_volume')}</CardDescription>
            <CardTitle className="text-4xl font-display font-bold tracking-tight text-foreground">{totalAdjustments}</CardTitle>
          </CardHeader>
        </Card>

        <Card className="bg-surface-container-low border-none rounded-2xl overflow-hidden relative group transition-all hover:bg-surface-container-medium border-l-4 border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.05)]">
          <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
            <FileCheck className="w-24 h-24 text-cyan-400" />
          </div>
          <CardHeader className="pb-3 relative z-10">
            <CardDescription className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">{t('pending_approval')}</CardDescription>
            <CardTitle className="text-4xl font-display font-bold tracking-tight text-cyan-400">{pendingApprovals}</CardTitle>
          </CardHeader>
        </Card>

        <Card className="bg-surface-container-low border-none rounded-2xl overflow-hidden relative group transition-all hover:bg-surface-container-medium border-l-4 border-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.05)]">
          <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
            <AlertTriangle className="w-24 h-24 text-rose-400" />
          </div>
          <CardHeader className="pb-3 relative z-10">
            <CardDescription className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">{t('critical_losses')}</CardDescription>
            <CardTitle className="text-4xl font-display font-bold tracking-tight text-rose-400">{majorAdjustments}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <DataTable 
        columns={columns}
        data={data?.data || []}
        isLoading={isLoading}
        onRowClick={(row: AdjustmentSummary) => router.push(`adjustments/${row.id}`)}
        collectionName="operations_adjustments"
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
                onValueChange={(val: string | null) => { 
                  const nextStatus = val === 'ALL' || !val ? '' : val;
                  setStatus(nextStatus); 
                  setPage(1); 
                }}
              >
                <SelectTrigger className="w-full bg-surface-container-highest/40 border-none h-12 px-4 text-xs font-bold rounded-xl transition-all hover:bg-surface-container-highest/60 focus:ring-1 focus:ring-cyan-500/30">
                  <SelectValue placeholder={tCommon('status.all')} />
                </SelectTrigger>
                <SelectContent className="bg-surface-container-highest border-white/5 rounded-xl">
                  <SelectItem value="ALL">{tCommon('status.all')}</SelectItem>
                  <SelectItem value="DRAFT">{tCommon('status.draft')}</SelectItem>
                  <SelectItem value="APPROVED">{tCommon('status.approved')}</SelectItem>
                  <SelectItem value="POSTED">{tCommon('status.posted')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2 min-w-[300px] flex-[2]">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 ml-1">{tCommon('search')}</label>
              <div className="relative group">
                <Input
                  placeholder={t('search_placeholder') || 'Search Adjustment Documents...'}
                  className="w-full bg-surface-container-highest/40 border-none h-12 px-12 text-xs font-bold rounded-xl transition-all group-hover:bg-surface-container-highest/60 focus:ring-1 focus:ring-cyan-500/30"
                />
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40 transition-colors group-hover:text-cyan-500/60" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
              </div>
            </div>

            <Button className="h-12 px-8 bg-surface-container-highest/60 hover:bg-cyan-500 hover:text-black text-foreground text-[10px] font-black uppercase tracking-[0.15em] rounded-xl transition-all border border-white/5 shadow-lg group">
              <Filter className="w-3.5 h-3.5 mr-2 transition-transform group-hover:rotate-180" />
              {tCommon('filters_button')}
            </Button>
          </div>
        }
      />
    </div>
  );
}
