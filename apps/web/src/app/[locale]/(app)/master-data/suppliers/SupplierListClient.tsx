'use client';

import { useState, useMemo } from 'react';
import { useRouter, Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { Plus, Users, CheckCircle2, ExternalLink, CreditCard, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { useSuppliers } from '@/features/suppliers/hooks/useSuppliers';
import { type Supplier } from '@/types/master-data';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ColumnDef } from '@tanstack/react-table';
import { PageHeader } from '@/components/shared/PageHeader';
import { Input } from '@/components/ui/input';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { MetricCard } from '@/components/ui/metric-card';
import { EmptyState } from '@/components/shared/EmptyState';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { ErrorState } from '@/components/shared/ErrorState';

export function SupplierListClient({ locale }: { locale: string }) {
 const t = useTranslations('common');
 const tc = useTranslations('master_data.suppliers');
 const router = useRouter();
 const [search, setSearch] = useState('');

 const { data, isLoading, isError, refetch } = useSuppliers({ search });

 const stats = useMemo(() => {
  const suppliers = data?.data || [];
  return {
   total: data?.meta?.total || 0,
   active: suppliers.filter(s => s.isActive).length,
  };
 }, [data]);

 const columns = useMemo<ColumnDef<Supplier, unknown>[]>(() => [
  {
   accessorKey: 'code',
   header: t('code'),
   cell: ({ row }) => (
    <span className="font-mono text-label-xs font-bold text-foreground uppercase px-2.5 py-1 bg-muted/50 rounded-lg border border-operational-cyan/5 whitespace-nowrap inline-block min-w-max" dir="ltr">
     {row.original.code}
    </span>
   ),
  },
  {
   accessorKey: 'name',
   header: t('name'),
   cell: ({ row }) => (
    <span className="font-bold text-label-sm">{row.original.name}</span>
   ),
  },
  {
   accessorKey: 'paymentTerms',
   header: tc('fields.payment_terms'),
   cell: ({ row }) => row.original.paymentTerms
    ? (
     <div className="flex items-center gap-1.5 text-status-warning font-bold text-label-xs uppercase">
      <CreditCard className="w-3 h-3 opacity-60" />
      {row.original.paymentTerms}
     </div>
    )
    : <span className="opacity-20 italic text-label-xs">{t('not_available')}</span>,
  },
  {
   accessorKey: 'isActive',
   header: t('status'),
   cell: ({ row }) => (
    <StatusBadge status={row.original.isActive ? 'ACTIVE' : 'INACTIVE'} className="rounded-lg px-2.5" />
   ),
  },
  {
   id: 'actions',
   header: '',
   cell: ({ row }) => (
    <div className="flex justify-end gap-3">
     <PermissionGate action="view" resource="master_data">
      <Button
       variant="ghost"
       size="sm"
       className="text-label-xs font-bold uppercase text-operational-cyan hover:bg-operational-cyan/10 h-9 px-4 rounded-xl transition-all"
       onClick={(e) => {
        e.stopPropagation();
        router.push(`/master-data/suppliers/${row.original.id}`);
       }}
      >
       {t('view')}
      </Button>
     </PermissionGate>
     <PermissionGate action="edit" resource="master_data">
      <Button 
       variant="ghost" 
       size="sm" 
       className="text-label-xs font-bold uppercase text-status-warning hover:bg-status-warning/10 h-9 px-4 rounded-xl transition-all"
       onClick={(e) => {
        e.stopPropagation();
        router.push(`/master-data/suppliers/${row.original.id}/edit`);
       }}
      >
       {t('edit')}
      </Button>
     </PermissionGate>
    </div>
   ),
  },
 ], [t, tc, locale, router]);

 if (isLoading) return <PageSkeleton variant="list" />;
 if (isError) return <ErrorState onRetry={refetch} />;

 const breadcrumbs = [
  { label: t('home'), href: `/dashboard` },
  { label: t('master_data'), href: `/master-data` },
  { label: tc('title'), href: `/master-data/suppliers` },
 ];

 return (
  <div className="min-w-0 max-w-[1600px] flex-1 fade-in space-y-8 gap-6 duration-1000 slide-in-from-bottom-4 mx-auto animate-in flex-col flex w-full">
   <Breadcrumb items={breadcrumbs} />

   <PageHeader
    title={tc('title')}
    subtitle={tc('description')}
    children={
     <PermissionGate action="create" resource="master_data">
      <Link href={`/master-data/suppliers/new`} className="shrink-0 w-full sm:w-auto">
       <Button className="h-11 px-8 bg-operational-cyan hover:bg-operational-cyan/90 text-white text-label-xs font-semibold uppercase rounded-xl transition-all shadow-sm shadow-operational-cyan/20">
        <Plus className="w-3.5 h-3.5 me-2" />
        {t('create_new')}
       </Button>
      </Link>
     </PermissionGate>
    }
   />

   <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
    <MetricCard
     label={tc('metrics.total_suppliers') || 'إجمالي الموردين'}
     value={stats.total}
     icon={Users}
     color="cyan"
     dir="ltr"
    />

    <MetricCard
     label={t('active')}
     value={stats.active}
     icon={CheckCircle2}
     color="emerald"
     dir="ltr"
    />

    <MetricCard
     label={tc('metrics.compliance')}
     value="100%"
     icon={ExternalLink}
     color="rose"
     dir="ltr"
    />
   </div>

   <div className="flex-1 w-full min-h-[400px] md:min-h-0">
    <div className="hidden md:block w-full">
     <DataTable
      columns={columns}
      data={data?.data ?? []}
      isLoading={isLoading}
      collectionName="master_data_suppliers"
      onRowClick={(r: Supplier) => router.push(`/master-data/suppliers/${r.id}`)}
      emptyState={
       <EmptyState 
        variant="minimal"
        title={t('no_data')}
       />
      }
      filters={
         <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
           <div className="w-full sm:w-80 md:w-96">
             <div className="relative w-full group">
               <Search className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40 group-focus-within:text-foreground transition-colors pointer-events-none" />
               <Input
           placeholder={tc('search_placeholder') || 'البحث عن الموردين بالكود أو الاسم...'}
           value={search}
           onChange={ (e) => setSearch(e.target.value) }
           className="w-full h-11 ps-10 border-none bg-surface-container-high/40 focus:bg-surface-container-high transition-colors text-label-sm font-bold text-foreground shrink-0 rounded-lg"
          />
             </div>
           </div>
         </div>
        }
     />
    </div>

    {!isLoading && (data?.data ?? []).length > 0 && (
     <div className="flex flex-col gap-3 md:hidden mt-4">
      {(data?.data ?? []).map((supplier) => (
       <div 
        key={supplier.id} 
        className="bg-white dark:bg-[#1A2234] border border-gray-200 dark:border-gray-800 rounded-lg p-3 flex flex-col gap-2 shadow-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-[#1A2234]/80 transition-colors"
        onClick={() => router.push(`/master-data/suppliers/${supplier.id}`)}
       >
        
        {/* TOP TIER: Identity & Status */}
        <div className="flex justify-between items-start">
          <div className="flex flex-col gap-1 w-full">
            {/* Name & Status Inline */}
            <div className="flex justify-between items-start gap-2">
              <span className="text-sm font-bold text-gray-900 dark:text-white line-clamp-1">{supplier.name}</span>
              <StatusBadge status={supplier.isActive ? 'ACTIVE' : 'INACTIVE'} className="px-1.5 py-0.5 text-[9px] rounded-md h-auto shrink-0" />
            </div>
            {/* Codes Inline */}
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[11px] font-mono font-bold text-[#D4AF37] uppercase">{supplier.code}</span>
            </div>
          </div>
        </div>

        {/* BOTTOM TIER: Metadata & Actions */}
        <div className="flex justify-between items-end pt-2 mt-1 border-t border-gray-100 dark:border-gray-800/50">
          
          {/* Left Side: Payment Terms */}
          <div className="flex items-center gap-1.5 text-status-warning font-bold text-[10px] uppercase">
           {supplier.paymentTerms ? (
             <>
               <CreditCard className="w-3 h-3 opacity-60" />
               {supplier.paymentTerms}
             </>
           ) : (
             <span className="opacity-20 italic text-[10px]">{t('not_available')}</span>
           )}
          </div>

          {/* Right Side: Compact Touch-Friendly Buttons */}
          <div className="flex gap-2 shrink-0">
           <PermissionGate action="view" resource="master_data">
            <button 
             className="h-8 px-4 flex items-center justify-center bg-gray-100 dark:bg-[#0B1220] border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-md text-xs font-bold hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
             onClick={(e) => { e.stopPropagation(); router.push(`/master-data/suppliers/${supplier.id}`); }}
            >
             {t('view')}
            </button>
           </PermissionGate>
           <PermissionGate action="edit" resource="master_data">
            <button 
             className="h-8 px-4 flex items-center justify-center bg-white dark:bg-transparent border border-[#D4AF37] text-[#D4AF37] rounded-md text-xs font-bold hover:bg-[#D4AF37]/10 transition-colors"
             onClick={(e) => { e.stopPropagation(); router.push(`/master-data/suppliers/${supplier.id}/edit`); }}
            >
             {t('edit')}
            </button>
           </PermissionGate>
          </div>
        </div>
       </div>
      ))}
     </div>
    )}
   </div>
  </div>
 );
}
