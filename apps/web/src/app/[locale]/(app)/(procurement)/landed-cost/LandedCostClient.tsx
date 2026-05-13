'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { PrecisionTable } from '@/components/shared/PrecisionTable';
import { PageHeader } from '@/components/shared/PageHeader';
import { MetricCard } from '@/components/ui/metric-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calculator, Ship, Percent, Receipt, Box, Coins } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';

interface LandedCostItem {
  id: string;
  sku: string;
  name: string;
  qty: number;
  base_unit_cost: number;
  weight_kg: number;
  volume_m3: number;
  total_base_cost: number;
  allocated_overhead: number;
  final_landed_cost: number;
}

const MOCK_ITEMS: LandedCostItem[] = [
  {
    id: '1',
    sku: 'RAW-FLOUR-01',
    name: 'Premium Wheat Flour',
    qty: 100,
    base_unit_cost: 5.5,
    weight_kg: 2500,
    volume_m3: 3.5,
    total_base_cost: 550,
    allocated_overhead: 0,
    final_landed_cost: 0,
  },
  {
    id: '2',
    sku: 'RAW-OIL-02',
    name: 'Olive Oil Extra Virgin',
    qty: 50,
    base_unit_cost: 45.0,
    weight_kg: 45,
    volume_m3: 0.1,
    total_base_cost: 2250,
    allocated_overhead: 0,
    final_landed_cost: 0,
  },
];

