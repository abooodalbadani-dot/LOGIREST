'use client';

import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import { 
 Truck, 
 AlertCircle, 
 BarChart3, 
 ArrowRightLeft, 
 Zap, 
 Layers,
 Warehouse
} from 'lucide-react';
import { KPICard } from './KPICard';
import { formatNumber, formatCurrency } from '@/utils/currency';
import { Badge } from '@/components/ui/badge';
import { useLocale } from '@/hooks/useLocale';
import { Button } from '@/components/ui/button';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { useAuth } from '@/providers/AuthProvider';
import { canViewFinancialData } from '@/utils/roleUtils';

import { useDashboardStats } from '../hooks/useDashboardStats';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { EmptyScopeState } from '@/components/ui/EmptyScopeState';

export function StoreManagerDashboard() {
 const t = useTranslations('dashboard');
 const tc = useTranslations('common');
 const { locale } = useLocale();
 const { user, activeScope } = useAuth();
 const router = useRouter();
 const { data: stats, isLoading, error } = useDashboardStats();

 if (!activeScope?.warehouseId) {
  return (
   <div className="flex-1 w-full min-w-0 flex flex-col items-center justify-center">
    <EmptyScopeState context="warehouse" />
   </div>
  );
 }

 if (isLoading) {
  return <PageSkeleton />;
 }

 if (error || !stats) {
  return <div className="p-8 text-status-error uppercase font-bold">{t('error_loading')}</div>;
 }

 return (
  <main role="main" className="space-y-10 animate-in fade-in duration-200">

   {/* Store Manager Header - Industrial/Brutalist Style */}
   <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8 w-full border-b border-border/50 pb-6">
    <div className="space-y-2">
     <span className="text-label-xs font-semibold uppercase text-status-success block mb-2 opacity-80">{t('store.logistics')}</span>
     <h1 className="text-3xl md:text-4xl font-extrabold text-foreground tracking-tight">
      {locale === 'ar' ? (
       <>{t('store.control')} <span className="text-brand-gold">{t('store.operational')}</span></>
      ) : (
       <>{t('store.operational')} <span className="text-brand-gold">{t('store.control')}</span></>
      )}
     </h1>
     <div className="flex items-center gap-3">
      <div className="h-[2px] w-12 bg-status-success" />
      <p className="text-sm font-bold text-muted-foreground tracking-widest mt-2">{t('store.central_warehouse')}</p>
     </div>
    </div>
    <div className="flex gap-4">
     <PermissionGate action="view" resource="operations_stocktake">
      <Link href="/stocktake" className="contents">
       <Button variant="outline" className="bg-card border border-border shadow-sm rounded-xl h-14 px-8 font-semibold uppercase text-label-xs hover:bg-status-success hover:text-black transition-all">
        {t('store.inventory_audit')}
       </Button>
      </Link>
     </PermissionGate>
     <PermissionGate action="create" resource="operations_issues">
      <Link href="/issues/new" className="contents">
       <Button className="bg-brand-gold hover:bg-brand-gold-hover text-white transition-colors font-semibold uppercase px-10 rounded-xl h-14 active:scale-95">
        {t('store.batch_issue')}
       </Button>
      </Link>
     </PermissionGate>
    </div>
   </header>
 
   {/* KPI Grid */}
   <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" aria-labelledby="kpi-heading">
    <h2 id="kpi-heading" className="sr-only">{t('kpi.title')}</h2>
    <KPICard
     title={t('store.fulfillment_queue')}
     value={formatNumber(stats.pendingFulfillment, locale as 'ar' | 'en')}
     icon={Truck}
     accent="cyan"
     description={t('store.pending_issues')}
    />
    <KPICard
     title={t('store.stock_shortages')}
     value={formatNumber(stats.shortages, locale as 'ar' | 'en')}
     icon={AlertCircle}
     accent="red"
     description={t('store.awaiting_procurement')}
    />
    <KPICard
     title={t('store.warehouse_load')}
     value={`${stats.warehouseCapacity}%`}
     icon={Warehouse}
     accent="amber"
     description={t('store.capacity_usage')}
    />
    {user?.role && canViewFinancialData(user.role) && (
     <KPICard
      title={t('store.asset_value')}
      value={formatCurrency(stats.totalValue, stats.currency, locale as 'ar' | 'en')}
      icon={Layers}
      accent="cyan"
      description={t('store.stock_valuation')}
      currency={stats.currency}
      symbol={stats.currencySymbol}
     />
    )}
   </section>

   <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
    {/* Fulfillment Queue */}
    <section className="lg:col-span-2 space-y-4" aria-labelledby="fulfillment-queue-title">
     <div className="bg-card border border-border shadow-sm rounded-2xl relative overflow-hidden group transition-all duration-200">
      <div className="absolute top-0 start-0 w-2 h-full bg-status-success/20 group-hover:bg-status-success transition-all duration-200" />
      <div className="p-8 pb-4">
       <div className="flex items-center justify-between mb-8">
        <div>
         <h3 id="fulfillment-queue-title" className="text-xl md:text-2xl font-bold text-foreground tracking-tight uppercase">{t('store.fulfillment_queue')}</h3>
         <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mt-1">{t('store.fefo_guided')}</p>
        </div>
        <div className="flex items-center gap-3">
         <div className="flex -space-x-2.5">
          {[1,2,3].map(i => <div key={i} className="w-9 h-9 rounded-full border-none bg-muted" />)}
         </div>
         <span className="text-label-xs font-semibold text-muted-foreground/40 uppercase">{t('store.more_items', { count: 4 })}</span>
        </div>
       </div>
       <div className="divide-y divide-transparent">
        {stats.fulfillmentQueue.map((job) => (
         <div key={job.id} className="px-8 py-6 flex items-center justify-between hover:bg-surface-container-high/40 transition-all duration-140 ease-industrial cursor-pointer group">
          <div className="flex items-center gap-8">
           <div className="flex flex-col items-center justify-center w-14 h-14 bg-card border border-border shadow-sm rounded-2xl font-mono text-label-sm font-semibold group-hover:bg-operational-cyan/10 transition-all duration-200">
            <span className="opacity-10 text-label-xxs mb-1">{tc('id')}</span>
            {job.documentNumber.split('-')[1] || job.documentNumber}
           </div>
           <div className="space-y-2">
            <div className="flex items-center gap-4">
             <span className="text-body-md font-semibold text-foreground uppercase">{job.destination}</span>
             <Badge className={`rounded-lg text-label-xxs font-semibold uppercase px-2.5 py-1 border-none ${ job.priority.toLowerCase() === 'high' || job.priority.toLowerCase() === 'urgent' ? 'bg-status-error text-white animate-pulse' : 'bg-muted text-muted-foreground' }`}>
              {t(`store.urgency_${(job.priority || 'normal').toLowerCase() === 'high' ? 'urgent' : (job.priority || 'normal').toLowerCase()}`)}
             </Badge>
            </div>
            <p className="text-label-xs text-muted-foreground/30 font-semibold uppercase">
             {job.itemsCount} {tc('units_label')} • {job.type === 'ISSUE' ? t('store.direct_issue') : t('store.transfer_request')}
            </p>
           </div>
          </div>
          <div className="flex items-center gap-10">
           <div className="hidden md:flex flex-col items-end gap-2">
            <span className="text-label-xxs font-semibold text-muted-foreground/20 uppercase italic">{t('store.fefo_buffer')}</span>
            <div className="flex gap-1">
             <div className="w-5 h-1 bg-status-success rounded-full" />
             <div className="w-5 h-1 bg-status-success rounded-full" />
             <div className="w-5 h-1 bg-muted rounded-full" />
            </div>
           </div>
           <PermissionGate action="edit" resource="operations_issues">
            <Button 
             variant="ghost" 
             className="rounded-2xl bg-card border border-border shadow-sm h-12 w-12 p-0 hover:bg-status-success hover:text-black transition-all hover:scale-110 active:scale-95"
             onClick={() => {
              if (job.type === 'ISSUE') {
               router.push(`/issues/${job.id}`);
              } else {
               router.push(`/transfers/${job.id}`);
              }
             }}
            >
             <ArrowRightLeft className="w-4 h-4" />
            </Button>
           </PermissionGate>
          </div>
         </div>
        ))}
       </div>
      </div>
     </div>
    </section>
 
    {/* Efficiency & Velocity Section */}
    <section className="space-y-8" aria-labelledby="efficiency-velocity-title">
     <h2 id="efficiency-velocity-title" className="sr-only">{t('store.efficiency')}</h2>
     
     <div className="bg-card border border-border shadow-sm rounded-2xl relative group overflow-hidden transition-all duration-200">
      <div className="absolute bottom-0 start-0 w-full h-1 bg-status-success scale-x-0 group-hover:scale-x-100 transition-transform duration-200 origin-left" />
      <div className="p-8 pb-4">
       <span className="text-label-xs font-semibold uppercase text-status-success flex items-center gap-2 mb-4">
        <Zap className="w-3.5 h-3.5 fill-current" /> {t('store.fefo_boundary')}
       </span>
       <h3 className="text-xl md:text-2xl font-bold text-foreground tracking-tight uppercase">{t('store.expiring_stock')}</h3>
      </div>
      <div className="p-8 pt-2 space-y-6">
       {stats.expiringLots.map((item) => (
        <div key={item.id} className="flex items-center justify-between border-s-2 border-surface-container-low ps-6 hover:border-status-success transition-all duration-140 ease-industrial group/item">
         <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
           <span className="text-label-xs font-semibold text-foreground group-hover/item:text-status-success transition-colors uppercase">{item.itemName}</span>
           <span className={`text-label-xxs font-semibold px-3 py-1 rounded-lg ${item.daysLeft < 3 ? 'bg-status-error/10 text-status-error' : 'bg-status-warning/10 text-status-warning'} uppercase`}>{t('store.days_left', { days: item.daysLeft })}</span>
          </div>
          <span className="text-label-xxs font-semibold text-muted-foreground/30 uppercase">{tc('batch')} {item.lotNumber} • {tc('warehouse')} {item.warehouseName}</span>
         </div>
         <PermissionGate action="create" resource="operations_adjustments">
          <Link href={`/adjustments/new?itemId=${item.itemId || item.id}&batch=${item.lotNumber}&reason=damage`} className="contents">
           <Button variant="ghost" className="rounded-xl bg-card border border-border shadow-sm h-10 w-10 p-0 hover:bg-status-warning hover:text-black transition-all hover:scale-110 active:scale-95">
            <AlertCircle className="w-4 h-4" />
           </Button>
          </Link>
         </PermissionGate>
        </div>
       ))}
       <PermissionGate action="create" resource="operations_adjustments">
        <Link href="/adjustments/new" className="w-full">
         <Button className="w-full bg-muted hover:bg-status-success hover:text-black border-none rounded-2xl text-label-xs font-semibold uppercase h-14 mt-6 transition-all hover:scale-[0.98] hover:brightness-110 active:scale-95">
          {t('store.generate_disposal')}
         </Button>
        </Link>
       </PermissionGate>
      </div>
     </div>
 
     <div className="bg-card border border-border shadow-sm rounded-2xl overflow-hidden group transition-all duration-200">
      <div className="p-8 pb-4">
       <span className="text-label-xs font-semibold uppercase text-muted-foreground/20 flex items-center gap-2 mb-4">
        <BarChart3 className="w-3.5 h-3.5" /> {t('store.efficiency')}
       </span>
       <h3 className="text-xl md:text-2xl font-bold text-foreground tracking-tight uppercase">{t('store.stock_velocity')}</h3>
      </div>
      <div className="h-44 flex flex-col items-center justify-center gap-6 bg-card border border-border shadow-sm/30 group-hover:bg-card border border-border shadow-sm/50 transition-all duration-140 ease-industrial">
       <div className="flex items-end gap-2 h-16 w-full justify-center">
        {(stats.efficiencyMetrics?.velocityChart || []).length > 0 ? (
         (stats.efficiencyMetrics?.velocityChart || []).map((h, i) => (
          <div key={i} className="w-3 bg-status-success/10 group-hover:bg-status-success/40 transition-all duration-200 cursor-pointer rounded-full" style={{ height: `${h}%` }} />
         ))
        ) : (
         <span className="text-label-xs font-semibold text-muted-foreground/30 uppercase my-auto">{t('no_data', { defaultValue: 'No Data' })}</span>
        )}
       </div>
       <span className="text-label-xxs font-semibold text-muted-foreground/20 uppercase">{t('store.weekly_throughput', { week: stats.efficiencyMetrics?.throughputWeek || 17 })}</span>
      </div>
     </div>
    </section>
   </div>
  </main>
 );
}
