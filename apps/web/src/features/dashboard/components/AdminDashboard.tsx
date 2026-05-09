'use client';

import { useTranslations } from 'next-intl';
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
 LayoutDashboard
} from 'lucide-react';
import { KPICard } from './KPICard';
import { NearExpiryWidget } from './NearExpiryWidget';
import { PendingDocumentsWidget } from './PendingDocumentsWidget';
import { formatCurrency, formatNumber } from '@/utils/currency';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { useLocale } from '@/hooks/useLocale';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { PermissionGate } from '@/components/shared/PermissionGate';

export function AdminDashboard() {
 const t = useTranslations('dashboard');
 const tc = useTranslations('common');
 const { locale } = useLocale();

 // Mock data for Admin
 const stats = {
 totalStockValue: 1245300.50,
 baseCurrency: 'SAR',
 pendingPRs: 7,
 activeStocktakes: 2,
 lowStockItems: 14,
 systemHealth: 98.4,
 activeUsers: 24,
 lastBackup: '2h ago',
 nearExpiryCount: 12,
 };

 return (
 <div className="space-y-10">
 {/* KPI Grid */}
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
 accent="cyan"
 description={t('kpi.warehouse_locked')}
 />
 <KPICard
 title={t('kpi.low_stock')}
 value={formatNumber(stats.lowStockItems, locale as 'ar' | 'en')}
 icon={AlertTriangle}
 accent="red"
 description={t('kpi.reorder_suggested')}
 />
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
 {/* System Health & Audit Column */}
 <div className="lg:col-span-1 space-y-8">
 <Card className="bg-surface-container-lowest border-none rounded-3xl overflow-hidden relative group">
 <div className="absolute top-0 end-0 w-32 h-32 bg-operational-cyan/5 blur-[60px] rounded-full -me-16 -mt-16 group-hover:bg-operational-cyan/10 transition-colors duration-700" />
 <CardHeader className="pb-2">
 <div className="flex items-center justify-between mb-2">
 <span className="text-label-xs font-semibold uppercase text-operational-cyan">{t('system_health.title')}</span>
 <Badge variant="outline" className="bg-status-success/10 text-status-success border-status-success/20 text-label-xxs font-semibold uppercase">
 <ShieldCheck className="w-2.5 h-2.5 me-1" />
 {t('system_health.optimal')}
 </Badge>
 </div>
 <CardTitle className="text-headline-lg font-semibold uppercase italic">{stats.systemHealth}% {t('system_health.health_suffix')}</CardTitle>
 <CardDescription className="text-label-xs font-medium text-muted-foreground/60 uppercase">{t('system_health.node_description')}</CardDescription>
 </CardHeader>
 <CardContent className="space-y-6 pt-4">
 <div className="h-1.5 w-full bg-muted/20 rounded-full overflow-hidden">
 <div className="h-full bg-gradient-to-r from-operational-cyan to-operational-cyan/60 w-[98.4%]" />
 </div>
 <div className="grid grid-cols-2 gap-4">
 <div className="p-3 bg-surface-container-low rounded-xl border-none space-y-1">
 <span className="text-label-xxs font-semibold text-muted-foreground/40 uppercase flex items-center gap-1.5">
 <Database className="w-3 h-3" /> {t('system_health.backup')}
 </span>
 <span className="text-label-sm font-bold text-foreground">{stats.lastBackup}</span>
 </div>
 <div className="p-3 bg-surface-container-low rounded-xl border-none space-y-1">
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

 <Card className="bg-surface-container-lowest border-none rounded-3xl overflow-hidden group">
 <CardHeader className="pb-4">
 <div className="flex items-center justify-between">
 <span className="text-label-xs font-semibold uppercase text-muted-foreground/40 flex items-center gap-2">
 <History className="w-3 h-3" /> 
 {t('audit.title')}
 </span>
 <Link href="/reports">
 <Button variant="ghost" size="sm" className="h-6 text-label-xxs font-semibold uppercase text-muted-foreground/40 hover:text-operational-cyan">
 View All
 </Button>
 </Link>
 </div>
 <CardTitle className="text-title-sm font-semibold uppercase mt-2">{t('audit.subtitle')}</CardTitle>
 </CardHeader>
 <CardContent className="p-0">
 <div className="divide-y divide-transparent">
 {[
 { action: 'Updated SKU: M102-SA', user: 'Admin. Mansour', time: '12m ago', type: 'catalog' },
 { action: 'Role Mutation: INV_MGR', user: 'System', time: '1h ago', type: 'security' },
 { action: 'Branch Sync Complete', user: 'Node_JED', time: '3h ago', type: 'system' },
 ].map((log, i) => (
 <div key={i} className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors group cursor-pointer">
 <div className="flex flex-col gap-0.5">
 <span className="text-label-xs font-bold text-foreground group-hover:text-operational-cyan transition-colors">{log.action}</span>
 <span className="text-label-xxs font-medium text-muted-foreground/40">{log.user}</span>
 </div>
 <span className="text-label-xxs font-semibold text-muted-foreground/30 uppercase font-mono">{log.time}</span>
 </div>
 ))}
 </div>
 </CardContent>
 </Card>
 </div>

 {/* Operational Monitoring */}
 <div className="lg:col-span-2 space-y-8">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
 <PendingDocumentsWidget locale={locale} />
 <NearExpiryWidget locale={locale} />
 </div>
 
 <Card className="bg-surface-container-lowest border-none rounded-3xl relative overflow-hidden">
 <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(var(--primary-rgb),0.05),transparent_70%)]" />
 <CardHeader className="flex flex-row items-center justify-between pb-6">
 <div>
 <span className="text-label-xs font-semibold uppercase text-operational-cyan mb-1 block">{t('analytics.title')}</span>
 <CardTitle className="text-headline-lg font-semibold uppercase italic">{t('analytics.velocity')}</CardTitle>
 </div>
 <PermissionGate action="view" resource="reports">
 <Link href="/reports">
 <Button variant="outline" size="sm" className="bg-muted/10 border-border-surface text-label-xs font-semibold uppercase px-4 h-8 rounded-xl hover:bg-operational-cyan hover:text-black hover:border-operational-cyan transition-all">
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
 </div>
 </div>
 </div>
 );
}

