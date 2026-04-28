'use client';
 
import * as React from 'react';
import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useIssueList, IssueSummary } from '@/features/operations/hooks/useIssueList';
import { StatusBadge } from '@/components/ui/status-badge';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/PageHeader';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { MetricCard } from '@/components/ui/metric-card';
import { EmptyState } from '@/components/shared/EmptyState';
import { ColumnDef } from '@tanstack/react-table';
import { Plus, Filter, Search, ArrowUpRight, LayoutGrid, List as ListIcon, Activity, FileText, ClipboardCheck } from 'lucide-react';
import Link from 'next/link';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
 
export function IssueListClient({ initialStatus, initialPage, locale }: { initialStatus?: string; initialPage: number; locale: 'ar' | 'en' }) {
  const t = useTranslations('operations.issue');
  const tc = useTranslations('common');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
 
  const { data, isLoading } = useIssueList({
    status: initialStatus,
    page: initialPage
  });
 
  const handleStatusChange = (val: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (val && val !== 'ALL') {
      params.set('status', val);
    } else {
      params.delete('status');
    }
    params.set('page', '1');
    router.push(`${pathname}?${params.toString()}`);
  };
 
  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', newPage.toString());
    router.push(`${pathname}?${params.toString()}`);
  };
 
  const columns = useMemo<ColumnDef<IssueSummary>[]>(() => [
    {
      accessorKey: 'status',
      header: () => <span className="text-[10px] font-black uppercase tracking-widest opacity-40">{tc('status_label')}</span>,
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="w-1 h-8 rounded-full bg-surface-container-highest/20" />
          <StatusBadge status={row.original.status} />
        </div>
      ),
    },
    {
      accessorKey: 'document_number',
      header: () => <span className="text-[10px] font-black uppercase tracking-widest opacity-40">{t('doc_number')}</span>,
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span dir="ltr" className="font-mono text-[11px] font-black text-cyan-500 tracking-wider">
            {row.original.document_number}
          </span>
          <span className="text-[9px] font-bold text-muted-foreground/60/30 uppercase tracking-tighter">
            Internal Voucher
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'destination_department_id',
      header: () => <span className="text-[10px] font-black uppercase tracking-widest opacity-40">{t('destination')}</span>,
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-surface-container-highest/50">
             <Activity className="w-3 h-3 text-muted-foreground/60/40" />
          </div>
          <span className="text-[11px] font-bold text-muted-foreground/60/80 tracking-tight">
            {row.original.destination_department_id || '—'}
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'created_at',
      header: () => <span className="text-[10px] font-black uppercase tracking-widest opacity-40">{tc('created_at')}</span>,
      cell: ({ row }) => (
        <div className="flex flex-col items-start gap-0.5">
           <span dir="ltr" className="text-[10px] font-mono font-bold text-muted-foreground/60/60 tabular-nums">
             {format(new Date(row.original.created_at), 'dd MMM yyyy')}
           </span>
           <span className="text-[8px] font-black text-muted-foreground/60/20 uppercase tracking-widest">
             {format(new Date(row.original.created_at), 'HH:mm')}
           </span>
        </div>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex justify-end pe-4">
          <Button
            variant="ghost"
            size="sm"
            className="group/btn h-9 w-9 rounded-xl bg-surface-container-highest/30 hover:bg-cyan-500 hover:text-white transition-all duration-300"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/${locale}/issues/${row.original.id}`);
            }}
          >
            <ArrowUpRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 rtl:group-hover/btn:-translate-x-0.5" />
          </Button>
        </div>
      ),
    },
  ], [t, tc, locale, router]);
 
  const meta = data?.meta?.pagination;
  const totalItemsCount = meta?.total || 0;
  const draftCount = data?.data?.filter(i => i.status === 'DRAFT').length || 0;
  const postedCount = data?.data?.filter(i => i.status === 'POSTED').length || 0;
 
  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      
      <PageHeader 
        title={t('title')} 
        description={t('description') || 'Internal stock consumption and department issues.'}
        actions={
          <div className="flex items-center gap-4">
            <PermissionGate action="create" resource="issue">
               <Link href={`/${locale}/issues/new`}>
                  <Button className="h-10 px-6 rounded-xl bg-surface-container-low border border-white/5 text-[9px] font-black uppercase tracking-widest gap-2 group transition-all hover:scale-[1.02] hover:bg-surface-container-medium group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 shadow-[0_0_35px_rgba(6,182,212,0.5)] border-none">
                     <Plus className="w-4 h-4 me-3" />
                     {t('create_new')}
                  </Button>
               </Link>
            </PermissionGate>
          </div>
        }
      />
 
      {/* Fulfillment Status Ribbon */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <MetricCard
          label="Throughput Volume"
          value={totalItemsCount}
          icon={Activity}
          trend="active"
        />
        <MetricCard
          label="Pending Selection"
          value={draftCount}
          icon={FileText}
          trend="active"
          color="amber"
        />
        <MetricCard
          label="Finalized Issues"
          value={postedCount}
          icon={ClipboardCheck}
          trend="active"
          color="emerald"
        />
        <div className="bg-surface-container-low p-6 flex flex-col gap-2 transition-colors hover:bg-surface-container-lowest justify-center border border-outline-low rounded-2xl shadow-xl shadow-black/5">
            <div className="flex items-center gap-3">
               <div className="flex -space-x-2 rtl:space-x-reverse">
                  {[1,2,3].map(i => (
                     <div key={i} className="w-7 h-7 rounded-full bg-surface-container-highest border-2 border-surface-container-low flex items-center justify-center text-[8px] font-black text-muted-foreground/60/40">
                        OP
                     </div>
                  ))}
               </div>
               <div className="text-[9px] font-bold text-muted-foreground/60/40 leading-tight">
                  <span className="text-foreground">3 Operators</span> active<br/>in fulfillment stream
               </div>
            </div>
         </div>
      </div>
 
      {/* Advanced Filter Substrate */}
      <div className="bg-surface-container-low p-6 rounded-[2.5rem] border border-outline-low shadow-xl shadow-primary/5">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex-1 min-w-[300px] relative group">
            <div className="absolute inset-y-0 start-5 flex items-center pointer-events-none transition-colors group-focus-within:text-cyan-500 text-muted-foreground/60/30">
              <Search className="w-4 h-4" />
            </div>
            <Input
              placeholder={t('search_placeholder') || 'Search by Document Number...'}
              className="w-full bg-surface-container-high/50 border-none h-14 ps-14 pe-6 text-[11px] font-bold rounded-2xl shadow-inner shadow-black/5 focus-visible:ring-2 focus-visible:ring-cyan-500/20 transition-all"
            />
          </div>
 
          <div className="flex items-center gap-4">
             <div className="w-px h-10 bg-surface-container-high/50 mx-2" />
             <div className="flex items-center gap-2">
                <Select
                  value={initialStatus || 'ALL'}
                  onValueChange={handleStatusChange}
                >
                  <SelectTrigger className="w-[180px] bg-surface-container-high/50 border-none h-14 px-6 text-[11px] font-black uppercase tracking-widest rounded-2xl shadow-inner shadow-black/5 focus:ring-2 focus:ring-cyan-500/20">
                    <SelectValue placeholder={tc('status.all')} />
                  </SelectTrigger>
                  <SelectContent className="bg-surface-container-highest border border-outline-low shadow-2xl rounded-2xl overflow-hidden">
                    <SelectItem value="ALL" className="text-[10px] font-black uppercase tracking-widest">{tc('status.all')}</SelectItem>
                    <SelectItem value="DRAFT" className="text-[10px] font-black uppercase tracking-widest">{tc('status.draft')}</SelectItem>
                    <SelectItem value="APPROVED" className="text-[10px] font-black uppercase tracking-widest">{tc('status.approved')}</SelectItem>
                    <SelectItem value="POSTED" className="text-[10px] font-black uppercase tracking-widest">{tc('status.posted')}</SelectItem>
                    <SelectItem value="CANCELLED" className="text-[10px] font-black uppercase tracking-widest">{tc('status.rejected')}</SelectItem>
                  </SelectContent>
                </Select>
 
                <Button variant="outline" className="h-14 px-6 bg-surface-container-high/50 hover:bg-surface-container-high border-none rounded-2xl shadow-inner shadow-black/5">
                   <Filter className="w-4 h-4 text-muted-foreground/60/60" />
                </Button>
             </div>
          </div>
          
          <div className="flex items-center gap-1 bg-surface-container-high/50 p-1.5 rounded-2xl shadow-inner shadow-black/5 ms-auto">
             <Button size="icon" variant="ghost" className="w-11 h-11 rounded-xl text-cyan-500 bg-surface-container-low shadow-sm"><LayoutGrid className="w-4 h-4" /></Button>
             <Button size="icon" variant="ghost" className="w-11 h-11 rounded-xl text-muted-foreground/60/20"><ListIcon className="w-4 h-4" /></Button>
          </div>
        </div>
      </div>
 
      {/* Main Consumption Ledger */}
      <div className="bg-surface-container-low rounded-[2.5rem] border border-outline-low shadow-2xl shadow-black/5 overflow-hidden">
        <DataTable
          columns={columns}
          data={data?.data || []}
          isLoading={isLoading}
          onRowClick={(row: IssueSummary) => router.push(`/${locale}/issues/${row.id}`)}
          collectionName="operations_issues"
          emptyState={
            <EmptyState 
              title={t('no_records') || 'No Issues Found'}
              description={t('description') || 'Departmental stock consumption vouchers will appear here.'}
              action={
                <PermissionGate action="create" resource="issue">
                  <Button 
                    onClick={() => router.push(`/${locale}/issues/new`)}
                    className="bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-500 border border-cyan-500/20"
                  >
                    <Plus className="w-4 h-4 me-2" />
                    {t('create_new')}
                  </Button>
                </PermissionGate>
              }
            />
          }
          pagination={meta ? {
            page: meta.page,
            pageSize: meta.pageSize,
            total: meta.total,
            totalPages: meta.total_pages,
            onPageChange: handlePageChange
          } : undefined}
        />
      </div>
    </div>
  );
}
