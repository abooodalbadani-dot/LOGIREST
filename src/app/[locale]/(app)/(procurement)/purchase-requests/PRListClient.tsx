'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { usePRList, PRSummary } from '@/features/purchasing/hooks/usePRList';
import { Button } from '@/components/ui/button';
import { Plus, Filter, ClipboardList, CheckCircle2, Clock, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { StatusBadge, type BadgeStatus } from '@/components/shared/StatusBadge';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

export function PRListClient({ locale }: { locale: 'ar' | 'en' }) {
  const t = useTranslations('procurement.pr');
  const tc = useTranslations('common');
  const router = useRouter();

  
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string>('');

  const { data, isLoading } = usePRList({ status, page });

  const columns: ColumnDef<PRSummary, unknown>[] = [
    {
      accessorKey: 'status',
      header: tc('status_label'),
      cell: ({ row }) => <StatusBadge status={row.original.status as BadgeStatus} />,
    },
    {
      accessorKey: 'document_number',
      header: tc('doc_number'),
      cell: ({ row }) => (
        <span className="font-mono text-cyan-500 font-bold tracking-wider drop-shadow-[0_0_8px_rgba(6,182,212,0.4)]">
          {row.original.document_number}
        </span>
      ),
    },
    {
      accessorKey: 'department_id',
      header: t('department'),
      cell: ({ row }) => <span className="opacity-90 font-semibold text-xs tracking-tight">{row.original.department_id}</span>,
    },
    {
      accessorKey: 'expected_date',
      header: t('expected_date'),
      cell: ({ row }) =>
        row.original.expected_date ? (
          <div className="flex flex-col">
            <span dir="ltr" className="text-[11px] font-mono font-bold text-muted-foreground/80">
              {format(new Date(row.original.expected_date), 'MMM dd, yyyy')}
            </span>
            <span className="text-[9px] uppercase tracking-tighter opacity-30 font-black">Expected Arrival</span>
          </div>
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
            className="text-[10px] font-black uppercase tracking-widest text-cyan-500 hover:text-white hover:bg-cyan-500/20 h-7 transition-all group"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/${locale}/purchase-requests/${row.original.id}`);

            }}
          >
            {tc('view')}
            <ArrowRight className="w-3 h-3 ml-2 rtl:mr-2 rtl:ml-0 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
          </Button>
        </div>
      ),
    },
  ];

  const totalPRs = data?.meta?.total || 0;
  const approvedCount = data?.data?.filter(p => p.status === 'APPROVED').length || 0;
  const pendingCount = data?.data?.filter(p => p.status === 'DRAFT' || p.status === 'SUBMITTED').length || 0;

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <PageHeader 
        title={t('title')} 
        description={t('description') || 'Internal stock replenishment requests and approval pipeline'}
        actions={
          <div className="flex items-center gap-6">
            <Link href={`/${locale}/purchase-requests/new`}>

              <Button className="h-11 px-8 bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] font-black uppercase tracking-[0.15em] rounded-2xl transition-all shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)] hover:shadow-[0_0_25px_rgba(var(--primary-rgb),0.5)]">
                <Plus className="w-3.5 h-3.5 me-2" />
                {t('create_new')}
              </Button>
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-surface-container-low border-none rounded-2xl overflow-hidden relative group transition-all hover:bg-surface-container-medium shadow-xl shadow-primary/5">
          <div className="absolute top-0 end-0 p-6 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
            <ClipboardList className="w-24 h-24 text-white" />
          </div>
          <CardHeader className="pb-2 relative z-10">
            <CardDescription className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Total Requests</CardDescription>
            <CardTitle className="text-4xl font-display font-bold tracking-tight text-foreground">{totalPRs}</CardTitle>
          </CardHeader>
          <div className="absolute bottom-0 start-0 h-0.5 w-full bg-gradient-to-r from-cyan-500/50 to-transparent" />
        </Card>

        <Card className="bg-surface-container-low border-none rounded-2xl overflow-hidden relative group transition-all hover:bg-surface-container-medium shadow-xl shadow-primary/5">
          <div className="absolute top-0 end-0 p-6 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
            <CheckCircle2 className="w-24 h-24 text-cyan-500" />
          </div>
          <CardHeader className="pb-2 relative z-10">
            <CardDescription className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Approved</CardDescription>
            <CardTitle className="text-4xl font-display font-bold tracking-tight text-cyan-500">{approvedCount}</CardTitle>
          </CardHeader>
          <div className="absolute bottom-0 start-0 h-0.5 w-full bg-gradient-to-r from-cyan-500/50 to-transparent" />
        </Card>

        <Card className="bg-surface-container-low border-none rounded-2xl overflow-hidden relative group transition-all hover:bg-surface-container-medium shadow-xl shadow-primary/5">
          <div className="absolute top-0 end-0 p-6 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
            <Clock className="w-24 h-24 text-amber-400" />
          </div>
          <CardHeader className="pb-2 relative z-10">
            <CardDescription className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Awaiting Action</CardDescription>
            <CardTitle className="text-4xl font-display font-bold tracking-tight text-amber-400">{pendingCount}</CardTitle>
          </CardHeader>
          <div className="absolute bottom-0 start-0 h-0.5 w-full bg-gradient-to-r from-amber-500/50 to-transparent" />
        </Card>

        <Card className="bg-surface-container-highest/20 border-none rounded-2xl overflow-hidden relative group transition-all hover:bg-surface-container-highest/30 shadow-xl shadow-primary/5">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(var(--primary-rgb),0.1),transparent)]" />
          <CardHeader className="pb-2 relative z-10">
            <CardDescription className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60">Pipeline Velocity</CardDescription>
            <CardTitle className="text-2xl font-display font-bold tracking-tight text-primary flex items-center gap-2 uppercase">
              Stable
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_10px_rgba(var(--primary-rgb),0.8)]" />
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="bg-surface-container-low shadow-2xl shadow-primary/10 rounded-2xl overflow-hidden">
        <DataTable 
          columns={columns}
          data={data?.data || []}
          isLoading={isLoading}
          onRowClick={(row: PRSummary) => router.push(`/${locale}/purchase-requests/${row.id}`)}

          collectionName="procurement_purchase_requests"
          pagination={data?.meta ? {
            page: page,
            pageSize: 10,
            total: data.meta.total,
            totalPages: data.meta.total_pages,
            onPageChange: setPage
          } : undefined}
          filters={
            <div className="flex flex-wrap items-end gap-6 w-full py-6 px-8 bg-surface-container-medium/30">
              <div className="flex flex-col gap-2 min-w-[240px] flex-1">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 ps-1">{tc('status_label')}</label>
                <Select
                  value={status || 'ALL'}
                  onValueChange={(val) => { setStatus(val === 'ALL' ? '' : (val ?? '')); setPage(1); }}
                >
                  <SelectTrigger className="w-full bg-surface-container-highest/30 border-none h-12 px-5 text-xs font-bold rounded-2xl shadow-inner shadow-black/20">
                    <SelectValue placeholder={tc('status.all')} />
                  </SelectTrigger>
                  <SelectContent className="bg-surface-container-highest border-none shadow-2xl rounded-2xl">
                    <SelectItem value="ALL">{tc('status.all')}</SelectItem>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="APPROVED">Approved</SelectItem>
                    <SelectItem value="REJECTED">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2 min-w-[300px] flex-[2]">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 ps-1">{tc('search')}</label>
                <div className="relative">
                  <Input
                    placeholder="Search Request Documents..."
                    className="w-full bg-surface-container-highest/30 border-none h-12 px-12 text-xs font-bold rounded-2xl shadow-inner shadow-black/20"
                  />
                  <svg className="absolute start-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                </div>
              </div>

              <Button className="h-12 px-8 bg-surface-container-highest/50 hover:bg-surface-container-highest text-foreground text-[10px] font-black uppercase tracking-[0.15em] rounded-2xl transition-all border-none shadow-md">
                <Filter className="w-3.5 h-3.5 me-2" />
                {tc('filters')}
              </Button>
            </div>
          }
        />
      </div>
    </div>

  );
}
