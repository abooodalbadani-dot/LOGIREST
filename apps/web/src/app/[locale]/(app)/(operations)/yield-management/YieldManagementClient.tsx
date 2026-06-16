'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { PrecisionTable } from '@/components/shared/PrecisionTable';
import { PageHeader } from '@/components/shared/PageHeader';
import { MetricCard } from '@/components/ui/metric-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
 TrendingUp, 
 Trash2, 
 Scale, 
 ClipboardList, 
 UtensilsCrossed, 
 AlertTriangle,
 ChevronRight,
 ArrowDownRight,
 ArrowUpRight
} from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import { useYieldList } from '@/features/operations/hooks/useYieldList';
import { type YieldBatch } from '@/features/operations/hooks/useYield';

export function YieldManagementClient() {
 const t = useTranslations('yield_management');
 const tc = useTranslations('common');
 
 const { data: yieldData, isLoading } = useYieldList();
 const data = yieldData || [];
 
 const [activeForm, setActiveForm] = useState({
  input: 0,
  output: 0,
  waste: 0
 });

 const stats = useMemo(() => {
  if (data.length === 0) {
   return { avgYield: 0, totalWaste: 0, avgEfficiency: 0, productionRuns: 0 };
  }
  const avgYield = data.reduce((acc, item) => acc + item.yieldPct, 0) / data.length;
  const totalWaste = data.reduce((acc, item) => acc + item.wasteQty, 0);
  const avgEfficiency = data.reduce((acc, item) => acc + item.efficiency, 0) / data.length;
  
  return {
   avgYield,
   totalWaste,
   avgEfficiency,
   productionRuns: data.length
  };
 }, [data]);

 const bottlenecks = useMemo(() => {
  return data
   .filter(item => item.efficiency < 100)
   .sort((a, b) => a.efficiency - b.efficiency)
   .slice(0, 3);
 }, [data]);

 const topPerformers = useMemo(() => {
  return data
   .filter(item => item.efficiency >= 100)
   .sort((a, b) => b.efficiency - a.efficiency)
   .slice(0, 3);
 }, [data]);

 const columns: ColumnDef<YieldBatch, unknown>[] = [
  {
   accessorKey: 'recipeName',
   header: tc('name'),
   cell: ({ row }) => (
    <div className="flex flex-col min-w-0">
     <span className="font-semibold text-foreground">{row.original.recipeName}</span>
     <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{row.original.category}</span>
    </div>
   ),
  },
  {
   accessorKey: 'inputQty',
   header: t('input_qty'),
   cell: ({ row }) => <span className="tabular-nums font-medium">{row.original.inputQty} kg</span>,
  },
  {
   accessorKey: 'outputQty',
   header: t('output_qty'),
   cell: ({ row }) => <span className="tabular-nums text-emerald-400 font-bold">{row.original.outputQty} kg</span>,
  },
  {
   accessorKey: 'wasteQty',
   header: t('waste_qty'),
   cell: ({ row }) => <span className="tabular-nums text-rose-400 opacity-80">{row.original.wasteQty} kg</span>,
  },
  {
   accessorKey: 'yieldPct',
   header: t('yield_percentage'),
   cell: ({ row }) => {
    const val = row.original.yieldPct;
    const std = row.original.standardYield;
    const isLow = val < std;
    return (
     <div className="gap-2 min-w-0 items-center flex-1 gap-6 flex-col flex w-full">
      <span className={`tabular-nums font-bold ${isLow ? 'text-amber-500' : 'text-emerald-500'}`}>
       {val}%
      </span>
      <span className="text-[10px] text-muted-foreground/50">(Std: {std}%)</span>
     </div>
    );
   },
  },
  {
   accessorKey: 'efficiency',
   header: t('efficiency_score'),
   cell: ({ row }) => {
    const val = row.original.efficiency;
    return (
     <div className="h-2 w-24 bg-card/5 rounded-full overflow-hidden">
      <div 
       className={`h-full transition-all duration-1000 ${val >= 100 ? 'bg-emerald-500' : val > 95 ? 'bg-cyan-500' : 'bg-rose-500'}`}
       style={{ width: `${Math.min(val, 100)}%` }}
      />
     </div>
    );
   },
  }
 ];

 return (
  <div className="p-8 max-w-[1600px] mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
   <PageHeader 
    title={t('title')} 
    description={t('subtitle')}
    actions={
     <Button className="h-11 px-8 bg-primary hover:bg-primary/90 text-primary-foreground text-label-xs font-bold uppercase rounded-sm transition-all shadow-sm shadow-primary/20">
      <ClipboardList className="w-3.5 h-3.5 me-2" />
      {t('new_batch')}
     </Button>
    }
   />

   {/* KPI Section */}
   <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
    <MetricCard
     label={t('yield_percentage')}
     value={stats.productionRuns > 0 ? `${stats.avgYield.toFixed(1)}%` : '-'}
     icon={TrendingUp}
     color="emerald"
    />
    <MetricCard
     label={t('efficiency_score')}
     value={stats.productionRuns > 0 ? `${stats.avgEfficiency.toFixed(1)}%` : '-'}
     icon={Scale}
     color="cyan"
    />
    <MetricCard
     label={t('production_runs')}
     value={stats.productionRuns.toString()}
     icon={UtensilsCrossed}
     color="amber"
    />
    <MetricCard
     label={t('waste_qty')}
     value={stats.productionRuns > 0 ? `${stats.totalWaste.toFixed(1)} kg` : '-'}
     icon={Trash2}
     color="rose"
    />
   </div>

   <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
    {/* Quick Insights & Analysis */}
    <div className="lg:col-span-1 space-y-8">
     {bottlenecks.length > 0 && (
      <div className="p-6 rounded-sm bg-card border border-border shadow-sm border border-white/5 shadow-xl space-y-6">
       <h3 className="text-label-xs font-bold uppercase text-muted-foreground/50 tracking-widest flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-500" />
        {t('bottlenecks')}
       </h3>
       <div className="space-y-4">
        {bottlenecks.map(item => (
         <div key={item.id} className="flex items-center justify-between p-3 bg-rose-500/5 rounded-sm border border-rose-500/10">
          <div className="flex flex-col min-w-0">
           <span className="text-sm font-semibold">{item.recipeName}</span>
           <span className="text-[10px] text-rose-400">{t('vs_standard', { value: `${(item.efficiency - 100).toFixed(1)}%` })}</span>
          </div>
          <ArrowDownRight className="w-4 h-4 text-rose-400" />
         </div>
        ))}
       </div>
      </div>
     )}

     {topPerformers.length > 0 && (
      <div className="p-6 rounded-sm bg-card border border-border shadow-sm border border-white/5 shadow-xl space-y-6">
       <h3 className="text-label-xs font-bold uppercase text-muted-foreground/50 tracking-widest flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-emerald-500" />
        {t('top_performers')}
       </h3>
       <div className="space-y-4">
        {topPerformers.map(item => (
         <div key={item.id} className="flex items-center justify-between p-3 bg-emerald-500/5 rounded-sm border border-emerald-500/10">
          <div className="flex flex-col min-w-0">
           <span className="text-sm font-semibold">{item.recipeName}</span>
           <span className="text-[10px] text-emerald-400">{t('vs_standard', { value: `+${(item.efficiency - 100).toFixed(1)}%` })}</span>
          </div>
          <ArrowUpRight className="w-4 h-4 text-emerald-400" />
         </div>
        ))}
       </div>
      </div>
     )}
    </div>

    {/* Main Performance Table */}
    <div className="lg:col-span-3 space-y-6">
     <div className="flex items-center justify-between">
      <h3 className="text-label-xs font-bold uppercase text-muted-foreground/50 tracking-widest">{t('recipe_yield_log')}</h3>
      <Button variant="ghost" size="sm" className="text-[10px] uppercase font-bold text-primary">
       {t('view_history')} <ChevronRight className="w-3 h-3 ms-1" />
      </Button>
     </div>
     <PrecisionTable 
      data={data} 
      columns={columns}
      collectionName="yield_runs"
     />
    </div>
   </div>
  </div>
 );
}
