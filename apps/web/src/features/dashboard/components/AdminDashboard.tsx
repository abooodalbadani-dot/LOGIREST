'use client';

import { useTranslations } from 'next-intl';
import { useDashboardStats } from '../hooks/useDashboardStats';
import {
 Activity,
 AlertTriangle,
 ClipboardCheck,
 Database,
 FileText,
 Package,
 ShieldCheck,
 Users,
 TrendingUp,
 History,
} from 'lucide-react';
import { KPICard } from './KPICard';
import { NearExpiryWidget } from './NearExpiryWidget';
import { PendingDocumentsWidget } from './PendingDocumentsWidget';
import { useAdminSettings } from '@/features/admin/hooks/useAdminSettings';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { formatCurrency, formatNumber } from '@/utils/currency';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { useLocale } from '@/hooks/useLocale';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { PermissionGate } from '@/components/shared/PermissionGate';

export function AdminDashboard() {
 const { data: settings, isLoading: loadingSettings } = useAdminSettings();
 const { data: stats, isLoading: loadingStats, error } = useDashboardStats();
 const t = useTranslations('dashboard');
 const tc = useTranslations('common');
 const { locale } = useLocale();

 if (loadingSettings || loadingStats) {
  return <PageSkeleton />;
 }

 if (error || !stats) {
  return <div className="p-8 text-status-error uppercase font-bold">{t('error_loading')}</div>;
 }

 // Additional derived info
 const lastBackupTime = tc('time_ago.hours', { count: 2 });

 return (
  <main role="main" className="space-y-10">
   {/* Admin Header */}
   <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
    <div className="space-y-1">
     <Badge className="bg-operational-cyan/10 text-operational-cyan border-none text-label-xs font-semibold uppercase mb-2">
      {tc('role.admin')}
     </Badge>
     <h1 className="text-3xl md:text-4xl font-extrabold text-foreground tracking-tight">
      {t('title')} <span className="text-brand-gold">{t('kitchen.overview')}</span>
     </h1>
    </div>
   </header>

   {/* KPI Grid */}
   <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" aria-labelledby="kpi-grid-title">
    <h2 id="kpi-grid-title" className="sr-only">{t('aria.kpi_grid')}</h2>
    <KPICard
     title={t('kpi.total_stock')}
     value={formatCurrency(stats.totalValue, stats.currency, locale as 'ar' | 'en')}
     icon={Package}
     accent="cyan"
     trend={{ value: '12%', isPositive: true }}
     description={t('kpi.vs_last_month')}
     currency={stats.currency}
     symbol={stats.currencySymbol}
    />
    <KPICard
     title={t('kpi.pending_prs')}
     value={formatNumber(stats.pendingPrs, locale as 'ar' | 'en')}
     icon={FileText}
     accent="amber"
     description={t('kpi.immediate_review')}
    />
    <KPICard
     title={t('kpi.active_stocktakes')}
     value={formatNumber(stats.activeStocktakes, locale as 'ar' | 'en')}
     icon={ClipboardCheck}
     accent="cyan"
     description={t('kpi.warehouse_locked')}
    />
    <KPICard
     title={t('kpi.low_stock_items')}
     value={formatNumber(stats.lowStockItems, locale as 'ar' | 'en')}
     icon={AlertTriangle}
     accent="red"
     description={t('kpi.reorder_suggested')}
    />
   </section>

   <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
    {/* System Health & Audit Column */}
    <section className="lg:col-span-1 space-y-8" aria-labelledby="system-health-title">
     <h2 id="system-health-title" className="sr-only">{t('system_health.title')}</h2>
     <Card className="bg-card border border-border shadow-sm rounded-2xl overflow-hidden relative group">
      <div className="absolute top-0 end-0 w-32 h-32 bg-operational-cyan/5 blur-[60px] rounded-full -me-16 -mt-16 group-hover:bg-operational-cyan/10 transition-colors duration-200" />
      <CardHeader className="pb-2">
       <div className="flex items-center justify-between mb-2">
        <span className="text-label-xs font-semibold uppercase text-operational-cyan">{t('system_health.title')}</span>
        <Badge variant="outline" className="bg-status-success/10 text-status-success border-none text-label-xxs font-semibold uppercase">
         <ShieldCheck className="w-2.5 h-2.5 me-1" />
         {t('system_health.optimal')}
        </Badge>
       </div>
       <CardTitle className="text-xl md:text-2xl font-bold text-foreground tracking-tight uppercase">{stats.systemHealth}% {t('system_health.health_suffix')}</CardTitle>
       <CardDescription className="text-label-xs font-medium text-muted-foreground/60 uppercase">{t('system_health.node_description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 pt-4">
       <div className="h-1.5 w-full bg-surface-container-highest/30 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-operational-cyan to-operational-cyan/60 w-[98.4%]" />
       </div>
       <div className="grid grid-cols-2 gap-4">
        <div className="p-3 bg-card border border-border shadow-sm rounded-xl space-y-1">
         <span className="text-label-xxs font-semibold text-muted-foreground/40 uppercase flex items-center gap-1.5">
          <Database className="w-3 h-3" /> {t('system_health.backup')}
         </span>
         <span className="text-label-sm font-bold text-foreground">{lastBackupTime}</span>
        </div>
        <div className="p-3 bg-card border border-border shadow-sm rounded-xl space-y-1">
         <Link href="/admin/users" className="contents">
          <span className="text-label-xxs font-semibold text-muted-foreground/40 uppercase flex items-center gap-1.5 hover:text-operational-cyan cursor-pointer transition-colors">
           <Users className="w-3 h-3" /> {t('system_health.online')}
          </span>
          <span className="text-label-sm font-bold text-foreground">{stats.activeUsers} {t('system_health.sessions')}</span>
         </Link>
        </div>
       </div>
      </CardContent>
     </Card>

     <Card className="bg-card border border-border shadow-sm rounded-2xl overflow-hidden group">
      <CardHeader className="pb-4">
       <div className="flex items-center justify-between">
        <span className="text-label-xs font-semibold uppercase text-muted-foreground/40 flex items-center gap-2">
         <History className="w-3 h-3" />
         {t('audit.title')}
        </span>
        <Link href="/admin/audit-logs">
         <Button variant="ghost" size="sm" className="h-6 text-label-xxs font-semibold uppercase text-muted-foreground/40 hover:text-operational-cyan">
          {t('audit.view_all')}
         </Button>
        </Link>
       </div>
       <CardTitle className="text-title-sm font-semibold uppercase mt-2">{t('audit.subtitle')}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
       <div className="divide-y divide-transparent">
        {stats.systemAuditLogs.map((log) => (
         <div key={log.id} className="flex items-center justify-between p-4 hover:bg-surface-container-high/40 transition-all duration-140 ease-industrial group cursor-pointer">
          <div className="flex flex-col gap-0.5">
           <span className="text-label-xs font-bold text-foreground group-hover:text-operational-cyan transition-colors uppercase">{log.action}</span>
           <span className="text-label-xxs font-medium text-muted-foreground/40 uppercase">{log.user} • {log.type}</span>
          </div>
          <span className="text-label-xxs font-semibold text-muted-foreground/30 uppercase font-mono">{log.time}</span>
         </div>
        ))}
       </div>
      </CardContent>
     </Card>
    </section>

    {/* Operational Monitoring */}
    <section className="lg:col-span-2 space-y-8" aria-labelledby="operational-monitoring-title">
     <h2 id="operational-monitoring-title" className="sr-only">{t('aria.operational_monitoring')}</h2>
     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <PendingDocumentsWidget locale={locale} data={stats.pendingApprovals} baseCurrency={stats.currency} />
      <NearExpiryWidget locale={locale} data={stats.expiringLots} />
     </div>

     <Card className="bg-card border border-border shadow-sm rounded-2xl relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(var(--primary-rgb),0.05),transparent_70%)]" />
      <CardHeader className="flex flex-row items-center justify-between pb-6">
       <div>
        <span className="text-label-xs font-semibold uppercase text-operational-cyan mb-1 block">{t('analytics.title')}</span>
        <CardTitle className="text-xl md:text-2xl font-bold text-foreground tracking-tight uppercase">{t('analytics.velocity')}</CardTitle>
       </div>
       <PermissionGate action="view" resource="reports">
        <Link href="/reports">
         <Button variant="outline" size="sm" className="bg-card border border-border shadow-sm/10 text-label-xs font-semibold uppercase px-4 h-8 rounded-xl hover:bg-operational-cyan hover:text-black hover:border-operational-cyan transition-all duration-140 ease-industrial">
          {t('analytics.full_report')} <TrendingUp className="w-3 h-3 ms-2" />
         </Button>
        </Link>
       </PermissionGate>
      </CardHeader>
      <CardContent className="h-[200px] flex items-center justify-center">
       <div className="text-center space-y-4">
        <Activity className="w-12 h-12 text-muted-foreground/10 mx-auto animate-pulse" />
        <span className="text-label-xs font-semibold text-muted-foreground/30 uppercase">{t('analytics.processing')}</span>
       </div>
      </CardContent>
     </Card>
    </section>
   </div>
  </main>
 );
}
