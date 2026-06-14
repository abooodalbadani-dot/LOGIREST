'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { 
  Building2, 
  TrendingUp, 
  ShoppingCart, 
  Clock, 
  ShieldAlert,
  ArrowLeft,
  Mail,
  Phone,
  Globe,
  DollarSign,
  PieChart,
  BarChart3,
  Calendar,
  FileText,
  CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { useSuppliers } from '@/features/suppliers/hooks/useSuppliers';
import { PageHeader } from '@/components/shared/PageHeader';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { MetricCard } from '@/components/ui/metric-card';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { cn } from '@/lib/utils';

interface RecentOrder {
  id: string;
  date: string;
  amount: number;
  status: string;
  items: number;
}

export function SupplierProfileClient({ locale, id }: { locale: string, id: string }) {
  const tc = useTranslations('common');
  const t = useTranslations('master_data.suppliers');
  const router = useRouter();

  const { data: suppliersData, isLoading: isLoadingSupplier } = useSuppliers();
  const supplier = useMemo(() => 
    suppliersData?.data?.find(s => s.id === id), 
  [suppliersData, id]);

  const recentOrders = useMemo<RecentOrder[]>(() => [
    { id: 'PO-001', date: '2026-05-10', amount: 12500, status: 'RECEIVED', items: 12 },
    { id: 'PO-002', date: '2026-05-08', amount: 8400, status: 'PENDING', items: 5 },
    { id: 'PO-003', date: '2026-05-05', amount: 15000, status: 'RECEIVED', items: 20 },
  ], []);

  const columns = useMemo<ColumnDef<RecentOrder, unknown>[]>(() => [
    { 
      accessorKey: 'id', 
      header: tc('doc_number'),
      cell: ({ row }) => <span className="font-mono text-label-xs font-bold text-cyan-500">{row.original.id}</span>
    },
    { 
      accessorKey: 'date', 
      header: tc('created_at'),
      cell: ({ row }) => <span className="text-label-xs font-medium opacity-60 uppercase">{row.original.date}</span>
    },
    { 
      accessorKey: 'items', 
      header: tc('items'),
      cell: ({ row }) => <span className="text-label-xs font-bold">{row.original.items}</span>
    },
    { 
      accessorKey: 'amount', 
      header: tc('amount'),
      cell: ({ row }) => (
        <span className="text-label-xs font-bold text-emerald-500 font-mono">
          {row.original.amount.toLocaleString()} {tc('currencies.sar')}
        </span>
      )
    },
    { 
      accessorKey: 'status', 
      header: tc('status'),
      cell: ({ row }) => <StatusBadge status={row.original.status} className="h-5" />
    }
  ], [tc]);

  if (isLoadingSupplier) {
    return <div className="p-8 animate-pulse text-center opacity-20">{tc('loading')}</div>;
  }

  if (!supplier) {
    return (
      <div className="p-8 max-w-[1600px] mx-auto">
        <PageHeader title={t('empty.title')} description={t('empty.description')} />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <div className="space-y-4">
        <Breadcrumb 
          items={[
            { label: tc('home'), href: `/dashboard` },
            { label: tc('master_data'), href: `/master-data` },
            { label: t('title'), href: `/master-data/suppliers` },
            { label: supplier.name }
          ]} 
        />
        <PageHeader 
          title={supplier.name} 
          description={t('profile.title')}
          actions={
            <Button 
              variant="outline" 
              className="h-11 px-6 border-white/5 bg-surface-container-low hover:bg-surface-container-medium text-label-xs font-semibold uppercase rounded-sm"
              onClick={() => router.push(`/master-data/suppliers/${id}/edit`)}
            >
              <ArrowLeft className="w-3.5 h-3.5 me-2" />
              {tc('edit')}
            </Button>
          }
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <MetricCard
          label={t('profile.metrics.total_spend')}
          value="452,000"
          icon={TrendingUp}
          color="emerald"
          dir="ltr"
        />
        <MetricCard
          label={t('profile.metrics.active_pos')}
          value="4"
          icon={ShoppingCart}
          color="cyan"
          dir="ltr"
        />
        <MetricCard
          label={t('profile.metrics.lead_time')}
          value="2.4 Days"
          icon={Clock}
          color="amber"
          dir="ltr"
        />
        <MetricCard
          label={t('profile.metrics.defect_rate')}
          value="0.2%"
          icon={ShieldAlert}
          color="rose"
          dir="ltr"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Section: Info & Financials */}
        <div className="lg:col-span-4 space-y-8">
          {/* Identity & Contact */}
          <div className="bg-surface-container-low border border-white/5 rounded-sm p-8 space-y-8 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-sm bg-primary/10 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-label-sm font-bold uppercase tracking-wider">{t('partner_identity')}</h3>
                <p className="text-label-xs text-muted-foreground/60 font-semibold uppercase">{supplier.code}</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center gap-4 group">
                <div className="w-8 h-8 rounded-sm bg-white/5 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                  <Mail className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                </div>
                <span className="text-label-xs font-bold text-muted-foreground group-hover:text-white transition-colors">{supplier.contactEmail || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-4 group">
                <div className="w-8 h-8 rounded-sm bg-white/5 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                  <Phone className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                </div>
                <span className="text-label-xs font-bold text-muted-foreground group-hover:text-white transition-colors" dir="ltr">{supplier.contactPhone || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-4 group">
                <div className="w-8 h-8 rounded-sm bg-white/5 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                  <Globe className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                </div>
                <span className="text-label-xs font-bold text-muted-foreground group-hover:text-white transition-colors">Logistics.com</span>
              </div>
            </div>

            <div className="pt-4 border-t border-white/5 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest">{t('contact_person')}</span>
                <span className="text-label-xs font-bold text-muted-foreground/80">{supplier.contactName || '---'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest">{t('payment_terms')}</span>
                <span className="text-label-xs font-bold text-amber-500/80 uppercase">{supplier.paymentTerms || 'Net 30'}</span>
              </div>
            </div>
          </div>

          {/* Financial Charts Placeholder */}
          <div className="bg-surface-container-low border border-white/5 rounded-sm p-8 space-y-6 shadow-xl relative overflow-hidden group">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-sm bg-emerald-500/10 flex items-center justify-center">
                <PieChart className="w-4 h-4 text-emerald-500" />
              </div>
              <h3 className="text-label-xs font-bold uppercase tracking-wider">{t('profile.financials')}</h3>
            </div>
            
            <div className="h-48 flex items-end gap-2 px-2">
              {[40, 70, 45, 90, 65, 80, 50].map((h, i) => (
                <div key={i} className="flex-1 bg-emerald-500/10 rounded-t-sm relative group-hover:bg-emerald-500/20 transition-all cursor-pointer" style={{ height: `${h}%` }}>
                  <div className="absolute inset-0 bg-emerald-500/0 group-hover:bg-emerald-500/10" />
                </div>
              ))}
            </div>
            <div className="flex justify-between text-[8px] font-bold text-muted-foreground/30 uppercase tracking-tighter px-1">
              <span>JAN</span><span>FEB</span><span>MAR</span><span>APR</span><span>MAY</span><span>JUN</span><span>JUL</span>
            </div>
          </div>
        </div>

        {/* Right Section: Activity & Performance */}
        <div className="lg:col-span-8 space-y-8">
          {/* Performance Heatmap simulated */}
          <div className="bg-surface-container-low border border-white/5 rounded-sm p-8 space-y-6 shadow-xl">
             <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-sm bg-cyan-500/10 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-cyan-500" />
                </div>
                <h3 className="text-label-xs font-bold uppercase tracking-wider">{t('profile.performance')}</h3>
              </div>
              <StatusBadge status="ACTIVE" className="h-5" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <div className="p-4 bg-black/20 rounded-sm border border-white/5 space-y-2">
                  <p className="text-[10px] font-bold text-muted-foreground/40 uppercase">{t('profile.trends')}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-mono font-bold text-rose-500">+4.2%</span>
                    <TrendingUp className="w-4 h-4 text-rose-500 rotate-45" />
                  </div>
                  <p className="text-[10px] font-semibold text-muted-foreground/30 uppercase">{t('profile.market_avg_relative')}</p>
               </div>
               <div className="p-4 bg-black/20 rounded-sm border border-white/5 space-y-2">
                  <p className="text-[10px] font-bold text-muted-foreground/40 uppercase">{t('profile.reliability_index')}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-mono font-bold text-emerald-500">98/100</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  </div>
                  <p className="text-[10px] font-semibold text-muted-foreground/30 uppercase">{t('profile.reliability_index_desc')}</p>
               </div>
               <div className="p-4 bg-black/20 rounded-sm border border-white/5 space-y-2">
                  <p className="text-[10px] font-bold text-muted-foreground/40 uppercase">{t('profile.credit_rating')}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-mono font-bold text-cyan-500">{t('profile.credit_rating_tier')}</span>
                    <Building2 className="w-4 h-4 text-cyan-500" />
                  </div>
                  <p className="text-[10px] font-semibold text-muted-foreground/30 uppercase">{t('profile.partner_status')}</p>
               </div>
            </div>
          </div>

          {/* Activity Table */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-muted-foreground/40" />
                <h3 className="text-label-xs font-bold uppercase tracking-widest text-muted-foreground/60">{t('profile.orders')}</h3>
              </div>
              <Button variant="ghost" size="sm" className="h-7 text-[10px] font-bold uppercase text-primary hover:bg-primary/10">
                {tc('view_all')}
              </Button>
            </div>
            <DataTable 
              columns={columns} 
              data={recentOrders} 
              isLoading={false}
              collectionName="supplier_profile_activity"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function Activity({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}
