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
 AlertCircle,
 Database,
 Printer
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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

 const pendingItems = useMemo(() => {
  return items.filter(item => !item.code?.startsWith('BC-'));
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
  toast.success(t('success.mapped', { item: selectedItem.name }));
  
  setScannedCode('');
  setSelectedItem(null);
  setSearch('');
 };

 const columns = useMemo<ColumnDef<Item, unknown>[]>(() => [
  { 
   accessorKey: 'code', 
   header: tc('sku'),
   cell: ({ row }) => (
    <span className="font-mono text-label-xs font-bold text-muted-foreground/60 uppercase">
     {row.original.code || '---'}
    </span>
   )
  },
  { 
   id: 'name',
   header: tc('name'), 
   cell: ({ row }) => (
    <span className="font-bold text-label-sm">{row.original.name}</span>
   )
  },
  { 
   accessorKey: 'categoryId', 
   header: tc('category'),
   cell: ({ row }) => (
    <span className="text-label-xs font-semibold text-muted-foreground/40 uppercase">
     {row.original.category?.name || row.original.categoryId || '---'}
    </span>
   )
  },
  {
   id: 'actions',
   header: '',
   cell: ({ row }) => {
    const isSelected = selectedItem?.id === row.original.id;
    return (
     <div className="min-w-0 gap-6 flex-1 justify-end flex-col flex w-full">
      <motion.div
       whileHover={{ scale: 1.05 }}
       whileTap={{ scale: 0.95 }}
      >
       <Button 
        variant="ghost" 
        size="sm" 
        className={cn(
         "text-label-xs font-bold uppercase h-8 px-4 transition-all rounded-full border",
         isSelected 
          ? "bg-amber-500/10 text-amber-500 border-amber-500/30 hover:bg-amber-500/20" 
          : "text-operational-cyan border-operational-cyan/20 hover:bg-operational-cyan/10 hover:border-operational-cyan/40"
        )}
        onClick={() => setSelectedItem(row.original)}
       >
        {isSelected ? tc('selected') : t('actions.select_to_map')}
       </Button>
      </motion.div>
     </div>
    );
   },
  },
 ], [tc, t, selectedItem]);

 return (
  <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-10">
   {/* Breadcrumbs and PageHeader Wrapper */}
   <motion.div 
    initial={{ opacity: 0, y: -20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ type: 'spring', stiffness: 80, damping: 15 }}
    className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6"
   >
    <div className="space-y-1">
     <Breadcrumb 
      items={[
       { label: tc('home'), href: `/dashboard` },
       { label: tc('master_data'), href: `/master-data` },
       { label: tc('barcodes'), href: `/master-data/barcodes` },
       { label: t('title') }
      ]} 
     />
     <div>
      <h1 className="text-2xl font-bold tracking-tight text-foreground">{t('title')}</h1>
      <p className="text-sm text-muted-foreground">{t('description')}</p>
     </div>
    </div>
    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
     <Button 
      variant="outline" 
      className={cn(
       "h-12 px-6 border-white/5 bg-card border border-border shadow-sm hover:bg-surface-container-medium text-label-xs font-bold uppercase rounded-2xl relative overflow-hidden group shadow-md transition-all duration-300",
       isScanning && "border-operational-cyan/30 text-operational-cyan"
      )}
      onClick={() => setIsScanning(!isScanning)}
     >
      <Zap className={cn("w-4 h-4 me-2 transition-transform group-hover:scale-110", isScanning ? "text-operational-cyan fill-operational-cyan animate-pulse" : "text-muted-foreground")} />
      {isScanning ? t('actions.stop_auto_scan') : t('actions.start_auto_scan')}
     </Button>
    </motion.div>
   </motion.div>

   {/* Metrics Row */}
   <motion.div 
    initial={{ opacity: 0, y: 15 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.1, type: 'spring', stiffness: 80 }}
    className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
   >
    <MetricCard
     label={t('metrics.pending_items')}
     value={stats.pending}
     icon={AlertCircle}
     color="amber"
     dir="ltr"
     className="rounded-[2rem] border border-white/5 bg-card border border-border shadow-sm shadow-sm"
    />

    <MetricCard
     label={t('metrics.mapped_today')}
     value={stats.mappedToday}
     icon={CheckCircle2}
     color="emerald"
     dir="ltr"
     className="rounded-[2rem] border border-white/5 bg-card border border-border shadow-sm shadow-sm"
    />

    <MetricCard
     label={t('metrics.success_rate')}
     value="98.5%"
     icon={Zap}
     color="cyan"
     dir="ltr"
     className="rounded-[2rem] border border-white/5 bg-card border border-border shadow-sm shadow-sm"
    />
   </motion.div>

   {/* Main Layout Grid */}
   <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
    
    {/* Left Column: Interactive Forms & Search List */}
    <div className="lg:col-span-8 space-y-8">
     
     {/* Glowing Translucent Scan Panel */}
     <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.2, type: 'spring', stiffness: 90 }}
      className="bg-card border border-border shadow-sm border border-white/5 rounded-[2rem] p-8 space-y-8 shadow-xl relative overflow-hidden group"
     >
      <div className="absolute top-0 right-0 p-8 opacity-[0.02] group-hover:scale-110 group-hover:opacity-[0.04] transition-all duration-700">
       <ScanLine className="w-48 h-48 text-operational-cyan" />
      </div>

      <div className="flex items-center justify-between">
       <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-operational-cyan/10 border border-operational-cyan/20 flex items-center justify-center">
         <ScanLine className="w-6 h-6 text-operational-cyan" />
        </div>
        <div>
         <h3 className="text-label-sm font-bold uppercase tracking-wider text-foreground">{t('scan_section.title')}</h3>
         <p className="text-label-xs text-muted-foreground/60 font-semibold uppercase">{t('scan_section.subtitle')}</p>
        </div>
       </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
       
       {/* Step 1: Scan Barcode */}
       <div className="space-y-4">
        <label className="text-label-xs font-bold uppercase text-muted-foreground/60 ps-1 flex items-center gap-2">
         <span className="w-6 h-6 rounded-full bg-card/5 border border-white/10 flex items-center justify-center text-[10px] font-mono text-operational-cyan">1</span>
         {t('fields.scan_barcode')}
        </label>
        <div className="relative group">
         <Input
          placeholder={t('placeholders.scan_here')}
          value={scannedCode}
          onChange={(e) => setScannedCode(e.target.value)}
          className="w-full h-12 px-12 text-lg tracking-widest text-start font-mono bg-background border-border text-foreground focus:border-brand-gold shadow-sm"
          autoFocus
         />
         <BarcodeIcon className="absolute start-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/30 group-focus-within:text-operational-cyan transition-colors" />
         
         <AnimatePresence>
          {scannedCode && (
           <motion.button 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => setScannedCode('')}
            className="absolute end-4 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-red-500 transition-colors"
           >
            <XCircle className="w-5 h-5" />
           </motion.button>
          )}
         </AnimatePresence>
        </div>
       </div>

       {/* Step 2: Selected Item Display */}
       <div className="space-y-4">
        <label className="text-label-xs font-bold uppercase text-muted-foreground/60 ps-1 flex items-center gap-2">
         <span className="w-6 h-6 rounded-full bg-card/5 border border-white/10 flex items-center justify-center text-[10px] font-mono text-operational-cyan">2</span>
         {t('fields.mapped_item')}
        </label>
        <div className={cn(
         "h-14 rounded-2xl border flex items-center px-4 transition-all duration-300 bg-card border border-border shadow-sm",
         selectedItem 
          ? "border-amber-500/30 bg-amber-500/5" 
          : "border-outline-low italic text-muted-foreground/30"
        )}>
         {selectedItem ? (
          <div className="flex items-center gap-3 w-full">
           <div className="p-1.5 bg-amber-500/10 rounded-lg">
            <Package className="w-4 h-4 text-amber-500" />
           </div>
           <div className="flex-1 overflow-hidden">
            <p className="text-label-sm font-bold truncate text-foreground">{selectedItem.name}</p>
            <p className="text-[10px] font-mono text-muted-foreground/60 uppercase">{selectedItem.code}</p>
           </div>
           <motion.button 
            whileHover={{ scale: 1.1 }}
            onClick={() => setSelectedItem(null)}
            className="text-muted-foreground/40 hover:text-red-500 transition-colors"
           >
            <XCircle className="w-4 h-4" />
           </motion.button>
          </div>
         ) : (
          <span className="text-label-xs font-bold uppercase tracking-tight text-muted-foreground/30">{t('placeholders.no_item_selected')}</span>
         )}
        </div>
       </div>
      </div>

      <div className="pt-4 flex justify-end">
       <motion.div
        whileHover={selectedItem && scannedCode ? { scale: 1.02 } : {}}
        whileTap={selectedItem && scannedCode ? { scale: 0.98 } : {}}
       >
        <Button 
         disabled={!selectedItem || !scannedCode}
         onClick={handleMap}
         className={cn(
          "h-13 px-10 text-label-xs font-bold uppercase rounded-2xl transition-all duration-300 shadow-sm cursor-pointer",
          selectedItem && scannedCode 
           ? "bg-operational-cyan hover:bg-operational-cyan/80 text-black shadow-operational-cyan/20" 
           : "bg-surface-container-medium text-muted-foreground/40 border border-white/5 grayscale cursor-not-allowed shadow-none"
         )}
        >
         <LinkIcon className="w-4 h-4 me-2" />
         {t('actions.complete_mapping')}
        </Button>
       </motion.div>
      </div>
     </motion.div>

     {/* Item Search List Grid wrapper */}
     <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="space-y-4 pt-4"
     >
      <div className="flex items-center gap-3 px-2">
       <Package className="w-5 h-5 text-amber-500/60" />
       <h3 className="text-label-xs font-bold uppercase tracking-widest text-muted-foreground/70">{t('items_table.title')}</h3>
      </div>
      
      <div className="rounded-[2rem] bg-card border border-border shadow-sm border border-white/5 shadow-xl p-6">
       <DataTable 
        columns={columns} 
        data={pendingItems} 
        isLoading={isLoadingItems}
        collectionName="mapping_pending_items"
        filters={
        <div className="relative w-full">
         <Search className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40 group-focus-within:text-foreground transition-colors pointer-events-none" />
         <Input
          placeholder={tc('search')}
          value={search}
          onChange={ (e) => setSearch(e.target.value) }
          className="w-full h-11 ps-10 border-none bg-surface-container-high/40 focus:bg-surface-container-high transition-colors text-label-sm font-bold text-foreground shrink-0 rounded-lg"
         />
        </div>
       }
       />
      </div>
     </motion.div>
    </div>

    {/* Right Column: History & Stats */}
    <div className="lg:col-span-4 space-y-8">
     
     {/* Mapping History Card */}
     <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.25, type: 'spring', stiffness: 90 }}
      className="bg-card border border-border shadow-sm border border-white/5 rounded-[2rem] p-6 space-y-6 shadow-xl relative overflow-hidden group"
     >
      <div className="absolute top-0 right-0 p-8 opacity-[0.01] group-hover:scale-110 group-hover:opacity-[0.03] transition-all duration-700">
       <History className="w-40 h-40 text-operational-cyan" />
      </div>

      <div className="flex items-center justify-between relative z-10">
       <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-operational-cyan/10 border border-operational-cyan/20 flex items-center justify-center">
         <History className="w-5 h-5 text-operational-cyan" />
        </div>
        <h3 className="text-label-sm font-bold uppercase tracking-wider text-foreground">{t('history.title')}</h3>
       </div>
       <motion.span 
        key={mappingHistory.length}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="text-[10px] font-bold bg-operational-cyan/10 border border-operational-cyan/20 text-operational-cyan px-3 py-1 rounded-full uppercase tracking-tight"
       >
        {mappingHistory.length} {tc('today')}
       </motion.span>
      </div>

      <div className="space-y-4 max-h-[360px] overflow-y-auto pr-1">
       <AnimatePresence initial={false}>
        {mappingHistory.length > 0 ? (
         mappingHistory.map((entry) => (
          <motion.div 
           key={entry.id} 
           initial={{ opacity: 0, height: 0, y: -10 }}
           animate={{ opacity: 1, height: 'auto', y: 0 }}
           exit={{ opacity: 0, height: 0, y: 10 }}
           transition={{ type: 'spring', stiffness: 100, damping: 15 }}
           className="p-4 bg-card border border-border shadow-sm rounded-2xl border border-white/5 group hover:border-operational-cyan/20 hover:bg-card border border-border shadow-sm/80 transition-all duration-300"
          >
           <div className="flex items-start justify-between gap-4">
            <div className="space-y-1.5 overflow-hidden">
             <p className="text-label-xs font-bold truncate group-hover:text-operational-cyan transition-colors text-foreground">
              {entry.item.name}
             </p>
             <div className="flex items-center gap-2">
              <BarcodeIcon className="w-3.5 h-3.5 text-muted-foreground/40" />
              <p className="text-[10px] font-mono text-muted-foreground/60 uppercase tracking-wider">{entry.code}</p>
             </div>
            </div>
            <span className="text-[9px] font-bold text-muted-foreground/30 uppercase whitespace-nowrap pt-0.5">
             {new Date(entry.timestamp).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
            </span>
           </div>
          </motion.div>
         ))
        ) : (
         <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.3 }}
          className="py-16 flex flex-col items-center justify-center text-center space-y-4 min-w-0"
         >
          <History className="w-10 h-10 text-muted-foreground" />
          <p className="text-label-xs font-bold uppercase tracking-tight text-muted-foreground">{t('history.empty')}</p>
         </motion.div>
        )}
       </AnimatePresence>
      </div>

      {mappingHistory.length > 0 && (
       <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
        <Button 
         variant="ghost" 
         className="w-full h-11 text-label-xs font-bold uppercase text-muted-foreground/40 hover:text-red-400 hover:bg-red-500/5 hover:border-red-500/10 border border-transparent rounded-xl transition-all duration-300"
         onClick={() => setMappingHistory([])}
        >
         {tc('clear_history')}
        </Button>
       </motion.div>
      )}
     </motion.div>

     {/* Integration Status Card */}
     <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35, type: 'spring' }}
      className="p-6 bg-card border border-border shadow-sm border border-white/5 rounded-[2rem] space-y-4 shadow-xl relative overflow-hidden group"
     >
      <div className="absolute top-0 right-0 p-6 opacity-[0.01] group-hover:scale-110 transition-transform duration-700">
       <Database className="w-32 h-32 text-status-success" />
      </div>

      <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/40">{t('integration.title')}</h4>
      
      <div className="flex items-center gap-3 p-4 bg-status-success/5 rounded-2xl border border-status-success/10">
       <div className="relative">
        <div className="w-2.5 h-2.5 rounded-full bg-status-success animate-ping absolute" />
        <div className="w-2.5 h-2.5 rounded-full bg-status-success relative" />
       </div>
       <span className="text-label-xs font-bold uppercase text-status-success">{t('integration.scanner_online')}</span>
      </div>
      
      <p className="text-[10px] leading-relaxed text-muted-foreground/60 font-semibold uppercase italic ps-1">
       {t('integration.scanner_note')}
      </p>
     </motion.div>
    </div>
   </div>
  </div>
 );
}