export function LandedCostClient() {
  const t = useTranslations('landed_cost');
  const tc = useTranslations('common');
  
  const [costs, setCosts] = useState({
    freight: 500,
    customs: 150,
    insurance: 50,
    other: 100,
  });
  
  const [allocationMethod, setAllocationMethod] = useState<'value' | 'weight' | 'volume'>('value');
  const [items, setItems] = useState<LandedCostItem[]>(MOCK_ITEMS);

  const totalOverhead = useMemo(() => 
    costs.freight + costs.customs + costs.insurance + costs.other, 
  [costs]);

  const stats = useMemo(() => {
    const totalBase = items.reduce((acc, item) => acc + item.total_base_cost, 0);
    return {
      totalBase,
      totalLanded: totalBase + totalOverhead,
      overheadRatio: totalBase > 0 ? (totalOverhead / totalBase) * 100 : 0
    };
  }, [items, totalOverhead]);

  const handleCalculate = () => {
    const totalBase = items.reduce((acc, item) => acc + item.total_base_cost, 0);
    const totalWeight = items.reduce((acc, item) => acc + item.weight_kg, 0);
    const totalVolume = items.reduce((acc, item) => acc + item.volume_m3, 0);

    const updatedItems = items.map(item => {
      let ratio = 0;
      if (allocationMethod === 'value' && totalBase > 0) {
        ratio = item.total_base_cost / totalBase;
      } else if (allocationMethod === 'weight' && totalWeight > 0) {
        ratio = item.weight_kg / totalWeight;
      } else if (allocationMethod === 'volume' && totalVolume > 0) {
        ratio = item.volume_m3 / totalVolume;
      }

      const allocated = totalOverhead * ratio;
      return {
        ...item,
        allocated_overhead: allocated,
        final_landed_cost: (item.total_base_cost + allocated) / item.qty
      };
    });

    setItems(updatedItems);
  };

  const columns: ColumnDef<LandedCostItem, unknown>[] = [
    {
      accessorKey: 'sku',
      header: tc('code'),
      cell: ({ row }) => <span className="font-mono text-label-xs font-bold text-muted-foreground">{row.original.sku}</span>,
    },
    {
      accessorKey: 'name',
      header: tc('name'),
      cell: ({ row }) => <span className="font-semibold">{row.original.name}</span>,
    },
    {
      accessorKey: 'qty',
      header: t('qty', { defaultValue: 'Qty' }),
      cell: ({ row }) => <span className="tabular-nums">{row.original.qty}</span>,
    },
    {
      accessorKey: 'total_base_cost',
      header: t('base_cost'),
      cell: ({ row }) => <span className="tabular-nums font-medium">{row.original.total_base_cost.toFixed(2)}</span>,
    },
    {
      accessorKey: 'allocated_overhead',
      header: t('handling', { defaultValue: 'Allocated' }),
      cell: ({ row }) => (
        <span className="tabular-nums text-primary font-bold">
          +{row.original.allocated_overhead.toFixed(2)}
        </span>
      ),
    },
    {
      accessorKey: 'final_landed_cost',
      header: t('unit_landed_cost'),
      cell: ({ row }) => (
        <span className="tabular-nums text-emerald-500 font-bold bg-emerald-500/10 px-2 py-1 rounded-sm border border-emerald-500/20">
          {row.original.final_landed_cost.toFixed(2)}
        </span>
      ),
    },
  ];

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <PageHeader 
        title={t('title')} 
        description={t('subtitle')}
        actions={
          <Button 
            onClick={handleCalculate}
            className="h-11 px-8 bg-primary hover:bg-primary/90 text-primary-foreground text-label-xs font-bold uppercase rounded-sm transition-all"
          >
            <Calculator className="w-3.5 h-3.5 me-2" />
            {t('calculate')}
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <MetricCard
          label={t('base_cost')}
          value={stats.totalBase.toFixed(2)}
          icon={Receipt}
          color="cyan"
        />
        <MetricCard
          label={t('total_landed')}
          value={stats.totalLanded.toFixed(2)}
          icon={Coins}
          color="emerald"
        />
        <MetricCard
          label={t('variance', { defaultValue: 'Overhead Ratio' })}
          value={`${stats.overheadRatio.toFixed(1)}%`}
          icon={Percent}
          color="amber"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Cost Controls */}
        <div className="lg:col-span-1 space-y-6 p-6 rounded-sm bg-surface-container-low border border-white/5 shadow-xl">
          <h3 className="text-label-xs font-bold uppercase text-muted-foreground/50 tracking-widest flex items-center gap-2">
            <Ship className="w-4 h-4 text-primary" />
            Operational Overhead
          </h3>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-label-xs uppercase opacity-70">{t('freight')}</Label>
              <Input 
                type="number" 
                value={costs.freight} 
                onChange={e => setCosts({...costs, freight: Number(e.target.value)})}
                className="bg-black/20 border-white/5 focus:ring-primary/20"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-label-xs uppercase opacity-70">{t('customs')}</Label>
              <Input 
                type="number" 
                value={costs.customs} 
                onChange={e => setCosts({...costs, customs: Number(e.target.value)})}
                className="bg-black/20 border-white/5 focus:ring-primary/20"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-label-xs uppercase opacity-70">{t('insurance')}</Label>
              <Input 
                type="number" 
                value={costs.insurance} 
                onChange={e => setCosts({...costs, insurance: Number(e.target.value)})}
                className="bg-black/20 border-white/5 focus:ring-primary/20"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-label-xs uppercase opacity-70">{t('other')}</Label>
              <Input 
                type="number" 
                value={costs.other} 
                onChange={e => setCosts({...costs, other: Number(e.target.value)})}
                className="bg-black/20 border-white/5 focus:ring-primary/20"
              />
            </div>

            <div className="pt-4 border-t border-white/5">
              <Label className="text-label-xs uppercase opacity-70 mb-2 block">{t('allocation_method')}</Label>
              <div className="grid grid-cols-3 gap-2">
                {(['value', 'weight', 'volume'] as const).map(method => (
                  <Button
                    key={method}
                    variant={allocationMethod === method ? 'default' : 'outline'}
                    size="sm"
                    className="text-[10px] uppercase font-bold px-1"
                    onClick={() => setAllocationMethod(method)}
                  >
                    {t(`allocate_by_${method}`)}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Results Table */}
        <div className="lg:col-span-3">
          <PrecisionTable 
            data={items} 
            columns={columns}
            collectionName="inventory_items"
          />
        </div>
      </div>
    </div>
  );
}
