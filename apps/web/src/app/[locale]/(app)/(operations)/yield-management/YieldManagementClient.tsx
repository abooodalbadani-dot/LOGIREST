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

interface YieldItem {
  id: string;
  recipe_name: string;
  category: string;
  input_qty: number;
  output_qty: number;
  waste_qty: number;
  yield_pct: number;
  standard_yield: number;
  efficiency: number;
}

const MOCK_YIELD_DATA: YieldItem[] = [
  {
    id: '1',
    recipe_name: 'mock.recipes.ribeye',
    category: 'mock.categories.protein',
    input_qty: 25.0,
    output_qty: 18.5,
    waste_qty: 6.5,
    yield_pct: 74,
    standard_yield: 75,
    efficiency: 98.6
  },
  {
    id: '2',
    recipe_name: 'mock.recipes.pasta',
    category: 'mock.categories.starch',
    input_qty: 10.0,
    output_qty: 9.8,
    waste_qty: 0.2,
    yield_pct: 98,
    standard_yield: 97,
    efficiency: 101.0
  },
  {
    id: '3',
    recipe_name: 'mock.recipes.asparagus',
    category: 'mock.categories.vegetable',
    input_qty: 15.0,
    output_qty: 11.2,
    waste_qty: 3.8,
    yield_pct: 74.6,
    standard_yield: 80,
    efficiency: 93.2
  },
  {
    id: '4',
    recipe_name: 'mock.recipes.puree',
    category: 'mock.categories.prep',
    input_qty: 5.0,
    output_qty: 3.2,
    waste_qty: 1.8,
    yield_pct: 64,
    standard_yield: 65,
    efficiency: 98.4
  }
];

export function YieldManagementClient() {
  const t = useTranslations('yield_management');
  const tc = useTranslations('common');
  
  const [data, setData] = useState<YieldItem[]>(MOCK_YIELD_DATA);
  const [activeForm, setActiveForm] = useState({
    input: 0,
    output: 0,
    waste: 0
  });

  const stats = useMemo(() => {
    const avgYield = data.reduce((acc, item) => acc + item.yield_pct, 0) / data.length;
    const totalWaste = data.reduce((acc, item) => acc + item.waste_qty, 0);
    const avgEfficiency = data.reduce((acc, item) => acc + item.efficiency, 0) / data.length;
    
    return {
      avgYield,
      totalWaste,
      avgEfficiency,
      productionRuns: 124
    };
  }, [data]);

  const columns: ColumnDef<YieldItem, unknown>[] = [
    {
      accessorKey: 'recipe_name',
      header: tc('name'),
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-semibold text-foreground">{t(row.original.recipe_name as Parameters<typeof t>[0])}</span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{t(row.original.category as Parameters<typeof t>[0])}</span>
        </div>
      ),
    },
    {
      accessorKey: 'input_qty',
      header: t('input_qty'),
      cell: ({ row }) => <span className="tabular-nums font-medium">{row.original.input_qty} kg</span>,
    },
    {
      accessorKey: 'output_qty',
      header: t('output_qty'),
      cell: ({ row }) => <span className="tabular-nums text-emerald-400 font-bold">{row.original.output_qty} kg</span>,
    },
    {
      accessorKey: 'waste_qty',
      header: t('waste_qty'),
      cell: ({ row }) => <span className="tabular-nums text-rose-400 opacity-80">{row.original.waste_qty} kg</span>,
    },
    {
      accessorKey: 'yield_pct',
      header: t('yield_percentage'),
      cell: ({ row }) => {
        const val = row.original.yield_pct;
        const std = row.original.standard_yield;
        const isLow = val < std;
        return (
          <div className="flex items-center gap-2">
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
          <div className="h-2 w-24 bg-white/5 rounded-full overflow-hidden">
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
          <Button className="h-11 px-8 bg-primary hover:bg-primary/90 text-primary-foreground text-label-xs font-bold uppercase rounded-sm transition-all shadow-lg shadow-primary/20">
            <ClipboardList className="w-3.5 h-3.5 me-2" />
            {t('new_batch')}
          </Button>
        }
      />

      {/* KPI Section */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <MetricCard
          label={t('yield_percentage')}
          value={`${stats.avgYield.toFixed(1)}%`}
          icon={TrendingUp}
          color="emerald"
        />
        <MetricCard
          label={t('efficiency_score')}
          value={`${stats.avgEfficiency.toFixed(1)}%`}
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
          value={`${stats.totalWaste.toFixed(1)} kg`}
          icon={Trash2}
          color="rose"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Quick Insights & Analysis */}
        <div className="lg:col-span-1 space-y-8">
          <div className="p-6 rounded-sm bg-surface-container-low border border-white/5 shadow-xl space-y-6">
            <h3 className="text-label-xs font-bold uppercase text-muted-foreground/50 tracking-widest flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              {t('bottlenecks')}
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-rose-500/5 rounded-sm border border-rose-500/10">
                <div className="flex flex-col">
                  <span className="text-sm font-semibold">{t('mock.recipes.asparagus')}</span>
                  <span className="text-[10px] text-rose-400">{t('vs_standard', { value: '-5.4%' })}</span>
                </div>
                <ArrowDownRight className="w-4 h-4 text-rose-400" />
              </div>
              <div className="flex items-center justify-between p-3 bg-amber-500/5 rounded-sm border border-amber-500/10">
                <div className="flex flex-col">
                  <span className="text-sm font-semibold">{t('mock.recipes.puree')}</span>
                  <span className="text-[10px] text-amber-400">{t('vs_standard', { value: '-1.0%' })}</span>
                </div>
                <ArrowDownRight className="w-4 h-4 text-amber-400" />
              </div>
            </div>
          </div>

          <div className="p-6 rounded-sm bg-surface-container-low border border-white/5 shadow-xl space-y-6">
            <h3 className="text-label-xs font-bold uppercase text-muted-foreground/50 tracking-widest flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              {t('top_performers')}
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-emerald-500/5 rounded-sm border border-emerald-500/10">
                <div className="flex flex-col">
                  <span className="text-sm font-semibold">{t('mock.recipes.pasta')}</span>
                  <span className="text-[10px] text-emerald-400">{t('vs_standard', { value: '+4.0%' })}</span>
                </div>
                <ArrowUpRight className="w-4 h-4 text-emerald-400" />
              </div>
            </div>
          </div>
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
