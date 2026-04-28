'use client';

import { useTranslations } from 'next-intl';
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
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-status-success block mb-2 opacity-80">Logistics & fulfillment</span>
          <h2 className="text-6xl font-black tracking-tighter uppercase italic text-foreground leading-none">
            Operational <span className="text-status-success drop-shadow-[0_0_15px_rgba(var(--status-success-rgb),0.3)]">Control</span>
          </h2>
          <div className="flex items-center gap-3">
            <div className="h-[2px] w-12 bg-status-success" />
            <p className="text-[11px] text-muted-foreground font-black uppercase tracking-[0.2em]">Central Warehouse • JED-01</p>
          </div>
        </div>
        <div className="flex gap-4">
          <PermissionGate action="view" resource="operations_stocktake">
            <Button variant="outline" className="border border-white/10-muted/40 bg-surface-container-low/50 backdrop-blur-md rounded-xl h-14 px-8 font-black uppercase tracking-[0.2em] text-[11px] hover:bg-status-success hover:text-black hover:border-status-success transition-all shadow-lg hover:shadow-[0_0_30px_rgba(var(--status-success-rgb),0.2)]">
              Inventory Audit
            </Button>
          </PermissionGate>
          <PermissionGate action="create" resource="operations_issues">
            <Button className="bg-status-success hover:bg-status-success/90 text-black font-black uppercase tracking-[0.2em] px-10 rounded-xl h-14 shadow-[0_12px_24px_-8px_rgba(var(--status-success-rgb),0.5)] transition-all active:scale-[0.98]">
              Batch Issue
            </Button>
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
          className="shadow-xl"
        />
        <KPICard
          title="Stock Shortages"
          value={formatNumber(stats.shortages, locale as 'ar' | 'en')}
          icon={AlertCircle}
          accent="red"
          description="Awaiting Procurement"
          className="shadow-xl"
        />
        <KPICard
          title="Warehouse Load"
          value={`${stats.warehouseCapacity}%`}
          icon={Warehouse}
          accent="amber"
          description="Storage Capacity Usage"
          className="shadow-xl"
        />
        <KPICard
          title="Asset Value"
          value={formatCurrency(stats.totalValue, 'SAR', locale as 'ar' | 'en')}
          icon={Layers}
          accent="cyan"
          description="On-hand stock valuation"
          className="shadow-xl"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Fulfillment Queue - Direct & Industrial */}
        <Card className="lg:col-span-2 bg-surface-container-low/50 backdrop-blur-md border-white/10-muted/20 rounded-2xl shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-status-success opacity-40 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="flex flex-row items-center justify-between border-b border-white/10-muted/10 pb-6">
            <div>
              <CardTitle className="text-2xl font-black tracking-tighter uppercase italic text-foreground">Fulfillment Queue</CardTitle>
              <CardDescription className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-[0.25em] mt-1.5">Real-time Stock Allocation (FEFO-Guided)</CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2.5">
                {[1,2,3].map(i => <div key={i} className="w-9 h-9 rounded-full border-2 border-surface-container-low bg-surface-container-high shadow-inner" />)}
              </div>
              <span className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest">+4 more</span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-white/5">
              {[
                { id: 'IS-90021', dest: 'Main Kitchen', items: 14, urgency: 'Urgent', status: 'Allocating' },
                { id: 'TR-44023', dest: 'Branch B2', items: 45, urgency: 'Normal', status: 'Pending' },
                { id: 'IS-90025', dest: 'Pastry Dept', items: 8, urgency: 'Normal', status: 'Ready' },
              ].map((job, i) => (
                <div key={i} className="p-6 flex items-center justify-between hover:bg-surface-container-low/40 transition-all cursor-pointer group">
                  <div className="flex items-center gap-6">
                    <div className="flex flex-col items-center justify-center w-14 h-14 bg-surface-container-lowest border border-white/10-muted/20 rounded-xl font-mono text-xs font-black shadow-sm group-hover:border-operational-cyan/40 group-hover:shadow-[0_0_15px_rgba(var(--operational-cyan-rgb),0.1)] transition-all">
                       <span className="opacity-20 text-[8px] mb-1">ID</span>
                       {job.id.split('-')[1]}
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-black text-foreground uppercase tracking-tight">{job.dest}</span>
                        <Badge className={`rounded-md text-[8px] font-black uppercase tracking-widest px-2 py-0.5 border-none ${
                          job.urgency === 'Urgent' ? 'bg-status-error text-black animate-pulse' : 'bg-surface-container-high text-muted-foreground'
                        }`}>
                          {job.urgency}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground/60 font-bold uppercase tracking-[0.15em]">
                        {job.items} items • {job.id.startsWith('IS') ? 'Direct Issue' : 'Transfer Request'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-8">
                      <div className="hidden md:flex flex-col items-end gap-1.5">
                        <span className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] italic">FEFO Status</span>
                        <div className="flex gap-1">
                           <div className="w-4 h-1 bg-status-success" />
                           <div className="w-4 h-1 bg-status-success" />
                           <div className="w-4 h-1 bg-outline-medium" />
                        </div>
                     </div>
                      <PermissionGate action="edit" resource="operations_issues">
                        <Button variant="ghost" className="rounded-xl border border-white/10-muted/20 h-11 w-11 p-0 hover:bg-status-success hover:text-black transition-all hover:scale-105">
                          <ArrowRightLeft className="w-4 h-4" />
                        </Button>
                      </PermissionGate>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Warehouse Efficiency / FEFO Watch */}
        <div className="space-y-6">
          <Card className="bg-surface-container-low/50 backdrop-blur-md border-white/10-muted/20 rounded-2xl shadow-xl relative group overflow-hidden">
            <div className="absolute bottom-0 left-0 w-full h-[3px] bg-status-success scale-x-0 group-hover:scale-x-100 transition-transform duration-500 shadow-[0_0_15px_rgba(var(--status-success-rgb),0.5)]" />
            <CardHeader className="pb-3">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-status-success flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 fill-current" /> FEFO Boundary
              </span>
              <CardTitle className="text-xl font-black tracking-tight uppercase italic text-foreground">Expiring Stock</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 pt-2">
               {[
                 { item: 'Tomato Paste 5kg', days: 4, batch: 'B-992' },
                 { item: 'Whole Milk 1L', days: 7, batch: 'B-102' },
                 { item: 'Fresh Cream', days: 2, batch: 'B-041' },
               ].map((item, i) => (
                 <div key={i} className="flex flex-col gap-1.5 border-s-2 border-white/10-muted/20 ps-4 hover:border-status-success transition-colors group/item">
                   <div className="flex items-center justify-between">
                     <span className="text-[11px] font-black text-foreground group-hover/item:text-status-success transition-colors uppercase tracking-tight">{item.item}</span>
                     <span className={`text-[9px] font-black px-2 py-0.5 rounded ${item.days < 3 ? 'bg-status-error/10 text-status-error' : 'bg-status-warning/10 text-status-warning'} uppercase tracking-widest`}>{item.days}d Left</span>
                   </div>
                   <span className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-[0.2em]">Batch {item.batch} • Location A1-4</span>
                 </div>
               ))}
               <PermissionGate action="create" resource="operations_adjustments">
                 <Button className="w-full bg-surface-container-high hover:bg-status-success hover:text-black border-none rounded-xl text-[10px] font-black uppercase tracking-[0.3em] h-12 mt-4 shadow-sm transition-all active:scale-[0.98]">
                    Generate Disposal Log
                 </Button>
               </PermissionGate>
            </CardContent>
          </Card>

          <Card className="bg-surface-container-low/50 backdrop-blur-md border-white/10-muted/20 rounded-2xl shadow-xl overflow-hidden group">
            <CardHeader className="pb-4">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/40 flex items-center gap-2">
                <BarChart3 className="w-3.5 h-3.5" /> Efficiency
              </span>
              <CardTitle className="text-xl font-black tracking-tight uppercase italic text-foreground">Stock Velocity</CardTitle>
            </CardHeader>
            <CardContent className="h-36 flex flex-col items-center justify-center gap-5 border-t border-white/10-muted/10 bg-surface-container-lowest/20">
                <div className="flex items-end gap-1.5 h-14">
                   {[40, 70, 45, 90, 65, 80, 55].map((h, i) => (
                     <div key={i} className="w-2.5 bg-status-success/10 hover:bg-status-success group-hover:bg-status-success/30 transition-all cursor-pointer rounded-t-sm" style={{ height: `${h}%` }} />
                   ))}
                </div>
                <span className="text-[9px] font-black text-muted-foreground/30 uppercase tracking-[0.4em]">Week 17 Throughput</span>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
