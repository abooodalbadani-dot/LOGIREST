'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { 
 ClipboardList, 
 AlertTriangle, 
 Utensils, 
 ArrowUpRight, 
 Clock, 
 CheckCircle2,
 PackageSearch,
 History,
 Plus
} from 'lucide-react';
import { KPICard } from './KPICard';
import { formatNumber, formatDate } from '@/utils/currency';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { useLocale } from '@/hooks/useLocale';
import { Button } from '@/components/ui/button';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { useDashboardStats } from '../hooks/useDashboardStats';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { useAuth } from '@/providers/AuthProvider';
import { EmptyScopeState } from '@/components/ui/EmptyScopeState';
import { PageHeader } from '@/components/shared/PageHeader';

const mapStatus = (status: string) => {
 const s = status.toLowerCase();
 if (s === 'draft' || s === 'submitted' || s === 'pending') return 'pending';
 if (s === 'fulfilled') return 'fulfilled';
 return 'rejected';
};

export function KitchenDashboard() {
 const t = useTranslations('dashboard');
 const tc = useTranslations('common');
 const { locale } = useLocale();
 const { activeScope } = useAuth();
 const { data: stats, isLoading, error } = useDashboardStats();

 if (!activeScope?.departmentId) {
  return (
   <div className="flex-1 w-full min-w-0 flex flex-col items-center justify-center">
    <EmptyScopeState context="department" />
   </div>
  );
 }

 if (isLoading) {
  return <PageSkeleton />;
 }

 if (error || !stats) {
  return <div className="p-4 md:p-8 text-sm md:text-base text-status-error uppercase font-bold break-words">{t('error_loading')}</div>;
 }

 return (
  <main role="main" className="space-y-10 animate-in fade-in duration-200">
   {/* Kitchen Chief Header */}
   <PageHeader
    title={tc('department')}
    highlight={t('kitchen.overview')}
    subtitle={
     <Badge className="bg-status-warning/10 text-status-warning border-none text-label-xs font-semibold uppercase mb-2">
      {t('kitchen.operations')}
     </Badge>
    }
   >
    <PermissionGate action="create" resource="operations_kitchen_requests">
     <Link href="/kitchen-requests/new" className="contents">
      <Button className="bg-brand-gold hover:bg-brand-gold-hover text-white transition-colors font-semibold uppercase px-8 rounded-xl h-12">
       <Plus className="w-5 h-5 me-2" /> {t('kitchen.new_request')}
      </Button>
     </Link>
    </PermissionGate>
   </PageHeader>

   {/* KPI Grid */}
   <section className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-6" aria-labelledby="kpi-grid-title">
    <h2 id="kpi-grid-title" className="sr-only">{t('aria.kpi_grid')}</h2>
    <KPICard
     title={t('kitchen.active_requests')}
     value={formatNumber(stats.pendingFulfillment, locale as 'ar' | 'en')}
     icon={ClipboardList}
     accent="amber"
     description={t('kitchen.awaiting_fulfillment')}
    />
    <KPICard
     title={t('kitchen.critical_shortage')}
     value={formatNumber(stats.shortages, locale as 'ar' | 'en')}
     icon={AlertTriangle}
     accent="red"
     description={t('kitchen.immediate_action')}
    />
    <KPICard
     title={t('kitchen.today_consumption')}
     value={formatNumber(stats.todayConsumption, locale as 'ar' | 'en')}
     icon={Utensils}
     accent="cyan"
     description={t('kitchen.total_items_used')}
    />
    <KPICard
     title={t('kitchen.stock_health')}
     value={`${stats.stockHealth}%`}
     icon={CheckCircle2}
     accent="cyan"
     description={t('kitchen.overall_availability')}
    />
   </section>

   <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
    {/* Recent Requests List */}
    <section className="lg:col-span-2 space-y-4" aria-labelledby="supply-requests-title">
     <Card className="bg-card border border-border shadow-sm rounded-2xl relative overflow-hidden">
      <div className="absolute top-0 end-0 w-64 h-64 bg-status-warning/5 blur-[100px] rounded-full -me-32 -mt-32" />
      <CardHeader className="flex flex-row items-center justify-between">
       <div>
        <CardTitle id="supply-requests-title" className="text-xl md:text-2xl font-bold text-foreground tracking-tight uppercase">{t('kitchen.supply_requests')}</CardTitle>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mt-1">{t('kitchen.tracking_flow')}</p>
       </div>
       <PermissionGate action="view" resource="operations_kitchen_requests">
        <Link href="/kitchen-requests">
         <Button variant="link" className="text-status-warning font-semibold uppercase text-label-xs">{t('kitchen.view_history')}</Button>
        </Link>
       </PermissionGate>
      </CardHeader>
      <CardContent className="p-0">
       <div className="divide-y divide-transparent">
        {stats.recentRequests.map((req) => (
         <Link key={req.id} href={`/kitchen-requests/${req.id}`} className="block">
          <div className="p-5 flex items-center justify-between hover:bg-surface-container-high/40 transition-all duration-140 ease-industrial group">
           <div className="flex items-start gap-4">
            <div className={`p-3 rounded-xl border-none ${ mapStatus(req.status) === 'pending' ? 'bg-status-warning/10' : mapStatus(req.status) === 'fulfilled' ? 'bg-status-success/10' : 'bg-status-error/10' }`}>
             <PackageSearch className={`w-5 h-5 ${ mapStatus(req.status) === 'pending' ? 'text-status-warning' : mapStatus(req.status) === 'fulfilled' ? 'text-status-success' : 'text-status-error' }`} />
            </div>
            <div className="space-y-1">
             <div className="flex items-center gap-2">
              <span className="text-body-md font-semibold text-foreground uppercase italic">{req.documentNumber}</span>
              <Badge variant="outline" className={`text-label-xxs font-semibold uppercase px-1.5 h-4 ${ req.priority.toLowerCase() === 'urgent' || req.priority.toLowerCase() === 'high' ? 'text-status-error bg-status-error/5' : 'text-muted-foreground/40 bg-card border border-border shadow-sm' }`}>
               {t(`kitchen.priority.${(req.priority || 'normal').toLowerCase()}`)}
              </Badge>
             </div>
             <p className="text-label-xs text-muted-foreground font-medium line-clamp-1">{req.itemsSummary}</p>
            </div>
           </div>
           <div className="flex flex-col items-end gap-2">
            <span className="text-label-xxs font-semibold text-muted-foreground/40 uppercase flex items-center gap-1.5">
             <Clock className="w-3 h-3" /> {formatDate(req.createdAt, locale as 'ar' | 'en')}
            </span>
            <Badge className={`${
             mapStatus(req.status) === 'pending' ? 'bg-status-warning/10 text-status-warning' : 
             mapStatus(req.status) === 'fulfilled' ? 'bg-status-success/10 text-status-success' : 
             'bg-status-error/10 text-status-error'
            } text-label-xxs font-semibold uppercase border-none`}>
             {t(`kitchen.status.${mapStatus(req.status)}`)}
            </Badge>
           </div>
          </div>
         </Link>
        ))}
       </div>
      </CardContent>
     </Card>
    </section>

    {/* Daily Activity Widget */}
    <section className="space-y-4" aria-labelledby="daily-activity-title">
     <Card className="bg-card border border-border shadow-sm rounded-2xl h-full">
      <CardHeader>
       <span className="text-label-xs font-semibold uppercase text-operational-cyan mb-1 flex items-center gap-2">
        <History className="w-3 h-3" /> 
        {t('kitchen.daily_activity')}
       </span>
       <CardTitle id="daily-activity-title" className="text-title-sm font-semibold uppercase">{t('kitchen.consumption_log')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
       {stats.activityLog.map((log, i) => {
        let formattedTime = log.time;
        try {
          const d = new Date(log.time);
          if (!isNaN(d.getTime())) {
            formattedTime = d.toLocaleTimeString(locale === 'ar' ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit' });
          }
        } catch {
          // keep original if parsing fails
        }
        return (
          <div key={i} className="flex items-center justify-between group">
           <div className="flex flex-col">
            <span className="text-label-xs font-bold text-foreground group-hover:text-cyan-500 transition-colors">{log.itemName}</span>
            <span className="text-label-xxs font-medium text-muted-foreground/40">{log.qty} {log.uom} {t('kitchen.recorded')}</span>
           </div>
           <span className="text-label-xs font-semibold text-muted-foreground/50 font-mono" dir="ltr">{formattedTime}</span>
          </div>
        );
       })}
       <PermissionGate action="create" resource="operations_kitchen_requests">
        <Link href="/kitchen-requests/new" className="w-full">
         <Button variant="outline" className="px-6 py-2.5 bg-[#0B1220] text-white font-bold rounded-lg shadow-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
          {t('kitchen.quick_record')} <ArrowUpRight className="w-3 h-3 ms-2" />
         </Button>
        </Link>
       </PermissionGate>
      </CardContent>
     </Card>
    </section>
   </div>
  </main>
 );
}
