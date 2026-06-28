'use client';

import { useTranslations } from 'next-intl';
import { Package, FileText, ClipboardCheck, AlertTriangle, Activity, Database, Users, ShieldCheck, Lock, History, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { KPICard } from '@/features/dashboard/components/KPICard';
import { formatCurrency, formatNumber } from '@/utils/currency';
import { ClientOnlyTime } from '@/components/shared/ClientOnlyTime';
import { useLocale } from '@/hooks/useLocale';
import { useAuth } from '@/providers/AuthProvider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AdminDashboard } from '@/features/dashboard/components/AdminDashboard';
import { KitchenDashboard } from '@/features/dashboard/components/KitchenDashboard';
import { StoreManagerDashboard } from '@/features/dashboard/components/StoreManagerDashboard';
import { ProcurementDashboard } from '@/features/dashboard/components/ProcurementDashboard';
import { NearExpiryWidget } from '@/features/dashboard/components/NearExpiryWidget';
import { PendingDocumentsWidget } from '@/features/dashboard/components/PendingDocumentsWidget';
import { useDashboardStats } from '@/features/dashboard/hooks/useDashboardStats';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { useAuditLogs, type AuditLogRow } from '@/features/admin/hooks/useAuditLogs';
import { Link } from '@/i18n/navigation';

export default function DashboardClient() {
    const t = useTranslations('dashboard');
    const tc = useTranslations('common');
    const { locale } = useLocale();
    const { user } = useAuth();
    const { data: statsData, isLoading: loadingStats, error } = useDashboardStats();

    const hasAuditAccess = user?.role === 'ADMIN' || user?.role === 'INV_MGR' || user?.role === 'AUDITOR' || user?.role === 'GM';
    const { data: auditLogsData, isLoading: loadingAuditLogs } = useAuditLogs(
        { page: 1 },
        { enabled: !!hasAuditAccess }
    );
    const auditLogs = auditLogsData?.data || [];

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
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Movement Analytics - Phase 2 */}
                    <div className="lg:col-span-2 h-56 rounded-2xl bg-muted/10 border border-border flex flex-col items-center justify-center gap-3 p-6 text-center select-none relative overflow-hidden group">
                        <div className="absolute top-0 start-0 w-full h-1 bg-gradient-to-r from-transparent via-muted-foreground/10 to-transparent" />
                        <div className="p-3 bg-muted/20 text-muted-foreground/50 rounded-xl">
                            <Lock className="w-5 h-5" />
                        </div>
                        <div className="space-y-1">
                            <h5 className="text-label-sm font-bold text-foreground uppercase flex items-center gap-2 justify-center">
                                {t('movement_analytics')}
                                <Badge variant="secondary" className="text-[10px] py-0 px-2 h-4.5 bg-muted/30 text-muted-foreground/80 font-bold uppercase rounded-sm">
                                    {t('phase_2')}
                                </Badge>
                            </h5>
                            <p className="text-label-xs text-muted-foreground/50 leading-relaxed max-w-3xl">
                                {t('movement_analytics_desc')}
                            </p>
                        </div>
                    </div>

                    {/* Audit Logs */}
                    <div className="h-56 rounded-2xl bg-card border border-border relative overflow-hidden min-w-0">
                        <div className="absolute top-0 start-0 w-full h-[3px] bg-gradient-to-r from-transparent via-operational-cyan/30 to-transparent" />
                        {hasAuditAccess ? (
                            loadingAuditLogs ? (
                                <div className="flex flex-col items-center justify-center gap-2 h-full">
                                    <Loader2 className="w-6 h-6 animate-spin text-operational-cyan" />
                                    <span className="text-label-xxs font-semibold text-muted-foreground/40 uppercase tracking-widest">{tc('loading')}</span>
                                </div>
                            ) : auditLogs.length === 0 ? (
                                <div className="flex flex-col items-center justify-center gap-2 h-full text-center p-4">
                                    <History className="w-8 h-8 text-muted-foreground/20" />
                                    <span className="text-label-xs font-bold text-foreground">{t('audit_logs')}</span>
                                    <p className="text-label-xs text-muted-foreground/60 leading-normal max-w-[180px]">
                                        {t('audit_logs_empty')}
                                    </p>
                                </div>
                            ) : (
                                <div className="flex flex-col h-full p-5 justify-between">
                                    <div className="space-y-3 min-w-0">
                                        <h5 className="text-label-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                                            <History className="w-3.5 h-3.5 text-operational-cyan" />
                                            {t('audit_logs')}
                                        </h5>
                                        <div className="space-y-2 min-w-0">
                                            {auditLogs.slice(0, 3).map((log: AuditLogRow) => (
                                                <div key={log.id} className="flex items-center justify-between py-1.5 border-b border-border/40 last:border-b-0 text-label-xs min-w-0 gap-2">
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="font-bold text-foreground uppercase truncate">{log.action}: {log.entityType}</span>
                                                        <span className="text-[10px] text-muted-foreground/60 truncate">{log.userName}</span>
                                                    </div>
                                                    <span className="text-[10px] text-muted-foreground/40 font-mono shrink-0">
                                                        {new Date(log.createdAt).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <Link href="/admin/audit-logs" className="mt-2 shrink-0">
                                        <Button variant="ghost" size="sm" className="w-full h-8 text-[10px] font-bold uppercase text-muted-foreground/60 hover:text-operational-cyan hover:bg-operational-cyan/5 rounded-lg">
                                            {t('audit.view_all')}
                                        </Button>
                                    </Link>
                                </div>
                            )
                        ) : (
                            <div className="flex flex-col items-center justify-center gap-3 p-6 text-center select-none h-full justify-center">
                                <div className="p-3 bg-muted/20 text-muted-foreground/50 rounded-xl">
                                    <Lock className="w-5 h-5" />
                                </div>
                                <div className="space-y-1">
                                    <h5 className="text-label-sm font-bold text-foreground uppercase flex items-center gap-2 justify-center">
                                        {t('audit_logs')}
                                        <Badge variant="secondary" className="text-[10px] py-0 px-2 h-4.5 bg-muted/30 text-muted-foreground/80 font-bold uppercase rounded-sm">
                                            {t('coming_soon')}
                                        </Badge>
                                    </h5>
                                    <p className="text-label-xs text-muted-foreground/50 leading-relaxed max-w-[200px]">
                                        {t('audit_logs_empty')}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
