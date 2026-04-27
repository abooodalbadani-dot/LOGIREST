'use client';

import { useTranslations } from 'next-intl';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useIssueList, IssueSummary } from '@/features/operations/hooks/useIssueList';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FileText, ClipboardCheck, AlertCircle, Plus, Filter } from 'lucide-react';
import Link from 'next/link';
import { PageHeader } from '@/components/shared/PageHeader';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Breadcrumb } from '@/components/shared/Breadcrumb';

export function IssueListClient({ initialStatus, initialPage, locale }: { initialStatus?: string; initialPage: number; locale: 'ar' | 'en' }) {
  const t = useTranslations('operations.issue');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tc = useTranslations('common');

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

  const columns: ColumnDef<IssueSummary>[] = [
    {
      accessorKey: 'status',
      header: tc('status_label') || 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: 'document_number',
      header: t('doc_number'),
      cell: ({ row }) => <span dir="ltr" className="font-mono text-cyan-500/90 font-bold tracking-wider">{row.original.document_number}</span>,
    },
    {
      accessorKey: 'destination_department_id',
      header: t('destination'),
      cell: ({ row }) => (
        <span className="opacity-80 font-medium">{row.original.destination_department_id || '—'}</span>
      ),
    },
    {
      accessorKey: 'created_at',
      header: tc('created_at'),
      cell: ({ row }) => (
        <span dir="ltr" className="text-xs font-mono opacity-50 tabular-nums">
          {format(new Date(row.original.created_at), 'MMM dd, yyyy')}
        </span>
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
              router.push(`/${locale}/issues/${row.original.id}`);
            }}
          >
            {tc('view') || 'Inspect'}
          </Button>
        </div>
      ),
    },
  ];

  const meta = data?.meta?.pagination;

  const activeIssues = data?.meta?.pagination?.total || 0;
  const draftCount = data?.data?.filter(i => i.status === 'DRAFT').length || 0;
  const postedCount = data?.data?.filter(i => i.status === 'POSTED').length || 0;

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <Breadcrumb 
        items={[
          { label: tc('operations'), href: `/${locale}/issues` },
          { label: t('title'), href: `/${locale}/issues` }
        ]} 
      />
      <PageHeader
        title={t('title')}
        description={t('description') || 'Internal stock consumption and department issues'}
        actions={
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-end gap-1 border-r border-white/5 pr-6 hidden md:flex">
              <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse shadow-[0_0_8px_rgba(0,229,255,0.8)]" />
                {t('live_updates')}
              </div>
              <div dir="ltr" className="text-[9px] font-bold text-muted-foreground/40">
                {t('last_sync')}: {new Date().toLocaleTimeString()}
              </div>
            </div>
            <Link href={`/${locale}/issues/new`}>
              <Button className="h-11 px-8 bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] font-black uppercase tracking-[0.15em] rounded-xl transition-all shadow-lg shadow-cyan-900/20 shadow-[0_0_15px_rgba(8,145,178,0.4)]">
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
            <FileText className="w-24 h-24 text-white" />
          </div>
          <CardHeader className="pb-3 relative z-10">
            <CardDescription className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">{t('total_issues')}</CardDescription>
            <CardTitle className="text-4xl font-display font-bold tracking-tight text-foreground" dir="ltr">{activeIssues}</CardTitle>
          </CardHeader>
        </Card>

        <Card className="bg-surface-container-low border-none rounded-2xl overflow-hidden relative group transition-all hover:bg-surface-container-medium border-l-4 border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.05)]">
          <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
            <AlertCircle className="w-24 h-24 text-amber-400" />
          </div>
          <CardHeader className="pb-3 relative z-10">
            <CardDescription className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">{t('drafts')}</CardDescription>
            <CardTitle className="text-4xl font-display font-bold tracking-tight text-amber-400" dir="ltr">{draftCount}</CardTitle>
          </CardHeader>
        </Card>

        <Card className="bg-surface-container-low border-none rounded-2xl overflow-hidden relative group transition-all hover:bg-surface-container-medium border-l-4 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.05)]">
          <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
            <ClipboardCheck className="w-24 h-24 text-emerald-400" />
          </div>
          <CardHeader className="pb-3 relative z-10">
            <CardDescription className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">{t('posted')}</CardDescription>
            <CardTitle className="text-4xl font-display font-bold tracking-tight text-emerald-400" dir="ltr">{postedCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <DataTable
        columns={columns}
        data={data?.data || []}
        isLoading={isLoading}
        onRowClick={(row: IssueSummary) => router.push(`/${locale}/issues/${row.id}`)}
        collectionName="operations_issues"
        pagination={meta ? {
          page: meta.page,
          pageSize: meta.pageSize,
          total: meta.total,
          totalPages: meta.total_pages,
          onPageChange: handlePageChange
        } : undefined}
        filters={
          <div className="flex flex-wrap items-end gap-6 w-full py-6 px-8 bg-surface-container-low rounded-2xl border border-white/5">
            <div className="flex flex-col gap-2 min-w-[240px] flex-1">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">{tc('status_filtering')}</label>
              <Select
                value={initialStatus || 'ALL'}
                onValueChange={handleStatusChange}
              >
                <SelectTrigger className="w-full bg-surface-container-highest/30 border-none h-11 px-4 text-xs font-bold rounded-xl">
                  <SelectValue placeholder={tc('status.all')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">{tc('status.all')}</SelectItem>
                  <SelectItem value="DRAFT">{tc('status.draft')}</SelectItem>
                  <SelectItem value="APPROVED">{tc('status.approved')}</SelectItem>
                  <SelectItem value="POSTED">{tc('status.posted')}</SelectItem>
                  <SelectItem value="CANCELLED">{tc('status.rejected')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2 min-w-[300px] flex-[2]">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">{tc('search')}</label>
              <div className="relative">
                <Input
                  placeholder={t('search_placeholder') || 'Search by Document Number...'}
                  className="w-full bg-surface-container-highest/30 border-none h-11 px-10 text-xs font-bold rounded-xl"
                />
                <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </div>
            </div>

            <Button className="h-11 px-8 bg-surface-container-highest/50 hover:bg-surface-container-highest text-foreground text-[10px] font-black uppercase tracking-[0.15em] rounded-xl transition-all border border-white/5">
              <Filter className="w-3.5 h-3.5 mr-2" />
              {tc('filters_button')}
            </Button>
          </div>
        }
      />
    </div>
  );
}
