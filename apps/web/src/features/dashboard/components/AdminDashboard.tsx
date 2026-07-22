'use client';

import { useState } from 'react';
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
  BarChart3,
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
import { useAuth } from '@/providers/AuthProvider';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { PageHeader } from '@/components/shared/PageHeader';

export function AdminDashboard() {
  const [hoveredPoint, setHoveredPoint] = useState<{
    x: number;
    y: number;
    value: number;
    label: string;
  } | null>(null);

  const { user, activeScope } = useAuth();
  const { data: settings, isLoading: loadingSettings } = useAdminSettings();
  const { data: stats, isLoading: loadingStats, error } = useDashboardStats();
  const t = useTranslations('dashboard');
  const tc = useTranslations('common');
  const { locale } = useLocale();

  const activeWarehouseName = user?.scopes?.find((s) => s.warehouseId === activeScope.warehouseId)?.warehouse?.name;

  if (loadingSettings || loadingStats) {
    return <PageSkeleton />;
  }

  if (error || !stats) {
    return <div className="p-8 text-status-error uppercase font-bold">{t('error_loading')}</div>;
  }

  // Additional derived info
  let lastBackupTime = tc('no_data');
  if (stats.lastBackupTimestamp) {
    const diffHours = Math.abs(new Date().getTime() - new Date(stats.lastBackupTimestamp).getTime()) / 36e5;
    if (diffHours < 1) {
      lastBackupTime = tc('time_ago.minutes', { count: Math.floor(diffHours * 60) || 1 });
    } else if (diffHours < 24) {
      lastBackupTime = tc('time_ago.hours', { count: Math.floor(diffHours) });
    } else {
      lastBackupTime = tc('time_ago.days', { count: Math.floor(diffHours / 24) });
    }
  }

  // Localized month labels for the last 6 months
  const getMonthLabels = (loc: string) => {
    const labels = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      try {
        labels.push(d.toLocaleDateString(loc, { month: 'short' }));
      } catch {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        labels.push(months[d.getMonth()]);
      }
    }
    return labels;
  };

  const velocityData = stats.efficiencyMetrics?.velocityChart || [];
  const isEmpty = velocityData.length === 0 || velocityData.every((v) => v === 0);
  const monthLabels = getMonthLabels(locale);

  const points = velocityData.map((v, i) => {
    const x = 40 + i * 88;
    const y = 130 - (v / 100) * 110;
    return { x, y, value: v, label: monthLabels[i] || '' };
  });

  const linePath = points.reduce(
    (acc, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`),
    '',
  );
  const areaPath = points.length
    ? `${linePath} L ${points[points.length - 1].x} 130 L ${points[0].x} 130 Z`
    : '';

  return (
    <main role="main" className="space-y-10">
      {/* Admin Header */}
      <PageHeader
        title={t('title')}
        highlight={t('kitchen.overview')}
        subtitle={
          <div className="flex items-center gap-2 mb-2">
            <Badge className="bg-operational-cyan/10 text-operational-cyan border-none text-label-xs font-semibold uppercase">
              {tc('role.admin')}
            </Badge>
          </div>
        }
      />

      {/* KPI Grid */}
      <section className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-6" aria-labelledby="kpi-grid-title">
        <h2 id="kpi-grid-title" className="sr-only">{t('aria.kpi_grid')}</h2>
        <KPICard
          title={t('kpi.total_stock')}
          value={formatCurrency(stats.totalValue, stats.currency, locale as 'ar' | 'en')}
          icon={Package}
          accent="cyan"
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
                  <Button variant="outline" size="sm" className="px-6 py-2.5 bg-[#0B1220] text-white font-bold rounded-lg shadow-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                    {t('analytics.full_report')} <TrendingUp className="w-3 h-3 ms-2" />
                  </Button>
                </Link>
              </PermissionGate>
            </CardHeader>
            <CardContent className="h-[220px] flex items-center justify-center p-6 relative select-none">
              {loadingStats ? (
                <div className="text-center space-y-4">
                  <Activity className="w-12 h-12 text-muted-foreground/10 mx-auto animate-pulse" />
                  <span className="text-label-xs font-semibold text-muted-foreground/30 uppercase">{t('analytics.processing')}</span>
                </div>
              ) : error ? (
                <div className="text-center space-y-4 text-status-error">
                  <AlertTriangle className="w-12 h-12 mx-auto opacity-40 animate-bounce" />
                  <span className="text-label-xs font-semibold uppercase">{t('analytics.error')}</span>
                </div>
              ) : isEmpty ? (
                <div className="lg:col-span-2 h-56 rounded-2xl bg-muted/10 flex flex-col items-center justify-center gap-3 p-6 text-center select-none relative overflow-hidden group">
                  <BarChart3 className="w-12 h-12 text-muted-foreground/10 mx-2xl" />
                  <span className="text-label-xs font-semibold text-muted-foreground/30 uppercase text-center block max-w-3xl">{t('analytics.empty')}</span>
                </div>
              ) : (
                <div className="w-full h-full relative group/chart">
                  <svg
                    className="w-full h-full"
                    viewBox="0 0 500 160"
                    preserveAspectRatio="xMidYMid meet"
                    role="img"
                    aria-label="Stock Velocity Chart"
                  >
                    <defs>
                      <linearGradient id="cyanGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.00" />
                      </linearGradient>
                    </defs>

                    {/* Horizontal Grid Lines */}
                    <line x1="40" y1="20" x2="480" y2="20" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                    <line x1="40" y1="75" x2="480" y2="75" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                    <line x1="40" y1="130" x2="480" y2="130" stroke="rgba(255,255,255,0.12)" />

                    {/* Y-Axis Labels */}
                    <text x="30" y="24" textAnchor="end" fontSize="9" fontWeight="700" className="fill-muted-foreground/30 font-mono">100%</text>
                    <text x="30" y="79" textAnchor="end" fontSize="9" fontWeight="700" className="fill-muted-foreground/30 font-mono">50%</text>
                    <text x="30" y="134" textAnchor="end" fontSize="9" fontWeight="700" className="fill-muted-foreground/30 font-mono">0%</text>

                    {/* X-Axis Labels */}
                    {points.map((p, i) => (
                      <text
                        key={i}
                        x={p.x}
                        y="152"
                        textAnchor="middle"
                        fontSize="9"
                        fontWeight="700"
                        className="fill-muted-foreground/30 uppercase font-sans tracking-wider"
                      >
                        {p.label}
                      </text>
                    ))}

                    {/* Area Path */}
                    {areaPath && (
                      <path d={areaPath} fill="url(#cyanGradient)" className="transition-all duration-300" />
                    )}

                    {/* Line Path */}
                    {linePath && (
                      <path
                        d={linePath}
                        fill="none"
                        stroke="#06B6D4"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="drop-shadow-[0_0_8px_rgba(6,182,212,0.4)] transition-all duration-300"
                      />
                    )}

                    {/* Interactive Points */}
                    {points.map((p, i) => (
                      <g key={i} className="group/point">
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r="4.5"
                          className="fill-card stroke-[2.5px] stroke-operational-cyan transition-all duration-150 group-hover/point:r-[6px] group-hover/point:stroke-white cursor-pointer"
                        />
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r="16"
                          fill="transparent"
                          className="cursor-pointer"
                          onMouseEnter={() => setHoveredPoint(p)}
                          onMouseLeave={() => setHoveredPoint(null)}
                        />
                      </g>
                    ))}
                  </svg>

                  {/* Custom Tooltip */}
                  {hoveredPoint && (
                    <div
                      className="absolute z-10 bg-[#0B1220] border border-border/80 shadow-2xl rounded-xl px-3 py-2 flex flex-col pointer-events-none transition-all duration-140 ease-industrial text-label-xxs font-bold uppercase min-w-[70px] text-center"
                      style={{
                        left: `${(hoveredPoint.x / 500) * 100}%`,
                        top: `${(hoveredPoint.y / 160) * 100 - 15}%`,
                        transform: 'translate(-50%, -100%)',
                      }}
                    >
                      <span className="text-muted-foreground/50 tracking-wider font-sans">{hoveredPoint.label}</span>
                      <span className="text-operational-cyan text-label-xs font-extrabold mt-0.5 font-mono">{hoveredPoint.value}%</span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
