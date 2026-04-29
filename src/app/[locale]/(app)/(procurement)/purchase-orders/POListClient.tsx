'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { usePOList, POSummary } from '@/features/purchasing/hooks/usePOList';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { Button } from '@/components/ui/button';
import { 
  Plus, 
  Search, 
  Calendar, 
  Scan, 
  Printer, 
  Edit, 
  MoreHorizontal,
  Users,
  Wallet,
  FileText
} from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/shared/PageHeader';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { MetricCard } from '@/components/ui/metric-card';
import { EmptyState } from '@/components/shared/EmptyState';

export function POListClient({ locale }: { locale: 'ar' | 'en' }) {
  const t = useTranslations('operational.po');
  const tc = useTranslations('common');
  const router = useRouter();
  const currentLocale = useLocale();

  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string>('');

  const { data, isLoading } = usePOList({ status, page });

  const columns = useMemo<ColumnDef<POSummary, unknown>[]>(() => [
    {
      accessorKey: 'document_number',
      header: t('table.order_no'),
      cell: ({ row }) => (
        <span className="font-mono text-[11px] font-black text-foreground uppercase tracking-tight">
          {row.original.document_number}
        </span>
      ),
    },
    {
      accessorKey: 'supplier_id',
      header: tc('supplier'),
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-surface-container-highest flex items-center justify-center text-[10px] font-black text-cyan-500 uppercase">
             {row.original.supplier_id.substring(0, 2)}
          </div>
          <span className="font-black text-xs text-foreground tracking-tight group-hover:text-cyan-400 transition-colors">
            {row.original.supplier_id}
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'created_at',
      header: t('table.date'),
      cell: ({ row }) => (
        <span dir="ltr" className="text-[11px] font-bold text-muted-foreground/60/60">
          {row.original.created_at ? format(new Date(row.original.created_at), 'dd MMM yyyy') : '—'}
        </span>
      ),
    },
    {
      accessorKey: 'total',
      header: t('table.total'),
      cell: ({ row }) => (
        <span dir="ltr" className="font-mono text-xs font-black text-foreground">
          {row.original.total?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      accessorKey: 'currency_id',
      header: t('table.currency'),
      cell: ({ row }) => (
        <span className="text-[10px] font-black text-muted-foreground/60/60 uppercase tracking-widest">
           {row.original.currency_id}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: tc('status_label'),
      cell: ({ row }) => {
        const status = row.original.status;
        const statusMap: Record<string, { label: string, color: string }> = {
          'POSTED': { label: t('status.completed'), color: 'bg-emerald-500/10 text-emerald-500' },
          'APPROVED': { label: t('status.partial'), color: 'bg-cyan-500/10 text-cyan-500' },
          'SUBMITTED': { label: t('status.sent'), color: 'bg-sky-500/10 text-sky-500' },
          'DRAFT': { label: t('status.draft'), color: 'bg-on-surface/5 text-muted-foreground/60/60' },
        };
        const config = statusMap[status] || { label: status, color: 'bg-on-surface/5 text-muted-foreground/60/40' };
        return (
          <Badge className={`${config.color} border-none shadow-none text-[9px] font-black uppercase tracking-wider px-3 h-6 rounded-full`}>
            {config.label}
          </Badge>
        );
      },
    },
    {
      id: 'actions',
      header: '',
      cell: () => (
        <div className="flex justify-end">
          <PermissionGate action="view" resource="po">
            <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg hover:bg-surface-container-highest transition-all">
                <MoreHorizontal className="w-4 h-4 text-muted-foreground/60/40" />
            </Button>
          </PermissionGate>
        </div>
      ),
    },
  ], [t, tc, router]);

  const breadcrumbs = [
    { label: tc('sidebar.dashboard'), href: `/${locale}/dashboard` },
    { label: t('title'), href: `/${locale}/purchase-orders` },
  ];

  return (
    <div className="min-h-screen bg-surface-container-lowest text-foreground">
      <div className="p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
        
        <div className="space-y-4">
          <Breadcrumb items={breadcrumbs} />
          <PageHeader 
            title={t('title')} 
            description={t('subtitle')}
            actions={
              <PermissionGate action="create" resource="po">
                <Link href={`/${currentLocale}/purchase-orders/new`}>
                  <Button className="h-14 px-10 bg-cyan-600 hover:bg-cyan-500 text-white rounded-sm gap-3 shadow-xl shadow-cyan-900/20 transition-all active:scale-95">
                    <Plus className="w-5 h-5" />
                    <span className="text-xs font-black uppercase tracking-[0.2em]">{t('create_new')}</span>
                  </Button>
                </Link>
              </PermissionGate>
            }
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <MetricCard
            label={t('active_orders')}
            value="18"
            icon={FileText}
            color="cyan"
          />
          <MetricCard
            label={t('monthly_expenditure')}
            value="84,200"
            trend={tc('currencies.sar_full')}
            icon={Wallet}
            color="emerald"
          />
          <MetricCard
            label={t('active_vendors')}
            value="12"
            icon={Users}
            color="amber"
          />
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center gap-6 bg-surface-container-low/30 p-6 rounded-sm border border-surface-variant/10 shadow-inner">
           <div className="flex flex-col gap-2">
              <span className="text-[9px] font-black text-muted-foreground/60/40 uppercase tracking-widest ps-1">{t('filter_status')}</span>
              <Select value={status || 'ALL'} onValueChange={(val) => setStatus(val === 'ALL' ? '' : (val ?? ''))}>
                <SelectTrigger className="w-48 bg-surface-container-low border-surface-variant/10 rounded-sm h-12 text-[11px] font-black uppercase tracking-tight px-6">
                  <SelectValue placeholder={tc('status.all')} />
                </SelectTrigger>
                <SelectContent className="bg-surface-container-low border-surface-variant/10">
                   <SelectItem value="ALL" className="text-[10px] font-black uppercase">{tc('status.all')}</SelectItem>
                   <SelectItem value="DRAFT" className="text-[10px] font-black uppercase">{t('status.draft')}</SelectItem>
                   <SelectItem value="SUBMITTED" className="text-[10px] font-black uppercase">{t('status.sent')}</SelectItem>
                   <SelectItem value="POSTED" className="text-[10px] font-black uppercase">{t('status.completed')}</SelectItem>
                </SelectContent>
              </Select>
           </div>

           <div className="flex flex-col gap-2">
              <span className="text-[9px] font-black text-muted-foreground/60/40 uppercase tracking-widest ps-1">{t('filter_supplier')}</span>
              <Select value="all">
                <SelectTrigger className="w-64 bg-surface-container-low border-surface-variant/10 rounded-sm h-12 text-[11px] font-black uppercase tracking-tight px-6">
                  <SelectValue placeholder={t('all_suppliers')} />
                </SelectTrigger>
                <SelectContent className="bg-surface-container-low border-surface-variant/10">
                   <SelectItem value="all">{t('all_suppliers')}</SelectItem>
                </SelectContent>
              </Select>
           </div>

           <div className="flex flex-col gap-2">
              <span className="text-[9px] font-black text-muted-foreground/60/40 uppercase tracking-widest ps-1">{t('filter_date')}</span>
              <Button variant="outline" className="w-48 bg-surface-container-low border-surface-variant/10 rounded-sm h-12 text-[11px] font-black uppercase tracking-tight px-6 gap-3 justify-start text-muted-foreground/60/60">
                 <Calendar className="w-4 h-4 text-cyan-500" />
                 {t('select_date')}
              </Button>
           </div>
           
           <div className="flex-1" />

           <Button 
             variant="ghost" 
             onClick={() => { setStatus(''); setPage(1); }}
             className="h-12 px-6 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 hover:bg-surface-container-low rounded-sm"
           >
              {t('clear_filters')}
           </Button>
        </div>

        {/* Data Table */}
        <div className="bg-surface-container-low/20 rounded-sm border border-surface-variant/10 overflow-hidden shadow-2xl">
          <DataTable 
            columns={columns}
            data={data?.data || []}
            isLoading={isLoading}
            onRowClick={(row: POSummary) => router.push(`/${locale}/purchase-orders/${row.id}`)}
            collectionName="procurement_logistics_pipeline"
            emptyState={
              <EmptyState 
                title={t('no_orders_title') || 'No Purchase Orders'}
                description={t('no_orders_desc') || 'Start by creating your first purchase order to manage procurement.'}
                action={
                  <PermissionGate action="create" resource="po">
                    <Link href={`/${currentLocale}/purchase-orders/new`}>
                      <Button className="h-10 px-6 bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] font-black uppercase tracking-widest rounded-sm transition-all shadow-lg">
                        <Plus className="w-3.5 h-3.5 me-2" />
                        {t('create_new')}
                      </Button>
                    </Link>
                  </PermissionGate>
                }
              />
            }
            pagination={data?.meta ? {
              page: page,
              pageSize: 10,
              total: data.meta.total,
              totalPages: data.meta.total_pages,
              onPageChange: setPage
            } : undefined}
          />
        </div>

        {/* Floating Quick Actions Bar */}
        <div className="fixed bottom-12 start-1/2 -translate-x-1/2 z-50">
           <div className="flex items-center gap-8 bg-surface-container-highest/95 backdrop-blur-2xl border border-cyan-500/20 px-10 h-16 rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.5),0_0_20px_rgba(6,182,212,0.1)] transition-all hover:scale-[1.02] group">
              <div className="flex items-center gap-6">
                 <button 
                   onClick={() => window.location.href = `/${currentLocale}/inventory/scan`}
                   className="flex items-center gap-3 text-[11px] font-black uppercase tracking-widest text-foreground hover:text-cyan-500 transition-colors"
                 >
                    <Scan className="w-4 h-4 text-cyan-500" />
                    {tc('barcode_scanner') || 'Barcode Scanner'}
                 </button>
                 <div className="w-px h-6 bg-surface-variant/10" />
                 <button 
                   onClick={() => window.print()}
                   className="flex items-center gap-3 text-[11px] font-black uppercase tracking-widest text-foreground hover:text-cyan-500 transition-colors"
                 >
                    <Printer className="w-4 h-4 text-cyan-500/60" />
                    {tc('export_excel') || 'Export'}
                 </button>
                 <div className="w-px h-6 bg-surface-variant/10" />
                 <PermissionGate action="update" resource="po">
                   <button 
                     className="flex items-center gap-3 text-[11px] font-black uppercase tracking-widest text-foreground hover:text-cyan-500 transition-colors"
                   >
                      <Edit className="w-4 h-4 text-cyan-500/60" />
                      {t('bulk_edit')}
                   </button>
                 </PermissionGate>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
