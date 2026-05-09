'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { 
 Truck, 
 AlertCircle, 
 BarChart3, 
 ArrowRightLeft, 
 Zap, 
 Layers,
 Search,
 MoveDown,
 Warehouse
} from 'lucide-react';
import { KPICard } from './KPICard';
import { formatNumber, formatCurrency } from '@/utils/currency';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { useLocale } from '@/hooks/useLocale';
import { Button } from '@/components/ui/button';
import { PermissionGate } from '@/components/shared/PermissionGate';

export function StoreManagerDashboard() {
 const t = useTranslations('dashboard');
 const tc = useTranslations('common');
 const { locale } = useLocale();

 // Mock data for Store Manager
 const stats = {
 pendingFulfillment: 12,
 shortages: 5,
 warehouseCapacity: 78,
 totalValue: 842000,
 };

 return (
 <div className="space-y-10 animate-in fade-in duration-1000">
 {/* Store Manager Header - Industrial/Brutalist Style */}
 <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-s-4 border-status-success ps-6">
 <div className="space-y-2">
 <span className="text-label-xs font-semibold uppercase text-status-success block mb-2 opacity-80">Logistics & fulfillment</span>
 <h2 className="text-headline-lg font-semibold uppercase italic text-foreground leading-none">
 Operational <span className="text-status-success">Control</span>
 </h2>
 <div className="flex items-center gap-3">
 <div className="h-[2px] w-12 bg-status-success" />
 <p className="text-label-xs text-muted-foreground font-semibold uppercase">Central Warehouse • JED-01</p>
 </div>
 </div>
 <div className="flex gap-4">
 <PermissionGate action="view" resource="operations_stocktake">
 <Link href="/stocktake" className="contents">
 <Button variant="outline" className="border-none bg-surface-container-low rounded-xl h-14 px-8 font-semibold uppercase text-label-xs hover:bg-status-success hover:text-black transition-all">
 Inventory Audit
 </Button>
 </Link>
 </PermissionGate>
 <PermissionGate action="create" resource="operations_issues">
 <Link href="/issues/new" className="contents">
 <Button className="primary-gradient text-white font-semibold uppercase px-10 rounded-xl h-14 transition-all hover:scale-[0.98] hover:brightness-110 active:scale-95">
 Batch Issue
 </Button>
 </Link>
 </PermissionGate>
 </div>
 </div>

 {/* KPI Grid - Sharp Corners */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
 <KPICard
 title="Fulfillment Queue"
 value={formatNumber(stats.pendingFulfillment, locale as 'ar' | 'en')}
 icon={Truck}
 accent="cyan"
 description="Pending Issues & Transfers"
 
 />
 <KPICard
 title="Stock Shortages"
 value={formatNumber(stats.shortages, locale as 'ar' | 'en')}
 icon={AlertCircle}
 accent="red"
 description="Awaiting Procurement"
 
 />
 <KPICard
 title="Warehouse Load"
 value={`${stats.warehouseCapacity}%`}
 icon={Warehouse}
 accent="amber"
 description="Storage Capacity Usage"
 
 />
 <KPICard
 title="Asset Value"
 value={formatCurrency(stats.totalValue, 'SAR', locale as 'ar' | 'en')}
 icon={Layers}
 accent="cyan"
 description="On-hand stock valuation"
 
 />
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
 {/* Fulfillment Queue - Direct & Industrial */}
 <div className="lg:col-span-2 bg-surface-container-lowest border-none rounded-[2rem] relative overflow-hidden group transition-all duration-500">
 <div className="absolute top-0 start-0 w-2 h-full bg-status-success/20 group-hover:bg-status-success transition-all duration-500" />
 <div className="p-8 pb-4">
 <div className="flex items-center justify-between mb-8">
 <div>
 <h3 className="text-headline-lg font-semibold uppercase italic text-foreground leading-none">Fulfillment Queue</h3>
 <p className="text-label-xs font-semibold text-muted-foreground/30 uppercase mt-2">Real-time Stock Allocation (FEFO-Guided)</p>
 </div>
 <div className="flex items-center gap-3">
 <div className="flex -space-x-2.5">
 {[1,2,3].map(i => <div key={i} className="w-9 h-9 rounded-full border-none bg-surface-container-high" />)}
 </div>
 <span className="text-label-xs font-semibold text-muted-foreground/40 uppercase">+4 more</span>
 </div>
 </div>
 <div className="p-0">
 <div >
 {[
 { id: 'IS-90021', dest: 'Main Kitchen', items: 14, urgency: 'Urgent', status: 'Allocating' },
 { id: 'TR-44023', dest: 'Branch B2', items: 45, urgency: 'Normal', status: 'Pending' },
 { id: 'IS-90025', dest: 'Pastry Dept', items: 8, urgency: 'Normal', status: 'Ready' },
 ].map((job, i) => (
 <div key={i} className="px-8 py-6 flex items-center justify-between hover:bg-surface-container-low transition-all cursor-pointer group">
 <div className="flex items-center gap-8">
 <div className="flex flex-col items-center justify-center w-14 h-14 bg-surface-container-low border-none rounded-2xl font-mono text-label-sm font-semibold group-hover:bg-operational-cyan/10 transition-all duration-500">
 <span className="opacity-10 text-label-xxs mb-1">ID</span>
 {job.id.split('-')[1]}
 </div>
 <div className="space-y-2">
 <div className="flex items-center gap-4">
 <span className="text-body-md font-semibold text-foreground uppercase">{job.dest}</span>
 <Badge className={`rounded-lg text-label-xxs font-semibold uppercase px-2.5 py-1 border-none ${ job.urgency === 'Urgent' ? 'bg-status-error text-white animate-pulse' : 'bg-surface-container-high text-muted-foreground/60' }`}>
 {job.urgency}
 </Badge>
 </div>
 <p className="text-label-xs text-muted-foreground/30 font-semibold uppercase">
 {job.items} units • {job.id.startsWith('IS') ? 'Direct Issue' : 'Transfer Request'}
 </p>
 </div>
 </div>
 <div className="flex items-center gap-10">
 <div className="hidden md:flex flex-col items-end gap-2">
 <span className="text-label-xxs font-semibold text-muted-foreground/20 uppercase italic">FEFO Buffer</span>
 <div className="flex gap-1">
 <div className="w-5 h-1 bg-status-success rounded-full" />
 <div className="w-5 h-1 bg-status-success rounded-full" />
 <div className="w-5 h-1 bg-surface-container-high rounded-full" />
 </div>
 </div>
 <PermissionGate action="edit" resource="operations_issues">
 <Button variant="ghost" className="rounded-2xl border-none bg-surface-container-low h-12 w-12 p-0 hover:bg-status-success hover:text-black transition-all hover:scale-110 active:scale-95">
 <ArrowRightLeft className="w-4 h-4" />
 </Button>
 </PermissionGate>
 </div>
 </div>
 ))}
 </div>
 </div>
 </div>

 {/* Warehouse Efficiency / FEFO Watch */}
 <div className="space-y-8">
 <div className="bg-surface-container-lowest border-none rounded-[2rem] relative group overflow-hidden transition-all duration-500">
 <div className="absolute bottom-0 start-0 w-full h-1 bg-status-success scale-x-0 group-hover:scale-x-100 transition-transform duration-700 origin-left" />
 <div className="p-8 pb-4">
 <span className="text-label-xs font-semibold uppercase text-status-success flex items-center gap-2 mb-4">
 <Zap className="w-3.5 h-3.5 fill-current" /> FEFO Boundary
 </span>
 <h3 className="text-title-lg font-semibold uppercase italic text-foreground leading-none">Expiring Stock</h3>
 </div>
 <div className="p-8 pt-2 space-y-6">
 {[
 { item: 'Tomato Paste 5kg', days: 4, batch: 'B-992' },
 { item: 'Whole Milk 1L', days: 7, batch: 'B-102' },
 { item: 'Fresh Cream', days: 2, batch: 'B-041' },
 ].map((item, i) => (
 <div key={i} className="flex flex-col gap-2 border-s-2 border-surface-container-low ps-6 hover:border-status-success transition-all duration-300 group/item">
 <div className="flex items-center justify-between">
 <span className="text-label-xs font-semibold text-foreground group-hover/item:text-status-success transition-colors uppercase">{item.item}</span>
 <span className={`text-label-xxs font-semibold px-3 py-1 rounded-lg ${item.days < 3 ? 'bg-status-error/10 text-status-error' : 'bg-status-warning/10 text-status-warning'} uppercase`}>{item.days}d Left</span>
 </div>
 <span className="text-label-xxs font-semibold text-muted-foreground/30 uppercase">Batch {item.batch} • Location A1-4</span>
 </div>
 ))}
 <PermissionGate action="create" resource="operations_adjustments">
 <Link href="/adjustments/new" className="w-full">
 <Button className="w-full bg-surface-container-high hover:bg-status-success hover:text-black border-none rounded-2xl text-label-xs font-semibold uppercase h-14 mt-6 transition-all hover:scale-[0.98] hover:brightness-110 active:scale-95">
 Generate Disposal Log
 </Button>
 </Link>
 </PermissionGate>
 </div>
 </div>

 <div className="bg-surface-container-lowest border-none rounded-[2rem] overflow-hidden group transition-all duration-500">
 <div className="p-8 pb-4">
 <span className="text-label-xs font-semibold uppercase text-muted-foreground/20 flex items-center gap-2 mb-4">
 <BarChart3 className="w-3.5 h-3.5" /> Efficiency
 </span>
 <h3 className="text-title-lg font-semibold uppercase italic text-foreground leading-none">Stock Velocity</h3>
 </div>
 <div className="h-44 flex flex-col items-center justify-center gap-6 bg-surface-container-low/30 group-hover:bg-surface-container-low/50 transition-colors duration-700">
 <div className="flex items-end gap-2 h-16">
 {[40, 70, 45, 90, 65, 80, 55].map((h, i) => (
 <div key={i} className="w-3 bg-status-success/10 group-hover:bg-status-success/40 transition-all duration-700 cursor-pointer rounded-full" style={{ height: `${h}%` }} />
 ))}
 </div>
 <span className="text-label-xxs font-semibold text-muted-foreground/20 uppercase">Week 17 Throughput</span>
 </div>
 </div>
 </div>
 </div>
 </div>
 </div>
 );
}

