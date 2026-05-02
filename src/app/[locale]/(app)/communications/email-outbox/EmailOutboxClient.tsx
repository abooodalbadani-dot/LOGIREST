'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { useEmailOutbox, type EmailOutboxRow } from '@/features/notifications/hooks/useEmailOutbox';
import { format } from 'date-fns';
import { PageHeader } from '@/components/shared/PageHeader';
import { Mail, RefreshCcw, Send, AlertCircle, Clock, CheckCircle2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ColumnDef } from '@tanstack/react-table';
import { LucideIcon } from 'lucide-react';
import { MetricCard } from '@/components/ui/metric-card';

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
 <span dir="ltr" className="font-bold text-label-sm">{row.original.recipient_email}</span>
 <span className="text-label-xs opacity-40 uppercase">Verified Recipient</span>
 </div>
 ),
 },
 {
 accessorKey: 'subject',
 header: tc('subject') || 'Subject',
 cell: ({ row }) => <span className="text-body-md font-medium line-clamp-1 opacity-80">{row.original.subject}</span>,
 },
 {
 accessorKey: 'status',
 header: tc('status_label'),
 cell: ({ row }) => {
 const config = statusConfig[row.original.status] || { color: 'text-muted-foreground', icon: Clock };
 const Icon = config.icon;
 return (
 <div className={`flex items-center gap-2 ${config.color}font-semibold text-label-xs uppercase`}>
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
 ? <span dir="ltr" className="text-label-xs opacity-40 font-mono italic">{format(new Date(row.original.sent_at), 'yyyy-MM-dd HH:mm')}</span>
 : <span className="opacity-20">—</span>,
 },
 {
 accessorKey: 'retry',
 header: '',
 cell: ({ row }) => row.original.status === 'FAILED'
 ? (
 <div className="flex justify-end">
 <button
 className="flex items-center gap-2 px-4 py-1.5 text-label-xxs font-semibold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-sm hover:bg-amber-500/20 transition-all"
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

 const totalSent = data?.meta?.total || 0;
 const delivered = data?.data?.filter(e => e.status === 'SENT').length || 0;
 const failed = data?.data?.filter(e => e.status === 'FAILED').length || 0;

 return (
 <div className="p-8 max-w-[1600px] mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
 <PageHeader 
 title="Email Outbox" 
 description="Communication audit trail and outgoing message pipeline"
 actions={
 <div className="flex items-center gap-4">
 <div className="flex flex-col items-end gap-1 px-4 border-e border-white/10">
 <span className="text-label-xs font-semibold text-muted-foreground/40 uppercase">Filter by Status</span>
 <Select value={statusFilter} onValueChange={(v) => { if (v) { setStatusFilter(v === 'all' ? '' : v); setPage(1); } }}>
 <SelectTrigger className="w-[180px] h-9 bg-surface-container-low border-white/5 text-label-xs font-bold uppercase">
 <SelectValue placeholder="All Statuses" />
 </SelectTrigger>
 <SelectContent className="bg-surface-container-low border-white/10">
 <SelectItem value="all" className="text-label-sm font-bold uppercase">All Statuses</SelectItem>
 <SelectItem value="PENDING" className="text-label-sm font-bold uppercase">Pending</SelectItem>
 <SelectItem value="SENT" className="text-label-sm font-bold uppercase text-emerald-400">Sent</SelectItem>
 <SelectItem value="FAILED" className="text-label-sm font-bold uppercase text-rose-400">Failed</SelectItem>
 </SelectContent>
 </Select>
 </div>
 </div>
 }
 />

 <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
 <MetricCard
 label={t('stats.total_sent')}
 value={totalSent}
 icon={Mail}
 color="cyan"
 />
 <MetricCard
 label={t('stats.delivered')}
 value={delivered}
 icon={CheckCircle2}
 color="emerald"
 />
 <MetricCard
 label={t('stats.failed')}
 value={failed}
 icon={AlertCircle}
 color="rose"
 />
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