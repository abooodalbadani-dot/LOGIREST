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
import { formatNumber } from '@/utils/currency';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { useLocale } from '@/hooks/useLocale';
import { Button } from '@/components/ui/button';
import { PermissionGate } from '@/components/shared/PermissionGate';

export function KitchenDashboard() {
  const t = useTranslations('dashboard');
  const tc = useTranslations('common');
  const { locale } = useLocale();

  // Mock data for Kitchen Chief
  const stats = {
    pendingRequests: 4,
    itemsShortage: 3,
    todayConsumption: 124,
    stockHealth: 92,
  };

  return (
    <main role="main" className="space-y-10 animate-in fade-in duration-200">
      {/* Kitchen Chief Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <Badge className="bg-status-warning/10 text-status-warning border-none text-label-xs font-semibold uppercase mb-2">
            {t('kitchen.operations')}
          </Badge>
          <h1 className="text-headline-lg font-semibold uppercase italic text-foreground">
            {tc('department')} <span className="text-status-warning">{t('kitchen.overview')}</span>
          </h1>
        </div>
        <PermissionGate action="create" resource="operations_issues">
          <Link href="/issues/new" className="contents">
            <Button className="primary-gradient text-white font-semibold uppercase px-8 rounded-xl h-12">
              <Plus className="w-5 h-5 me-2" /> {t('kitchen.new_request')}
            </Button>
          </Link>
        </PermissionGate>
      </header>

      {/* KPI Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" aria-labelledby="kpi-grid-title">
        <h2 id="kpi-grid-title" className="sr-only">{t('aria.kpi_grid')}</h2>
        <KPICard
          title={t('kitchen.active_requests')}
          value={formatNumber(stats.pendingRequests, locale as 'ar' | 'en')}
          icon={ClipboardList}
          accent="amber"
          description={t('kitchen.awaiting_fulfillment')}
        />
        <KPICard
          title={t('kitchen.critical_shortage')}
          value={formatNumber(stats.itemsShortage, locale as 'ar' | 'en')}
          icon={AlertTriangle}
          accent="red"
          description={t('kitchen.immediate_action')}
        />
        <KPICard
          title={t('kitchen.today_consumption')}
          value={formatNumber(stats.todayConsumption, locale as 'ar' | 'en')}
          icon={Utensils}
          accent="cyan"
          trend={{ value: '8%', isPositive: true }}
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
          <Card className="bg-surface-container-lowest border-none rounded-2xl relative overflow-hidden">
            <div className="absolute top-0 end-0 w-64 h-64 bg-status-warning/5 blur-[100px] rounded-full -me-32 -mt-32" />
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle id="supply-requests-title" className="text-title-lg font-semibold uppercase italic">{t('kitchen.supply_requests')}</CardTitle>
                <CardDescription className="text-label-xs font-medium text-muted-foreground/60 uppercase">{t('kitchen.tracking_flow')}</CardDescription>
              </div>
              <PermissionGate action="view" resource="operations_issues">
                <Link href="/issues">
                  <Button variant="link" className="text-status-warning font-semibold uppercase text-label-xs">{t('kitchen.view_history')}</Button>
                </Link>
              </PermissionGate>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-transparent">
                {[
                  { id: 'RQ-2024-081', items: t('kitchen.mock.request_items_1'), status: 'pending', time: tc('time_ago.hours', { count: 1 }), priority: 'high' },
                  { id: 'RQ-2024-079', items: t('kitchen.mock.request_items_2'), status: 'fulfilled', time: tc('time_ago.hours', { count: 4 }), priority: 'normal' },
                  { id: 'RQ-2024-075', items: t('kitchen.mock.request_items_3'), status: 'rejected', time: tc('time_ago.days', { count: 1 }), priority: 'urgent' },
                ].map((req, i) => (
                  <div key={i} className="p-5 flex items-center justify-between hover:bg-surface-container-high/40 transition-all duration-140 ease-industrial group cursor-pointer">
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-xl border-none ${ req.status === 'pending' ? 'bg-status-warning/10' : req.status === 'fulfilled' ? 'bg-status-success/10' : 'bg-status-error/10' }`}>
                        <PackageSearch className={`w-5 h-5 ${ req.status === 'pending' ? 'text-status-warning' : req.status === 'fulfilled' ? 'text-status-success' : 'text-status-error' }`} />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-body-md font-semibold text-foreground uppercase italic">{req.id}</span>
                          <Badge variant="outline" className={`text-label-xxs font-semibold uppercase px-1.5 h-4 ${ req.priority === 'urgent' ? 'text-status-error bg-status-error/5' : req.priority === 'high' ? 'text-status-warning bg-status-warning/5' : 'text-muted-foreground/40 border-none bg-surface-container-low' }`}>
                            {t(`kitchen.priority.${req.priority}`)}
                          </Badge>
                        </div>
                        <p className="text-label-xs text-muted-foreground font-medium line-clamp-1">{req.items}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="text-label-xxs font-semibold text-muted-foreground/40 uppercase flex items-center gap-1.5">
                        <Clock className="w-3 h-3" /> {req.time}
                      </span>
                      <Badge className={`${
                        req.status === 'pending' ? 'bg-status-warning/10 text-status-warning' : 
                        req.status === 'fulfilled' ? 'bg-status-success/10 text-status-success' : 
                        'bg-status-error/10 text-status-error'
                      } text-label-xxs font-semibold uppercase border-none`}>
                        {t(`kitchen.status.${req.status}`)}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Daily Activity Widget */}
        <section className="space-y-4" aria-labelledby="daily-activity-title">
          <Card className="bg-surface-container-lowest border-none rounded-2xl h-full">
            <CardHeader>
              <span className="text-label-xs font-semibold uppercase text-operational-cyan mb-1 flex items-center gap-2">
                <History className="w-3 h-3" /> 
                {t('kitchen.daily_activity')}
              </span>
              <CardTitle id="daily-activity-title" className="text-title-sm font-semibold uppercase">{t('kitchen.consumption_log')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {[
                { item: t('kitchen.mock.consumption_items.olive_oil'), qty: t('kitchen.mock.consumption_qty.liters', { count: 2.5 }), time: '14:20' },
                { item: t('kitchen.mock.consumption_items.basmati_rice'), qty: t('kitchen.mock.consumption_qty.kilograms', { count: 15 }), time: '12:30' },
                { item: t('kitchen.mock.consumption_items.frozen_chicken'), qty: t('kitchen.mock.consumption_qty.kilograms', { count: 24 }), time: '09:15' },
                { item: t('kitchen.mock.consumption_items.flour'), qty: t('kitchen.mock.consumption_qty.kilograms', { count: 5 }), time: '08:00' },
              ].map((log, i) => (
                <div key={i} className="flex items-center justify-between group">
                  <div className="flex flex-col">
                    <span className="text-label-xs font-bold text-foreground group-hover:text-cyan-500 transition-colors">{log.item}</span>
                    <span className="text-label-xxs font-medium text-muted-foreground/40">{log.qty} {t('kitchen.recorded')}</span>
                  </div>
                  <span className="text-label-xs font-semibold text-muted-foreground/30 font-mono">{log.time}</span>
                </div>
              ))}
              <PermissionGate action="create" resource="operations_issues">
                <Link href="/issues/new" className="w-full">
                  <Button variant="outline" className="w-full bg-surface-container-low border-none text-label-xs font-semibold uppercase h-10 hover:bg-operational-cyan/20 hover:text-operational-cyan transition-all duration-140 ease-industrial">
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
