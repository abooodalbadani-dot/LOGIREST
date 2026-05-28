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
import { NearExpiryWidget } from '@/features/dashboard/components/NearExpiryWidget';
import { PendingDocumentsWidget } from '@/features/dashboard/components/PendingDocumentsWidget';
import { useBaseCurrency } from '@/hooks/useBaseCurrency';

export default function DashboardClient() {
 const t = useTranslations('dashboard');
 const tc = useTranslations('common');
 const { locale } = useLocale();
  const { user } = useAuth();
  const { currency: baseCurrency } = useBaseCurrency();

 // Mock static data as per Phase 8 planning
 const stats = {
 totalStockValue: 1245300.50,
 baseCurrency: baseCurrency,
 pendingPRs: 7,
 activeStocktakes: 2,
 lowStockItems: 14,
 systemHealth: 98.4,
 activeUsers: 24,
 lastBackup: '2h ago',
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
 return <StoreManagerDashboard />;
 default:
 // Generic fallback dashboard (previous content)
 return (
 <div className="space-y-10">
 {/* KPI Section */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
 <KPICard
 title={t('kpi.total_stock')}
 value={formatCurrency(stats.totalStockValue, stats.baseCurrency, locale as 'ar' | 'en')}
 icon={Package}
 accent="cyan"
 trend={{ value: '12%', isPositive: true }}
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
 trend={{ value: '4', isPositive: false }}
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
 {canSeeApprovals && <PendingDocumentsWidget locale={locale} />}
 </div>
 </div>
 </div>
 );
 }
 };

 return (
 <div className="p-8 max-w-[1600px] mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000 pb-20">
 <PageHeader 
 title={t('title')} 
 description={`${t('description')} - ${user?.role || 'User'}`}
 className="pb-10"
 actions={
 <div className="flex items-center gap-4 bg-surface-container-low p-4 rounded-xl border border-surface-container-high/20 shadow-sm">
 <div className="flex flex-col gap-1 pe-4 border-e border-surface-container-high/50">
 <span className="text-label-xs font-semibold uppercase text-muted-foreground/60 flex items-center gap-2">
 <Activity className="w-3 h-3 text-operational-cyan" />
 {tc('system_stats.live_updates')}
 </span>
 <div className="flex items-center gap-2">
 <div className="h-1.5 w-32 bg-surface-container-high rounded-full overflow-hidden">
 <div className="h-full bg-operational-cyan w-[98%] shadow-[0_0_8px_rgba(var(--primary-rgb),0.5)]" />
 </div>
 <span className="text-label-xs font-bold text-foreground">{stats.systemHealth}%</span>
 </div>
 </div>
 
 <div className="flex flex-col gap-0.5">
 <div className="flex items-center gap-2">
 <Badge variant="outline" className="bg-status-success/10 text-status-success border-status-success/20 text-label-xxs font-semibold h-5 px-1.5 uppercase">
 <ShieldCheck className="w-2.5 h-2.5 me-1" />
 {t('secure')}
 </Badge>
 <span className="text-label-xxs font-bold text-muted-foreground/40 uppercase">
 {tc('system_stats.last_sync')}: <ClientOnlyTime className="inline" locale={locale as 'ar' | 'en'} />
 </span>
 </div>
 <div className="flex items-center gap-3 mt-1">
 <div className="flex items-center gap-1.5">
 <Database className="w-3 h-3 text-muted-foreground/60" />
 <span className="text-label-xs font-bold text-muted-foreground/60">Backup: {stats.lastBackup}</span>
 </div>
 <div className="flex items-center gap-1.5">
 <Users className="w-3 h-3 text-muted-foreground/60" />
 <span className="text-label-xs font-bold text-muted-foreground/60">{t('users_online', { count: stats.activeUsers })}</span>
 </div>
 </div>
 </div>
 </div>
 }
 />

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
 <div className="lg:col-span-2 h-56 rounded-2xl bg-surface-container-low border border-dashed border-surface-container-high flex flex-col items-center justify-center gap-4">
 <Activity className="w-8 h-8 text-muted-foreground/40" />
 <span className="text-muted-foreground/60 italic text-label-xs font-semibold uppercase">{t('movement_analytics_placeholder')}</span>
 </div>
 <div className="h-56 rounded-2xl bg-surface-container-low border border-dashed border-surface-container-high flex flex-col items-center justify-center gap-4">
 <Activity className="w-8 h-8 text-muted-foreground/40" />
 <span className="text-muted-foreground/60 italic text-label-xs font-semibold uppercase">{t('audit_logs_placeholder')}</span>
 </div>
 </div>
 </div>
 </div>
 );
}
