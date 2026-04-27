'use client';

import { useState, useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import type { ColumnDef } from '@tanstack/react-table';
import Link from 'next/link';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { useInventoryMovements } from '@/features/inventory/hooks/useInventoryMovements';
import { generateExcel } from '@/utils/export';
import type { InventoryMovement } from '@/types/inventory';
import { Card, CardContent } from '@/components/ui/card';
import { Activity, ArrowUpRight, ArrowDownRight, Search, Filter, Download, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

const getTypeStyle = (docType: string) => {
  switch (docType) {
    case 'GRN': return 'bg-emerald-500/10 text-emerald-400';
    case 'ISSUE': return 'bg-amber-500/10 text-amber-400';
    case 'TRANSFER': return 'bg-cyan-500/10 text-cyan-400';
    case 'ADJUSTMENT': return 'bg-indigo-500/10 text-indigo-400';
    default: return 'bg-muted/10 text-muted-foreground';
  }
};

export default function MovementsClient() {
  const t = useTranslations('inventory.movements');
  const tc = useTranslations('common');
  const currentLocale = useLocale();
  const [searchFilter, setSearchFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useInventoryMovements({ 
    search: searchFilter || undefined,
    document_type: typeFilter || undefined,
    page 
  });

  const getDocumentPath = useMemo(() => (movement: InventoryMovement): string => {
    const base = `/${currentLocale}`;
    switch (movement.document_type) {
      case 'GRN': return `${base}/procurement/grn/${movement.document_id}`;
      case 'ISSUE': return `${base}/operations/issues/${movement.document_id}`;
      case 'TRANSFER': return `${base}/operations/transfers/${movement.document_id}`;
      case 'ADJUSTMENT': return `${base}/operations/adjustments/${movement.document_id}`;
      default: return '#';
    }
  }, [currentLocale]);

  const columns = useMemo<ColumnDef<InventoryMovement, unknown>[]>(() => [
    {
      accessorKey: 'posted_at',
      header: t('posted_at'),
      cell: ({ row }) => (
        <span dir="ltr" className="text-[10px] font-medium text-muted-foreground/80">
          {new Date(row.original.posted_at).toLocaleString(currentLocale === 'ar' ? 'ar-SA' : 'en-US', {
            dateStyle: 'medium',
            timeStyle: 'short'
          })}
        </span>
      ),
    },
    {
      accessorKey: 'document_number',
      header: t('document_number'),
      cell: ({ row }) => (
        <Link
          href={getDocumentPath(row.original)}
          className="text-[11px] font-black text-cyan-400 hover:text-cyan-300 tracking-wider transition-colors"
        >
          <span dir="ltr">{row.original.document_number}</span>
        </Link>
      ),
    },
    {
      accessorKey: 'document_type',
      header: t('document_type'),
      cell: ({ row }) => (
        <Badge variant="secondary" className={`${getTypeStyle(row.original.document_type)} text-[9px] font-black uppercase tracking-widest px-2.5 h-5 rounded-lg border-none`}>
          {row.original.document_type}
        </Badge>
      ),
    },
    {
      accessorKey: 'item_code',
      header: t('item_code'),
      cell: ({ row }) => <span dir="ltr" className="font-mono text-[11px] font-bold text-primary">{row.original.item_code}</span>,
    },
    {
      id: 'item_name',
      header: t('item_name'),
      cell: ({ row }) => (
        <div className="flex flex-col gap-0.5 max-w-[200px]">
          <span className="font-bold text-[11px] tracking-tight truncate">
            {currentLocale === 'ar' ? row.original.item_name_ar : row.original.item_name_en}
          </span>
          <span className="text-[9px] text-muted-foreground opacity-60 truncate" dir="rtl">
            {currentLocale === 'ar' ? row.original.item_name_en : row.original.item_name_ar}
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'direction',
      header: t('direction'),
      cell: ({ row }) => {
        const isEntry = row.original.direction === 'IN';
        return (
          <div className={`flex items-center gap-1.5 font-black text-[9px] uppercase tracking-widest ${isEntry ? 'text-emerald-400' : 'text-rose-400'}`}>
            {isEntry ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {isEntry ? t('in') : t('out')}
          </div>
        );
      },
    },
    {
      accessorKey: 'qty',
      header: t('qty'),
      cell: ({ row }) => (
        <span dir="ltr" className={`font-mono text-[11px] font-black px-2 py-0.5 rounded-lg ${
          row.original.direction === 'IN' ? 'text-emerald-400 bg-emerald-500/10' : 'text-rose-400 bg-rose-500/10'
        }`}>
          {row.original.qty}
        </span>
      ),
    },
  ], [t, currentLocale, getDocumentPath]);

  const handleExport = () => {
    if (!data?.data) return;
    const columns = [
      { header: t('posted_at'), key: 'posted_at', width: 20 },
      { header: t('document_number'), key: 'document_number', width: 20 },
      { header: t('document_type'), key: 'document_type', width: 15 },
      { header: t('item_code'), key: 'item_code', width: 15 },
      { header: t('item_name'), key: 'item_name', width: 30 },
      { header: t('lot'), key: 'lot_number', width: 15 },
      { header: t('direction'), key: 'direction', width: 10 },
      { header: t('qty'), key: 'qty', width: 10 },
    ];

    const rows = data.data.map(item => ({
      ...item,
      posted_at: new Date(item.posted_at).toLocaleString(),
      item_name: currentLocale === 'ar' ? item.item_name_ar : item.item_name_en,
    }));

    generateExcel(columns, rows, 'Stock_Movements');
  };

  const stats = useMemo(() => ({
    total: data?.meta?.total || 0,
    inbound: data?.data?.filter(m => m.direction === 'IN').length || 0,
    outbound: data?.data?.filter(m => m.direction === 'OUT').length || 0,
  }), [data]);

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      {/* KPI Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="relative overflow-hidden bg-surface-container-low border-none rounded-3xl shadow-xl shadow-primary/5 hover:shadow-primary/10 transition-all group">
          <CardContent className="p-6 flex flex-col gap-1">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">Stock Ledger Pulse</div>
            <div className="text-3xl font-black tracking-tighter text-primary group-hover:scale-105 transition-transform origin-inline-start">
              <span dir="ltr">{stats.total}</span>
            </div>
            <Activity className="absolute -end-2 -bottom-2 w-20 h-20 text-primary opacity-[0.03] group-hover:opacity-[0.05] transition-opacity" />
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden bg-surface-container-low border-none rounded-3xl shadow-xl shadow-emerald-500/5 hover:shadow-emerald-500/10 transition-all group">
          <CardContent className="p-6 flex flex-col gap-1">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">Inbound Stream</div>
            <div className="text-3xl font-black tracking-tighter text-emerald-400 group-hover:scale-105 transition-transform origin-inline-start">
              <span dir="ltr">{stats.inbound}</span>
            </div>
            <ArrowUpRight className="absolute -end-2 -bottom-2 w-20 h-20 text-emerald-400 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity" />
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden bg-surface-container-low border-none rounded-3xl shadow-xl shadow-rose-500/5 hover:shadow-rose-500/10 transition-all group">
          <CardContent className="p-6 flex flex-col gap-1">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">Outbound Flow</div>
            <div className="text-3xl font-black tracking-tighter text-rose-400 group-hover:scale-105 transition-transform origin-inline-start">
              <span dir="ltr">{stats.outbound}</span>
            </div>
            <ArrowDownRight className="absolute -end-2 -bottom-2 w-20 h-20 text-rose-400 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity" />
          </CardContent>
        </Card>
      </div>

      {/* Advanced Action Bar */}
      <div className="flex flex-col gap-4 bg-surface-container-low p-6 rounded-3xl shadow-lg shadow-cyan-500/5">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="relative w-full md:w-96 group">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-cyan-500 transition-colors" />
            <input
              type="search"
              placeholder={t('search_placeholder')}
              value={searchFilter}
              onChange={(e) => { setSearchFilter(e.target.value); setPage(1); }}
              className="w-full ps-10 pe-4 py-2 bg-surface-container-highest/30 border-none focus:ring-2 focus:ring-cyan-500/30 rounded-xl text-sm transition-all font-bold"
              dir="ltr"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <Select
              value={typeFilter}
              onValueChange={(val) => { if (val) { setTypeFilter(val === 'ALL' ? '' : val); setPage(1); } }}
            >
              <SelectTrigger className="w-44 h-10 bg-surface-container-highest/30 border-none text-[10px] font-black uppercase tracking-widest rounded-xl focus:ring-cyan-500/30 transition-all">
                <Filter className="w-3 h-3 mr-2 text-muted-foreground" />
                <SelectValue placeholder={tc('status.all')} />
              </SelectTrigger>
              <SelectContent className="bg-surface-container-high border-none shadow-2xl">
                <SelectItem value="ALL" className="text-[10px] font-bold uppercase">{tc('status.all')}</SelectItem>
                <SelectItem value="GRN" className="text-[10px] font-bold uppercase text-emerald-400">GRN</SelectItem>
                <SelectItem value="ISSUE" className="text-[10px] font-bold uppercase text-amber-400">ISSUE</SelectItem>
                <SelectItem value="TRANSFER" className="text-[10px] font-bold uppercase text-cyan-400">TRANSFER</SelectItem>
                <SelectItem value="ADJUSTMENT" className="text-[10px] font-bold uppercase text-indigo-400">ADJUSTMENT</SelectItem>
              </SelectContent>
            </Select>

            <Button 
              variant="secondary" 
              onClick={handleExport}
              className="h-10 px-6 bg-surface-container-highest/50 hover:bg-surface-container-highest border-none text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-md"
            >
              <Download className="w-3 h-3 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </div>

      <DataTable 
        columns={columns} 
        data={data?.data ?? []} 
        isLoading={isLoading}
        collectionName="inventory_movements_pulse"
        pagination={data?.meta ? {
          page: data.meta.page,
          pageSize: data.meta.page_size,
          total: data.meta.total,
          totalPages: data.meta.total_pages,
          onPageChange: setPage
        } : undefined}
        emptyState={
          <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-40">
            <History className="w-12 h-12 text-muted-foreground" />
            <div className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">{tc('no_items')}</div>
          </div>
        }
      />
    </div>
  );
}
