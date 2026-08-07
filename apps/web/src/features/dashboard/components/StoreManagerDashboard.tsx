'use client';

import { useMemo } from 'react';
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
import { PageHeader } from '@/components/shared/PageHeader';

export function StoreManagerDashboard() {
    const t = useTranslations('dashboard');
    const tc = useTranslations('common');
    const { locale } = useLocale();
    const { user, activeScope } = useAuth();
    const router = useRouter();
    const { data: stats, isLoading, error } = useDashboardStats();

    const totalQueueItems = useMemo(() => {
        return (stats?.fulfillmentQueue || []).reduce((sum, job) => sum + (job.itemsCount || 0), 0);
    }, [stats?.fulfillmentQueue]);

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
            <PageHeader
                title="Operational"
                highlight="Control"
                subtitle={
                    <>
                        <span className="text-label-xs font-semibold uppercase text-status-success block mb-2 opacity-80">{t('store.logistics')}</span>
                        <div className="flex items-center gap-3">
                            <div className="h-[2px] w-12 bg-status-success" />
                            <p className="text-sm font-bold text-status-success tracking-widest mt-2">{t('store.central_warehouse')}</p>
                        </div>
                    </>
                }
            >
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
            </PageHeader>

            {/* KPI Grid */}
            <section className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-6" aria-labelledby="kpi-heading">
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
                        <div className="p-4 sm:p-6 md:p-8 md:pb-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 md:mb-8">
                                <div>
                                    <h3 id="fulfillment-queue-title" className="text-lg md:text-2xl font-bold text-foreground tracking-tight uppercase">{t('store.fulfillment_queue')}</h3>
                                    <p className="text-[10px] md:text-xs font-semibold text-brand-gold md:text-status-success uppercase tracking-widest mt-1">{t('store.fefo_guided')}</p>
                                </div>
                                {totalQueueItems > 0 && (
                                    <div className="flex items-center gap-2 md:gap-3 self-end sm:self-auto">
                                        <div className="flex -space-x-2.5">
                                            {Array.from({ length: Math.min(totalQueueItems, 3) }).map((_, i) => (
                                                <div key={i} className="w-9 h-9 rounded-full border border-card bg-muted flex items-center justify-center text-[9px] font-bold text-muted-foreground/40" />
                                            ))}
                                        </div>
                                        {totalQueueItems > 3 && (
                                            <span className="text-label-xs font-semibold text-status-success uppercase">
                                                {t('store.more_items', { count: totalQueueItems - 3 })}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div className="flex flex-col gap-3 md:gap-0 md:divide-y md:divide-border/40">
                                {stats.fulfillmentQueue.map((job) => (
                                    <Link key={job.id} href={job.type === 'ISSUE' ? `/issues/${job.id}` : `/transfers/${job.id}`} className="block">
                                        <div className="p-4 md:px-6 md:py-5 flex items-center justify-between hover:bg-surface-container-high/10 transition-all duration-200 group bg-surface-lowest md:bg-transparent border border-border/50 md:border-transparent rounded-2xl md:rounded-none">
                                            <div className="flex items-center gap-4 md:gap-8 min-w-0">
                                                <div className="flex flex-col items-center justify-center shrink-0 w-12 h-12 md:w-14 md:h-14 bg-background border border-border/60 shadow-sm rounded-xl md:rounded-2xl font-mono text-[10px] md:text-label-sm font-semibold group-hover:bg-brand-gold/10 group-hover:text-brand-gold transition-all duration-200">
                                                    <span className="opacity-50 text-status-success md:text-status-success mb-0.5 md:mb-1 text-[8px] md:text-[10px] uppercase">{tc('id')}</span>
                                                    {job.documentNumber.split('-').pop() || job.documentNumber}
                                                </div>
                                                <div className="space-y-1 md:space-y-2 min-w-0">
                                                    <div className="flex items-center gap-2 md:gap-4 flex-wrap">
                                                        <span className="text-sm md:text-body-md font-bold text-foreground uppercase truncate">{job.destination}</span>
                                                        <Badge className={`rounded-md md:rounded-lg text-[9px] md:text-label-xxs font-semibold uppercase px-2 py-0.5 md:px-2.5 md:py-1 border-none ${job.priority.toLowerCase() === 'high' || job.priority.toLowerCase() === 'urgent' ? 'bg-status-error text-white animate-pulse' : 'bg-muted text-muted-foreground'}`}>
                                                            {t(`store.urgency_${(job.priority || 'normal').toLowerCase() === 'high' ? 'urgent' : (job.priority || 'normal').toLowerCase()}`)}
                                                        </Badge>
                                                    </div>
                                                    <p className="text-[10px] md:text-label-xs text-muted-foreground md:text-status-success font-semibold uppercase truncate">
                                                        <span className="text-brand-gold md:text-status-success">{job.itemsCount} {tc('units_label')}</span> <span className="opacity-50">•</span> {job.type === 'ISSUE' ? t('store.direct_issue') : t('store.transfer_request')}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4 md:gap-10 shrink-0">
                                                <div className="hidden md:flex flex-col items-end gap-2">
                                                    <span className="text-label-xxs font-semibold text-status-success uppercase italic">{t('store.fefo_buffer')}</span>
                                                    <div className="flex gap-1">
                                                        <div className="w-5 h-1 bg-status-success rounded-full" />
                                                        <div className="w-5 h-1 bg-status-success rounded-full" />
                                                        <div className="w-5 h-1 bg-muted rounded-full" />
                                                    </div>
                                                </div>
                                                <PermissionGate action="edit" resource="operations_issues">
                                                    <div className="flex items-center justify-center rounded-xl md:rounded-2xl bg-card md:bg-background border border-border/50 shadow-sm h-10 w-10 md:h-12 md:w-12 p-0 group-hover:bg-brand-gold group-hover:border-brand-gold group-hover:text-black text-foreground transition-all duration-300 hover:scale-105 active:scale-95">
                                                        <ArrowRightLeft className="w-4 h-4 md:w-5 md:h-5" />
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
                            <span className="text-label-xs font-semibold uppercase text-status-success flex items-center gap-2 mb-4">
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
                                    <span className="text-label-xs font-semibold text-status-success uppercase my-auto">{t('no_data', { defaultValue: 'No Data' })}</span>
                                )}
                            </div>
                            <span className="text-label-xxs font-semibold text-status-success uppercase">{t('store.weekly_throughput', { week: stats.efficiencyMetrics?.throughputWeek || 17 })}</span>
                        </div>
                    </div>
                </section>
            </div>
        </main>
    );
}
