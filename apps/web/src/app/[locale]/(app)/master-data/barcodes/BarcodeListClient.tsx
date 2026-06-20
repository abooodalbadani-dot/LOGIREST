'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import { Plus, CheckCircle2, Package, Search, Barcode as BarcodeIcon, ScanLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { useBarcodes } from '@/features/barcodes/hooks/useBarcodes';
import { useItems } from '@/features/items/hooks/useItems';
import { useUoMs } from '@/features/uoms/hooks/useUoMs';
import { type Barcode } from '@/types/master-data';
import { PageHeader } from '@/components/shared/PageHeader';
import { Input } from '@/components/ui/input';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { MetricCard } from '@/components/ui/metric-card';
import { EmptyState } from '@/components/shared/EmptyState';

export function BarcodeListClient({ locale }: { locale: string }) {
 const tc = useTranslations('common');
 const t = useTranslations('master_data.barcodes');
 const router = useRouter();
 const [search, setSearch] = useState('');

 const { data: queryData, isLoading: isLoadingBarcodes } = useBarcodes({ search });
 const { data: itemsData } = useItems();
 const { data: uomsData } = useUoMs();

 const barcodes = queryData?.data || [];
 const items = itemsData?.data || [];
 const uoms = uomsData?.data || [];

 const stats = useMemo(() => {
  return {
   total: barcodes.length,
   items: new Set(barcodes.map(b => b.itemId)).size
  };
 }, [barcodes]);

 const columns = useMemo<ColumnDef<Barcode, unknown>[]>(() => [
  { 
   accessorKey: 'code', 
   header: t('fields.code'), 
   cell: ({ row }) => (
    <div className="flex items-center gap-2">
     <BarcodeIcon className="w-3.5 h-3.5 text-foreground/50" />
     <span dir="ltr" className="font-mono text-foreground/90 font-bold uppercase bg-muted/50 px-2 py-0.5 rounded-sm whitespace-nowrap inline-block min-w-max">
      {row.original.code}
     </span>
    </div>
   )
  },
  { 
   accessorKey: 'itemId', 
   header: t('fields.item'), 
   cell: ({ row }) => {
    const item = items.find(i => i.id === row.original.itemId);
    if (!item) return <span className="opacity-40 italic">---</span>;
    return (
     <span className="font-bold text-label-sm">{item.name}</span>
    );
   }
  },
  {
   id: 'actions',
   header: '',
   cell: ({ row }) => (
    <div className="flex justify-end gap-2">
     <PermissionGate action="view" resource="master_data">
      <Button 
       variant="ghost" 
       size="sm" 
       className="text-xs font-bold tracking-wider text-muted-foreground hover:text-brand-gold uppercase transition-colors h-8 px-3 rounded-lg"
       onClick={(e) => {
        e.stopPropagation();
        router.push(`/master-data/barcodes/${row.original.id}`);
       }}
      >
       {tc('view')}
      </Button>
     </PermissionGate>
     <PermissionGate action="edit" resource="master_data">
      <Button
       variant="ghost"
       size="sm"
       className="text-label-xs font-semibold uppercase text-foreground hover:text-foreground hover:bg-muted/50 h-7"
       onClick={(e) => {
        e.stopPropagation();
        router.push(`/master-data/barcodes/${row.original.id}/edit`);
       }}
      >
       {tc('actions.edit')}
      </Button>
     </PermissionGate>
    </div>
   ),
  },
 ], [tc, t, locale, router, items]);

 return (
  <div className="overflow-x-hidden min-w-0 gap-6 flex-1 fade-in max-w-full slide-in-from-bottom-4 duration-1000 animate-in flex-col flex w-full">
   <div className="space-y-4">
    <Breadcrumb 
     items={[
      { label: tc('home'), href: `/dashboard` },
      { label: tc('master_data'), href: `/master-data` },
      { label: t('title') }
     ]} 
    />
    <PageHeader 
     title={t('title')} 
     subtitle={t('description')}
     children={
      <PermissionGate action="create" resource="master_data">
       <div className="flex gap-4">
        <Link href={`/master-data/barcodes/mapping`} className="shrink-0 w-full sm:w-auto">
         <Button variant="outline" className="h-11 px-6 border-white/5 bg-card border border-border shadow-sm hover:bg-surface-container-medium text-label-xs font-semibold uppercase rounded-sm">
          <ScanLine className="w-3.5 h-3.5 me-2 text-foreground" />
          {useTranslations('master_data.barcode_mapping')('title')}
         </Button>
        </Link>
        <Link href={`/master-data/barcodes/new`} className="shrink-0 w-full sm:w-auto">
         <Button className="h-11 px-8 bg-primary hover:bg-primary/90 text-primary-foreground text-label-xs font-semibold uppercase rounded-sm transition-all shadow-sm shadow-primary/20">
          <Plus className="w-3.5 h-3.5 me-2" />
          {tc('create')}
         </Button>
        </Link>
       </div>
      </PermissionGate>
     }
    />
   </div>

   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
    <MetricCard
     label={tc('total_records')}
     value={stats.total}
     icon={BarcodeIcon}
     color="cyan"
     dir="ltr"
    />

    <MetricCard
     label={t('fields.item')}
     value={stats.items}
     icon={Package}
     color="amber"
     dir="ltr"
    />
   </div>

   <DataTable 
    columns={columns} 
    data={barcodes} 
    isLoading={isLoadingBarcodes}
    collectionName="master_data_barcodes"
    onRowClick={(r: Barcode) => router.push(`/master-data/barcodes/${r.id}`)}
    emptyState={
     <EmptyState 
      variant="minimal"
      title={tc('no_data')}
     />
    }
    filters={
       <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
         <div className="w-full sm:w-80 md:w-96">
           <div className="relative w-full group">
             <Search className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40 group-focus-within:text-foreground transition-colors pointer-events-none" />
             <Input
         placeholder={tc('search')}
         value={search}
         onChange={(e) => { setSearch(e.target.value); }} className="w-full h-11 ps-10 border-none bg-surface-container-high/40 focus:bg-surface-container-high transition-colors text-label-sm font-bold text-foreground shrink-0 rounded-lg"
        />
           </div>
         </div>
       </div>
      }
   />

   {/* Quick Tips */}
   <div className="grid grid-cols-1 md:grid-cols-2 gap-6 opacity-60 hover:opacity-100 transition-opacity duration-500 pb-10 pt-4 border-t border-surface-variant/5">
    <div className="p-6 bg-card border border-border shadow-sm/50 rounded-sm border border-white/5 flex items-start gap-4">
     <div className="w-10 h-10 rounded-sm bg-muted/50 flex items-center justify-center flex-shrink-0">
      <BarcodeIcon className="w-5 h-5 text-foreground" />
     </div>
     <div className="space-y-1">
      <h4 className="text-label-xs font-semibold uppercase text-foreground">{t('tips.multi_unit_title')}</h4>
      <p className="text-label-xs text-muted-foreground font-semibold leading-relaxed uppercase">
       {t('tips.multi_unit_desc')}
      </p>
     </div>
    </div>
    <div className="p-6 bg-card border border-border shadow-sm/50 rounded-sm border border-white/5 flex items-start gap-4">
     <div className="w-10 h-10 rounded-sm bg-amber-500/10 flex items-center justify-center flex-shrink-0">
      <Package className="w-5 h-5 text-amber-500" />
     </div>
     <div className="space-y-1">
      <h4 className="text-label-xs font-semibold uppercase text-amber-500">{t('tips.gtin_standard_title')}</h4>
      <p className="text-label-xs text-muted-foreground font-semibold leading-relaxed uppercase">
       {t('tips.gtin_standard_desc')}
      </p>
     </div>
    </div>
   </div>
  </div>
 );
}
