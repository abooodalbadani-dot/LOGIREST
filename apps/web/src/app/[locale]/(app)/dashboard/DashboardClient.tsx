'use client';

import { useTranslations } from 'next-intl';
import { Package, FileText, ClipboardCheck, AlertTriangle, Activity, Database, Users, ShieldCheck } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { KPICard } from '@/features/dashboard/components/KPICard';
import { formatCurrency, formatNumber } from '@/utils/currency';
import { ClientOnlyTime } from '@/components/shared/ClientOnlyTime';
import { useLocale } from '@/hooks/useLocale';
import { useAuth } from '@/providers/AuthProvider';
import { Badge } from '@/components/ui/badge';
import { AdminDashboard } from '@/features/dashboard/components/AdminDashboard';
import { KitchenDashboard } from '@/features/dashboard/components/KitchenDashboard';
import { StoreManagerDashboard } from '@/features/dashboard/components/StoreManagerDashboard';
import { ProcurementDashboard } from '@/features/dashboard/components/ProcurementDashboard';
import { NearExpiryWidget } from '@/features/dashboard/components/NearExpiryWidget';
import { PendingDocumentsWidget } from '@/features/dashboard/components/PendingDocumentsWidget';
import { useDashboardStats } from '@/features/dashboard/hooks/useDashboardStats';
import { PageSkeleton } from '@/components/shared/PageSkeleton';

export default function DashboardClient() {
    const t = useTranslations('dashboard');
    const tc = useTranslations('common');
    const { locale } = useLocale();
    const { user } = useAuth();
    const { data: statsData, isLoading: loadingStats, error } = useDashboardStats();

    if (loadingStats) {
        return <PageSkeleton />;
    }

    const stats = {
        totalStockValue: statsData?.totalValue ?? 0,
        baseCurrency: statsData?.currency ?? 'USD',
        pendingPRs: statsData?.pendingPrs ?? 0,
        activeStocktakes: statsData?.activeStocktakes ?? 0,
        lowStockItems: statsData?.lowStockItems ?? 0,
        systemHealth: statsData?.systemHealth ?? 98.4,
        activeUsers: statsData?.activeUsers ?? 0,
    };

    // Visibility logic based on roles
    const canSeeApprovals = user?.role === 'ADMIN' || user?.role === 'INV_MGR' || user?.role === 'APPROVER';
    const canSeeNearExpiry = true;

    // Role-based Dashboard Switching
    const renderDashboard = () => {
        switch (user?.role) {
            case 'ADMIN':
            case 'GM':
                return <AdminDashboard />;
            case 'KITCHEN_CHIEF':
                return <KitchenDashboard />;
            case 'STORE_MGR':
            case 'INV_MGR':
            case 'WH_KEEPER':
                return <StoreManagerDashboard />;
            case 'PROC_MGR':
            case 'PROC_OFFICER':
                return <ProcurementDashboard />;
            default:
                // Generic fallback dashboard (previous content)
                return (
                    <div className="min-w-0 gap-6 flex-1 flex-col flex space-y-10 w-full">
                        {/* KPI Section */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <KPICard
                                title={t('kpi.total_stock')}
                                value={formatCurrency(stats.totalStockValue, stats.baseCurrency, locale as 'ar' | 'en')}
                                icon={Package}
                                accent="cyan"
                                description={t('kpi.vs_last_month')}
                            />
                            <KPICard
                                title={t('kpi.pending_prs')}
                                value={formatNumber(stats.pendingPRs, locale as 'ar' | 'en')}
                                icon={FileText}
                                accent="amber"
                                description={t('kpi.immediate_review')}
                            />
                            <KPICard
                                title={t('kpi.active_stocktakes')}
                                value={formatNumber(stats.activeStocktakes, locale as 'ar' | 'en')}
                                icon={ClipboardCheck}
                                accent="amber"
                                description={t('kpi.jeddah_riyadh_active')}
                            />
                            <KPICard
                                title={t('kpi.low_stock_items')}
                                value={formatNumber(stats.lowStockItems, locale as 'ar' | 'en')}
                                icon={AlertTriangle}
                                accent="red"
                                description={t('kpi.critical_items')}
                            />
                        </div>

                        {/* Main Widgets Section */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between px-1">
                                    <h4 className="text-label-xs font-semibold uppercase text-muted-foreground/40">
                                        {t('expiry_control')}
                                    </h4>
                                    <div className="h-px flex-1 mx-6 bg-surface-container-high/30" />
                                </div>
                                {canSeeNearExpiry && <NearExpiryWidget locale={locale} />}
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between px-1">
                                    <h4 className="text-label-xs font-semibold uppercase text-muted-foreground/40">
                                        {t('approval_workflow')}
                                    </h4>
                                    <div className="h-px flex-1 mx-6 bg-surface-container-high/30" />
                                </div>
                                {canSeeApprovals && <PendingDocumentsWidget locale={locale} baseCurrency={statsData?.currency} />}
                            </div>
                        </div>
                    </div>
                );
        }
    };

    return (
        <div className="max-w-[1600px] mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000 pb-20">
            {renderDashboard()}

            {/* Intelligence & Analytics Section - Global */}
            <div className="space-y-4 pt-6">
                <div className="flex items-center justify-between px-1">
                    <h4 className="text-label-xs font-semibold uppercase text-muted-foreground/60">
                        {t('business_intelligence')}
                    </h4>
                    <div className="h-px flex-1 mx-6 bg-surface-container-high/10" />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 opacity-30 grayscale pointer-events-none filter blur-[0.5px] transition-all hover:opacity-100 hover:grayscale-0 hover:blur-0">
                    <div className="lg:col-span-2 h-56 rounded-2xl bg-card border border-dashed border-border flex flex-col items-center justify-center gap-4 min-w-0">
                        <Activity className="w-8 h-8 text-muted-foreground/40" />
                        <span className="text-muted-foreground/60 italic text-label-xs font-semibold uppercase">{t('movement_analytics_placeholder')}</span>
                    </div>
                    <div className="h-56 rounded-2xl bg-card border border-dashed border-border flex flex-col items-center justify-center gap-4 min-w-0">
                        <Activity className="w-8 h-8 text-muted-foreground/40" />
                        <span className="text-muted-foreground/60 italic text-label-xs font-semibold uppercase">{t('audit_logs_placeholder')}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
