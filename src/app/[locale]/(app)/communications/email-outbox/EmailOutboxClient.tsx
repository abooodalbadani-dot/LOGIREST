'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { useEmailOutbox, type EmailOutboxRow } from '@/features/notifications/hooks/useEmailOutbox';
import { format } from 'date-fns';
import { PageHeader } from '@/components/shared/PageHeader';
import { Mail, RefreshCcw, Send, AlertCircle, Clock } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { ColumnDef } from '@tanstack/react-table';
import { LucideIcon } from 'lucide-react';

const statusConfig: Record<string, { color: string, icon: LucideIcon }> = {
  PENDING: { color: 'text-amber-400', icon: Clock },
  SENT: { color: 'text-emerald-400', icon: Send },
  FAILED: { color: 'text-rose-400', icon: AlertCircle },
};

export function EmailOutboxClient() {
  const t = useTranslations('notifications');
  const tc = useTranslations('common');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const { data, isLoading } = useEmailOutbox({ status: statusFilter || undefined, page });

  const columns: ColumnDef<EmailOutboxRow>[] = [
    {
      accessorKey: 'recipient_email',
      header: t('recipient'),
      cell: ({ row }) => (
        <div className="flex flex-col gap-0.5">
          <span dir="ltr" className="font-bold text-xs tracking-tight">{row.original.recipient_email}</span>
          <span className="text-[10px] opacity-40 uppercase tracking-tighter">Verified Recipient</span>
        </div>
      ),
    },
    {
      accessorKey: 'subject',
      header: tc('subject') || 'Subject',
      cell: ({ row }) => <span className="text-sm font-medium line-clamp-1 opacity-80">{row.original.subject}</span>,
    },
    {
      accessorKey: 'status',
      header: tc('status_label'),
      cell: ({ row }) => {
        const config = statusConfig[row.original.status] || { color: 'text-muted-foreground', icon: Clock };
        const Icon = config.icon;
        return (
          <div className={`flex items-center gap-2 ${config.color} font-black text-[10px] uppercase tracking-widest`}>
            <Icon className="w-3 h-3" />
            {row.original.status}
          </div>
        );
      },
    },
    {
      accessorKey: 'sent_at',
      header: t('sent_at'),
      cell: ({ row }) => row.original.sent_at
        ? <span dir="ltr" className="text-[11px] opacity-40 font-mono italic">{format(new Date(row.original.sent_at), 'yyyy-MM-dd HH:mm')}</span>
        : <span className="opacity-20">—</span>,
    },
    {
      accessorKey: 'retry',
      header: '',
      cell: ({ row }) => row.original.status === 'FAILED'
        ? (
          <div className="flex justify-end">
            <button
              className="flex items-center gap-2 px-4 py-1.5 text-[9px] font-black uppercase tracking-[0.15em] bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-sm hover:bg-amber-500/20 transition-all"
              onClick={(e: React.MouseEvent) => { e.stopPropagation(); }}
            >
              <RefreshCcw className="w-3 h-3" />
              {t('retry')}
            </button>
          </div>
        )
        : null,
    },
  ];

  const total = data?.meta?.total || 0;
  const sent = data?.data?.filter(e => e.status === 'SENT').length || 0;
  const failed = data?.data?.filter(e => e.status === 'FAILED').length || 0;

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <PageHeader 
        title="Email Outbox" 
        description="Communication audit trail and outgoing message pipeline"
        actions={
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end gap-1 px-4 border-r border-white/10">
              <span className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest">Filter by Status</span>
              <Select value={statusFilter} onValueChange={(v) => { if (v) { setStatusFilter(v === 'all' ? '' : v); setPage(1); } }}>
                <SelectTrigger className="w-[180px] h-9 bg-surface-container-low border-white/5 text-[11px] font-bold uppercase tracking-wider">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent className="bg-surface-container-low border-white/10">
                  <SelectItem value="all" className="text-xs font-bold uppercase tracking-wider">All Statuses</SelectItem>
                  <SelectItem value="PENDING" className="text-xs font-bold uppercase tracking-wider">Pending</SelectItem>
                  <SelectItem value="SENT" className="text-xs font-bold uppercase tracking-wider text-emerald-400">Sent</SelectItem>
                  <SelectItem value="FAILED" className="text-xs font-bold uppercase tracking-wider text-rose-400">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-surface-container-low border-none rounded-sm overflow-hidden relative group transition-all hover:bg-surface-container-medium">
          <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
            <Mail className="w-24 h-24 text-white" />
          </div>
          <CardHeader className="pb-2 relative z-10">
            <CardDescription className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Total Volume</CardDescription>
            <CardTitle className="text-4xl font-display font-bold tracking-tight text-foreground">{total}</CardTitle>
          </CardHeader>
          <div className="absolute bottom-0 left-0 h-0.5 w-full bg-gradient-to-r from-white/20 to-transparent" />
        </Card>

        <Card className="bg-surface-container-low border-none rounded-sm overflow-hidden relative group transition-all hover:bg-surface-container-medium">
          <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
            <Send className="w-24 h-24 text-emerald-400" />
          </div>
          <CardHeader className="pb-2 relative z-10">
            <CardDescription className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Delivered</CardDescription>
            <CardTitle className="text-4xl font-display font-bold tracking-tight text-emerald-400">{sent}</CardTitle>
          </CardHeader>
          <div className="absolute bottom-0 left-0 h-0.5 w-full bg-gradient-to-r from-emerald-500/50 to-transparent" />
        </Card>

        <Card className="bg-surface-container-low border-none rounded-sm overflow-hidden relative group transition-all hover:bg-surface-container-medium">
          <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
            <AlertCircle className="w-24 h-24 text-rose-400" />
          </div>
          <CardHeader className="pb-2 relative z-10">
            <CardDescription className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Failures</CardDescription>
            <CardTitle className="text-4xl font-display font-bold tracking-tight text-rose-400">{failed}</CardTitle>
          </CardHeader>
          <div className="absolute bottom-0 left-0 h-0.5 w-full bg-gradient-to-r from-rose-500/50 to-transparent" />
        </Card>
      </div>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        isLoading={isLoading}
        collectionName="communications_email_outbox"
        pagination={data?.meta ? {
          page,
          pageSize: 10,
          total: data.meta.total,
          totalPages: data.meta.total_pages,
          onPageChange: setPage
        } : undefined}
      />
    </div>
  );
}