'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { 
  Barcode as BarcodeIcon, 
  Search, 
  ScanLine, 
  Package, 
  CheckCircle2, 
  XCircle,
  Link as LinkIcon,
  Zap,
  History,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { useItems } from '@/features/items/hooks/useItems';
import { useUoMs } from '@/features/uoms/hooks/useUoMs';
import { type Item } from '@/types/master-data';
import { PageHeader } from '@/components/shared/PageHeader';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { MetricCard } from '@/components/ui/metric-card';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface MappingEntry {
  id: string;
  item: Item;
  code: string;
  timestamp: string;
}

export function BarcodeMappingClient({ locale }: { locale: string }) {
  const tc = useTranslations('common');
  const t = useTranslations('master_data.barcode_mapping');
  
  const [search, setSearch] = useState('');
  const [scannedCode, setScannedCode] = useState('');
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [mappingHistory, setMappingHistory] = useState<MappingEntry[]>([]);

  const { data: itemsData, isLoading: isLoadingItems } = useItems({ search });
  const { data: uomsData } = useUoMs();

  const items = itemsData?.data || [];
  const _uoms = uomsData?.data || [];

  // Filter items that might need barcodes (just an example filter for the tool)
  const pendingItems = useMemo(() => {
    return items.filter(item => !item.sku?.startsWith('BC-')); // Mock logic for "missing barcodes"
  }, [items]);

  const stats = useMemo(() => {
    return {
      pending: pendingItems.length,
      mappedToday: mappingHistory.length,
      totalItems: items.length
    };
  }, [pendingItems, mappingHistory, items]);

  const handleMap = () => {
    if (!selectedItem || !scannedCode) {
      toast.error(t('errors.missing_data'));
      return;
    }

    const newMapping = {
      id: Math.random().toString(36).substr(2, 9),
      item: selectedItem,
      code: scannedCode,
      timestamp: new Date().toISOString()
    };

    setMappingHistory([newMapping, ...mappingHistory]);
    toast.success(t('success.mapped', { item: locale === 'ar' ? selectedItem.name_ar : selectedItem.name_en }));
    
    // Reset mapping state
    setScannedCode('');
    setSelectedItem(null);
    setSearch('');
  };

  const columns = useMemo<ColumnDef<Item, unknown>[]>(() => [
    { 
      accessorKey: 'sku', 
      header: tc('sku'),
      cell: ({ row }) => (
        <span className="font-mono text-label-xs font-bold text-muted-foreground/60 uppercase">
          {row.original.sku || '---'}
        </span>
      )
    },
    { 
      id: 'name',
      header: tc('name'), 
      cell: ({ row }) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-bold text-label-sm">{row.original.name_en}</span>
          <span className="text-label-xs opacity-40" dir="rtl">{row.original.name_ar}</span>
        </div>
      )
    },
    { 
      accessorKey: 'category_id', 
      header: tc('category'),
      cell: ({ row }) => (
        <span className="text-label-xs font-semibold text-muted-foreground/40 uppercase">
          {row.original.category_id || '---'}
        </span>
      )
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex justify-end">
          <Button 
            variant="ghost" 
            size="sm" 
            className={cn(
              "text-label-xs font-bold uppercase h-8 px-4 transition-all rounded-sm",
              selectedItem?.id === row.original.id 
                ? "bg-amber-500 text-amber-950 hover:bg-amber-400" 
                : "text-amber-500 hover:bg-amber-500/10"
            )}
            onClick={() => setSelectedItem(row.original)}
          >
            {selectedItem?.id === row.original.id ? tc('selected') : t('actions.select_to_map')}
          </Button>
        </div>
      ),
    },
  ], [tc, t, selectedItem]);

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <div className="space-y-4">
        <Breadcrumb 
          items={[
            { label: tc('home'), href: `/dashboard` },
            { label: tc('master_data'), href: `/master-data` },
            { label: tc('barcodes'), href: `/master-data/barcodes` },
            { label: t('title') }
          ]} 
        />
        <PageHeader 
          title={t('title')} 
          description={t('description')}
          actions={
            <Button 
              variant="outline" 
              className="h-11 px-6 border-white/5 bg-surface-container-low hover:bg-surface-container-medium text-label-xs font-semibold uppercase rounded-sm"
              onClick={() => setIsScanning(!isScanning)}
            >
              <Zap className={cn("w-3.5 h-3.5 me-2", isScanning ? "text-amber-500 fill-amber-500" : "text-muted-foreground")} />
              {isScanning ? t('actions.stop_auto_scan') : t('actions.start_auto_scan')}
            </Button>
          }
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          label={t('metrics.pending_items')}
          value={stats.pending}
          icon={AlertCircle}
          color="amber"
          dir="ltr"
        />

        <MetricCard
          label={t('metrics.mapped_today')}
          value={stats.mappedToday}
          icon={CheckCircle2}
          color="emerald"
          dir="ltr"
        />

        <MetricCard
          label={t('metrics.success_rate')}
          value="98.5%"
          icon={Zap}
          color="cyan"
          dir="ltr"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Mapping Interface */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-surface-container-low border border-white/5 rounded-sm p-8 space-y-8 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-sm bg-primary/10 flex items-center justify-center">
                  <ScanLine className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-label-sm font-bold uppercase tracking-wider">{t('scan_section.title')}</h3>
                  <p className="text-label-xs text-muted-foreground/60 font-semibold uppercase">{t('scan_section.subtitle')}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Step 1: Scan Barcode */}
              <div className="space-y-4">
                <label className="text-label-xs font-bold uppercase text-muted-foreground/60 ps-1 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center text-[10px]">1</span>
                  {t('fields.scan_barcode')}
                </label>
                <div className="relative group">
                  <Input
                    placeholder={t('placeholders.scan_here')}
                    value={scannedCode}
                    onChange={(e) => setScannedCode(e.target.value)}
                    className="h-14 bg-black/20 border-white/5 px-12 font-mono text-lg font-bold tracking-[0.2em] text-cyan-500 focus-visible:ring-cyan-500/30 rounded-sm"
                  />
                  <BarcodeIcon className="absolute start-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/30 group-focus-within:text-cyan-500/50 transition-colors" />
                  {scannedCode && (
                    <button 
                      onClick={() => setScannedCode('')}
                      className="absolute end-4 top-1/2 -translate-y-1/2 hover:text-red-500 transition-colors"
                    >
                      <XCircle className="w-4 h-4 opacity-40" />
                    </button>
                  )}
                </div>
              </div>

              {/* Step 2: Selected Item Display */}
              <div className="space-y-4">
                <label className="text-label-xs font-bold uppercase text-muted-foreground/60 ps-1 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center text-[10px]">2</span>
                  {t('fields.mapped_item')}
                </label>
                <div className={cn(
                  "h-14 rounded-sm border flex items-center px-4 transition-all duration-300",
                  selectedItem 
                    ? "bg-amber-500/5 border-amber-500/20" 
                    : "bg-black/10 border-white/5 italic text-muted-foreground/30"
                )}>
                  {selectedItem ? (
                    <div className="flex items-center gap-3 w-full">
                      <Package className="w-4 h-4 text-amber-500/50" />
                      <div className="flex-1 overflow-hidden">
                        <p className="text-label-sm font-bold truncate">{locale === 'ar' ? selectedItem.name_ar : selectedItem.name_en}</p>
                        <p className="text-[10px] font-mono opacity-40 uppercase">{selectedItem.sku}</p>
                      </div>
                      <button onClick={() => setSelectedItem(null)}>
                        <XCircle className="w-4 h-4 text-muted-foreground/40 hover:text-red-500 transition-colors" />
                      </button>
                    </div>
                  ) : (
                    <span className="text-label-xs font-bold uppercase">{t('placeholders.no_item_selected')}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <Button 
                disabled={!selectedItem || !scannedCode}
                onClick={handleMap}
                className={cn(
                  "h-12 px-10 text-label-xs font-bold uppercase rounded-sm transition-all shadow-xl",
                  selectedItem && scannedCode 
                    ? "bg-emerald-500 hover:bg-emerald-400 text-emerald-950 shadow-emerald-500/20" 
                    : "bg-surface-container-medium text-muted-foreground grayscale cursor-not-allowed shadow-none"
                )}
              >
                <LinkIcon className="w-4 h-4 me-2" />
                {t('actions.complete_mapping')}
              </Button>
            </div>
          </div>

          {/* Item Search List */}
          <div className="space-y-4 pt-4">
            <div className="flex items-center gap-2 px-2">
              <Package className="w-4 h-4 text-amber-500/50" />
              <h3 className="text-label-xs font-bold uppercase tracking-widest text-muted-foreground/60">{t('items_table.title')}</h3>
            </div>
            <DataTable 
              columns={columns} 
              data={pendingItems} 
              isLoading={isLoadingItems}
              collectionName="mapping_pending_items"
              filters={
                <div className="p-6 bg-surface-container-medium/30 border-b border-white/5 rounded-t-sm">
                  <div className="relative">
                    <Input
                      placeholder={tc('search')}
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="h-11 bg-surface-container-highest/30 border-none px-11 text-label-sm font-bold rounded-sm shadow-inner"
                    />
                    <Search className="absolute start-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
                  </div>
                </div>
              }
            />
          </div>
        </div>

        {/* History / Recent Mappings */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-surface-container-low border border-white/5 rounded-sm p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-cyan-500/50" />
                <h3 className="text-label-xs font-bold uppercase tracking-wider">{t('history.title')}</h3>
              </div>
              <span className="text-[10px] font-bold bg-cyan-500/10 text-cyan-500 px-2 py-0.5 rounded-full uppercase tracking-tighter">
                {mappingHistory.length} {tc('today')}
              </span>
            </div>

            <div className="space-y-4">
              {mappingHistory.length > 0 ? (
                mappingHistory.map((entry) => (
                  <div key={entry.id} className="p-4 bg-black/20 rounded-sm border border-white/5 group hover:border-cyan-500/20 transition-all">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1 overflow-hidden">
                        <p className="text-label-xs font-bold truncate group-hover:text-cyan-500 transition-colors">
                          {locale === 'ar' ? entry.item.name_ar : entry.item.name_en}
                        </p>
                        <div className="flex items-center gap-2">
                          <BarcodeIcon className="w-3 h-3 text-muted-foreground/40" />
                          <p className="text-[10px] font-mono text-muted-foreground/60 uppercase">{entry.code}</p>
                        </div>
                      </div>
                      <span className="text-[9px] font-bold text-muted-foreground/30 uppercase whitespace-nowrap">
                        {new Date(entry.timestamp).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-3 opacity-30">
                  <History className="w-8 h-8" />
                  <p className="text-label-xs font-bold uppercase tracking-tight">{t('history.empty')}</p>
                </div>
              )}
            </div>

            {mappingHistory.length > 0 && (
              <Button 
                variant="ghost" 
                className="w-full h-10 text-label-xs font-bold uppercase text-muted-foreground/40 hover:text-cyan-500 transition-colors"
                onClick={() => setMappingHistory([])}
              >
                {tc('clear_history')}
              </Button>
            )}
          </div>

          {/* Integration Status */}
          <div className="p-6 bg-surface-container-low border border-white/5 rounded-sm space-y-4">
            <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/40">{t('integration.title')}</h4>
            <div className="flex items-center gap-3 p-3 bg-emerald-500/5 rounded-sm border border-emerald-500/10">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-label-xs font-bold uppercase text-emerald-500/80">{t('integration.scanner_online')}</span>
            </div>
            <p className="text-[10px] leading-relaxed text-muted-foreground/60 font-semibold uppercase italic">
              {t('integration.scanner_note')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
