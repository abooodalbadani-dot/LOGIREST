'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { 
 FileText, 
 ShoppingCart, 
 Truck, 
 TrendingUp,
 Clock,
 ShieldCheck,
 PlusCircle,
 BarChart3
} from 'lucide-react';
import { KPICard } from './KPICard';
import { formatNumber, formatCurrency } from '@/utils/currency';
import { Badge } from '@/components/ui/badge';
import { useLocale } from '@/hooks/useLocale';
import { Button } from '@/components/ui/button';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { useDashboardStats } from '../hooks/useDashboardStats';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { PageHeader } from '@/components/shared/PageHeader';

export function ProcurementDashboard() {
 const t = useTranslations('dashboard');
 const tp = useTranslations('procurement');
 const tc = useTranslations('common');
 const { locale } = useLocale();
 const { data: stats, isLoading, error } = useDashboardStats();

 if (isLoading) return <PageSkeleton />;
 if (error || !stats) return <div className="p-8 text-status-error uppercase font-bold">{t('error_loading')}</div>;

 return (
  <main role="main" className="space-y-10 animate-in fade-in duration-200">

   {/* Procurement Header - Enterprise Style */}
   <PageHeader
    title={t('procurement.strategic')}
    highlight={t('procurement.sourcing')}
    subtitle={
     <>
      <span className="text-label-xs font-semibold uppercase text-operational-cyan block mb-2 opacity-80">{t('procurement.supply_chain')}</span>
      <div className="flex items-center gap-3">
       <div className="h-[2px] w-12 bg-operational-cyan" />
       <p className="text-label-xs text-muted-foreground font-semibold uppercase">{t('procurement.central_procurement_unit')}</p>
      </div>
     </>
    }
   >
    <div className="flex gap-4">
     <PermissionGate action="create" resource="procurement_pr">
      <Link href="/purchase-requests/new" className="contents">
       <Button variant="outline" className="bg-card border border-border shadow-sm rounded-xl h-14 px-8 font-semibold uppercase text-label-xs hover:bg-operational-cyan hover:text-black transition-all">
        <PlusCircle className="w-4 h-4 me-2" />
        {t('procurement.new_request')}
       </Button>
      </Link>
     </PermissionGate>
     <PermissionGate action="create" resource="procurement_po">
      <Link href="/purchase-orders/new" className="contents">
       <Button className="bg-brand-gold hover:bg-brand-gold-hover text-white transition-colors font-semibold uppercase px-10 rounded-xl h-14 active:scale-95">
        {t('procurement.generate_po')}
       </Button>
      </Link>
     </PermissionGate>
    </div>
   </PageHeader>

   {/* KPI Grid */}
   <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" aria-labelledby="kpi-heading">
    <h2 id="kpi-heading" className="sr-only">{t('kpi.title')}</h2>
    <KPICard
     title={t('procurement.pending_prs')}
     value={formatNumber(stats.pendingPrs, locale as 'ar' | 'en')}
     icon={FileText}
     accent="cyan"
     description={t('procurement.awaiting_po')}
    />
    <KPICard
     title={t('procurement.active_pos')}
     value={formatNumber(stats.activePos, locale as 'ar' | 'en')}
     icon={ShoppingCart}
     accent="amber"
     description={t('procurement.issued_to_suppliers')}
    />
    <KPICard
     title={t('procurement.pending_grns')}
     value={formatNumber(stats.pendingGrns, locale as 'ar' | 'en')}
     icon={Truck}
     accent="cyan"
     description={t('procurement.inbound_logistics')}
    />
    <KPICard
     title={t('procurement.monthly_spend')}
     value={formatCurrency(stats.totalProcurementSpend, stats.currency, locale as 'ar' | 'en')}
     icon={TrendingUp}
     accent="cyan"
     description={t('procurement.approved_budget')}
     currency={stats.currency}
     symbol={stats.currencySymbol}
    />
   </section>

   <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
    {/* Procurement Pipeline */}
    <section className="lg:col-span-2 space-y-4" aria-labelledby="procurement-pipeline-title">
     <div className="bg-card border border-border shadow-sm rounded-2xl relative overflow-hidden group transition-all duration-200">
      <div className="absolute top-0 start-0 w-2 h-full bg-operational-cyan/20 group-hover:bg-operational-cyan transition-all duration-200" />
      <div className="p-4 md:p-8 pb-4">
       <div className="flex items-center justify-between mb-8">
        <div>
          <h3 id="procurement-pipeline-title" className="text-xl md:text-2xl font-bold text-foreground tracking-tight uppercase">{t('procurement.active_pipeline')}</h3>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mt-1">{t('procurement.real_time_tracking')}</p>
        </div>
        <div className="flex items-center gap-3">
         <Badge variant="outline" className="rounded-lg bg-surface-container-high/50 text-muted-foreground/60 border-none px-3 py-1 text-label-xxs uppercase">
          <Clock className="w-2.5 h-2.5 me-1.5" />
          {t('procurement.updated_now')}
         </Badge>
        </div>
       </div>
       <div className="divide-y divide-transparent">
        {stats.pendingApprovals.filter(doc => doc.type === 'PR').map((doc) => (
         <Link key={doc.id} href={`/purchase-requests/${doc.id}`} className="block">
          <div className="px-8 py-6 flex items-center justify-between hover:bg-surface-container-high/40 transition-all duration-140 ease-industrial group">
           <div className="flex items-center gap-8">
            <div className="flex flex-col items-center justify-center w-14 h-14 bg-card border border-border shadow-sm rounded-2xl font-mono text-label-sm font-semibold group-hover:bg-operational-cyan/10 transition-all duration-200">
             <span className="opacity-10 text-label-xxs mb-1">{tc('id')}</span>
             {doc.documentNumber.split('-')[1] || doc.documentNumber}
            </div>
            <div className="space-y-2">
             <div className="flex items-center gap-4">
              <span className="text-body-md font-semibold text-foreground uppercase">{doc.destination}</span>
              <Badge className={`rounded-lg text-label-xxs font-semibold uppercase px-2.5 py-1 border-none ${ doc.priority === 'high' ? 'bg-status-error text-white animate-pulse' : 'bg-surface-container-high text-muted-foreground/60' }`}>
               {tc(`priority.${doc.priority.toLowerCase()}`)}
              </Badge>
             </div>
             <p className="text-label-xs text-muted-foreground/30 font-semibold uppercase">
              {formatCurrency(doc.totalValue || 0, stats.currency, locale as 'ar' | 'en')} • {t('procurement.purchase_request')}
             </p>
            </div>
           </div>
           <div className="flex items-center gap-4">
            <PermissionGate action="approve" resource="procurement_pr">
             <div className="flex items-center justify-center rounded-2xl bg-card border border-border shadow-sm h-12 px-6 font-semibold uppercase text-label-xs hover:bg-operational-cyan hover:text-black transition-all">
              {tc('actions.review')}
             </div>
            </PermissionGate>
           </div>
          </div>
         </Link>
        ))}
       </div>
      </div>
     </div>
    </section>

    {/* Vendor & Performance Section */}
    <section className="space-y-8" aria-labelledby="vendor-performance-title">
     <h2 id="vendor-performance-title" className="sr-only">{t('procurement.vendor_analytics')}</h2>
     
     <div className="bg-card border border-border shadow-sm rounded-2xl relative group overflow-hidden transition-all duration-200">
      <div className="absolute bottom-0 start-0 w-full h-1 bg-operational-cyan scale-x-0 group-hover:scale-x-100 transition-transform duration-200 origin-left" />
      <div className="p-8 pb-4">
       <span className="text-label-xs font-semibold uppercase text-operational-cyan flex items-center gap-2 mb-4">
        <ShieldCheck className="w-3.5 h-3.5 fill-current" /> {t('procurement.trusted_suppliers')}
       </span>
        <h3 className="text-xl md:text-2xl font-bold text-foreground tracking-tight uppercase">{t('procurement.top_vendors')}</h3>
      </div>
      <div className="p-8 pt-2 space-y-6">
       {stats.topVendors.map((vendor, i) => (
        <div key={i} className="flex flex-col gap-2 border-s-2 border-surface-container-low ps-6 hover:border-operational-cyan transition-all duration-140 ease-industrial group/item">
         <div className="flex items-center justify-between">
          <span className="text-label-xs font-semibold text-foreground group-hover/item:text-operational-cyan transition-colors uppercase">{vendor.name}</span>
          <span className="text-label-xxs font-semibold px-3 py-1 rounded-lg bg-surface-container-high/40 text-muted-foreground uppercase">{vendor.status}</span>
         </div>
         <span className="text-label-xxs font-semibold text-muted-foreground/30 uppercase">{tc('monthly_spend')}: {formatCurrency(vendor.spend, stats.currency, locale as 'ar' | 'en')}</span>
        </div>
       ))}
       <PermissionGate action="view" resource="master_data_suppliers">
        <Link href="/master-data/suppliers" className="w-full">
         <Button className="w-full bg-muted hover:bg-operational-cyan hover:text-black border-none rounded-2xl text-label-xs font-semibold uppercase h-14 mt-6 transition-all hover:scale-[0.98] hover:brightness-110 active:scale-95">
          {t('procurement.manage_vendors')}
         </Button>
        </Link>
       </PermissionGate>
      </div>
     </div>

     <div className="bg-card border border-border shadow-sm rounded-2xl overflow-hidden group transition-all duration-200">
      <div className="p-8 pb-4">
       <span className="text-label-xs font-semibold uppercase text-muted-foreground/20 flex items-center gap-2 mb-4">
        <BarChart3 className="w-3.5 h-3.5" /> {t('procurement.efficiency')}
       </span>
        <h3 className="text-xl md:text-2xl font-bold text-foreground tracking-tight uppercase">{t('procurement.po_conversion_rate')}</h3>
      </div>
      <div className="h-44 flex flex-col items-center justify-center gap-6 bg-card border border-border shadow-sm/30 group-hover:bg-card border border-border shadow-sm/50 transition-all duration-140 ease-industrial">
       <div className="flex items-end gap-2 h-16">
        {stats.efficiencyMetrics.conversionChart.map((h, i) => (
         <div key={i} className="w-3 bg-operational-cyan/10 group-hover:bg-operational-cyan/40 transition-all duration-200 cursor-pointer rounded-full" style={{ height: `${h}%` }} />
        ))}
       </div>
       <span className="text-label-xxs font-semibold text-muted-foreground/20 uppercase">{t('procurement.avg_fulfillment_cycle', { days: stats.efficiencyMetrics.fulfillmentCycleDays })}</span>
      </div>
     </div>
    </section>
   </div>
  </main>
 );
}
