'use client';

import { useState, useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useInventoryLots } from '@/features/inventory/hooks/useInventoryLots';
import { useAuth } from '@/providers/AuthProvider';
import { useDebounce } from '@/hooks/useDebounce';
import {
  ShieldAlert,
  ShieldCheck,
  Calendar,
  Clock,
  Database,
  Search,
  RefreshCw,
  Loader2,
  Archive,
  Package
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VirtualizedMobileGrid } from '@/components/shared/VirtualizedMobileGrid';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { apiClient } from '@/lib/api/client';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { ExportMenu } from '@/components/shared/ExportMenu';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAudioFeedback } from '@/hooks/useAudioFeedback';
import { formatDate } from '@/utils/currency';
import { type InventoryLot } from '@/types/inventory';
import { z } from 'zod';

export default function LotBalanceClient() {
  const t = useTranslations('operational.lots');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const { user } = useAuth();
  const { playSound } = useAudioFeedback();
  const queryClient = useQueryClient();

  const searchParams = useSearchParams();
  const initialSearch = searchParams.get('search') || searchParams.get('sku') || '';

  const [page, setPage] = useState(1);
  const [includeExpired, setIncludeExpired] = useState(true);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [actionLoadingMap, setActionLoadingMap] = useState<Record<string, boolean>>({});

  const { data: lotData, isLoading, refetch } = useInventoryLots({
    include_expired: includeExpired,
    page,
    search: debouncedSearch || undefined,
  });

  const handleQuarantine = async (lotId: string) => {
    setActionLoadingMap(prev => ({ ...prev, [lotId]: true }));
    try {
      await apiClient.patch(`/lots/${lotId}/quarantine`, z.unknown(), {});
      playSound('success');
      toast.success('Lot successfully quarantined. Stock has been locked and excluded from future stocktake allocation.');
      queryClient.invalidateQueries({ queryKey: ['inventory/lots'] });
    } catch (err: unknown) {
      playSound('error');
      const message = err instanceof Error ? err.message : String(err);
      toast.error(message || 'Failed to quarantine lot.');
    } finally {
      setActionLoadingMap(prev => ({ ...prev, [lotId]: false }));
    }
  };

  const handleRelease = async (lotId: string) => {
    setActionLoadingMap(prev => ({ ...prev, [lotId]: true }));
    try {
      await apiClient.patch(`/lots/${lotId}/release-quarantine`, z.unknown(), {});
      playSound('success');
      toast.success('Lot successfully released from quarantine. Stock has been unlocked for operational use.');
      queryClient.invalidateQueries({ queryKey: ['inventory/lots'] });
    } catch (err: unknown) {
      playSound('error');
      const message = err instanceof Error ? err.message : String(err);
      toast.error(message || 'Failed to release lot.');
    } finally {
      setActionLoadingMap(prev => ({ ...prev, [lotId]: false }));
    }
  };

  const canManageLots = user?.role === 'ADMIN' || user?.role === 'INV_MGR';
  const lotsList = lotData?.data || [];

  const columns = useMemo<ColumnDef<InventoryLot, unknown>[]>(() => [
    {
      accessorKey: 'lotNumber',
      header: 'Lot Identity',
      cell: ({ row }) => (
        <span className="text-xs font-mono font-bold text-foreground bg-muted border border-border px-2 py-0.5 rounded">
          {row.original.lotNumber}
        </span>
      ),
    },
    {
      accessorKey: 'itemName',
      header: 'Inventory Item SKU',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-surface-container-highest/50 flex items-center justify-center border border-surface-variant/10 overflow-hidden shrink-0">
            {row.original.image ? (
              <img src={row.original.image} alt={row.original.itemName} className="w-full h-full object-cover" />
            ) : (
              <Package className="w-4 h-4 text-muted-foreground/60" />
            )}
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] font-mono text-muted-foreground">{row.original.itemCode}</span>
            <p className="text-xs font-bold text-foreground">{row.original.itemName}</p>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'qtyAvailable',
      header: () => <div className="text-end">Available Stock</div>,
      cell: ({ row }) => (
        <div className="text-end font-mono font-bold text-xs text-foreground" dir="ltr">
          {Number(row.original.qtyAvailable ?? 0).toLocaleString('en-US')} {row.original.uomCode || ''}
        </div>
      ),
    },
    {
      accessorKey: 'expiryDate',
      header: () => <div className="text-center">Expiration Date</div>,
      cell: ({ row }) => (
        <div className="inline-flex items-center justify-center gap-1.5 text-xs font-medium text-muted-foreground w-full">
          <Calendar className="w-3.5 h-3.5" />
          {row.original.expiryDate ? formatDate(row.original.expiryDate, locale as 'ar' | 'en') : '—'}
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: () => <div className="text-center">Status State</div>,
      cell: ({ row }) => {
        const lot = row.original;
        const status = lot.status || (lot.isExpired ? 'EXPIRED' : 'ACTIVE');
        return (
          <div className="flex justify-center">
            {status === 'QUARANTINE' ? (
              <Badge className="bg-status-error/15 text-status-error hover:bg-status-error/20 border-none uppercase font-bold tracking-widest text-[9px] gap-1 px-2.5 py-1 rounded-full">
                <ShieldAlert className="w-3 h-3" />
                Quarantined
              </Badge>
            ) : status === 'EXPIRED' ? (
              <Badge className="bg-amber-500/15 text-amber-500 hover:bg-amber-500/20 border-none uppercase font-bold tracking-widest text-[9px] gap-1 px-2.5 py-1 rounded-full">
                <Clock className="w-3 h-3" />
                Expired
              </Badge>
            ) : (
              <Badge className="bg-status-active/15 text-status-active hover:bg-status-active/20 border-none uppercase font-bold tracking-widest text-[9px] gap-1 px-2.5 py-1 rounded-full">
                <ShieldCheck className="w-3 h-3" />
                Active
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      id: 'actions',
      header: () => <div className="text-center">Override Actions</div>,
      cell: ({ row }) => {
        const lot = row.original;
        const status = lot.status || (lot.isExpired ? 'EXPIRED' : 'ACTIVE');
        if (!canManageLots) return null;
        return (
          <div className="flex justify-center w-full">
            {status === 'QUARANTINE' ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleRelease(lot.id)}
                disabled={actionLoadingMap[lot.id]}
                className="h-8 px-3 border-outline-low hover:bg-status-active/10 hover:border-status-active/20 text-status-active text-[10px] uppercase tracking-wider font-bold gap-1 rounded-lg transition-all"
              >
                {actionLoadingMap[lot.id] ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldCheck className="w-3 h-3" />}
                Release
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleQuarantine(lot.id)}
                disabled={actionLoadingMap[lot.id] || status === 'EXPIRED'}
                className="h-8 px-3 border-outline-low hover:bg-status-error/10 hover:border-status-error/20 text-status-error text-[10px] uppercase tracking-wider font-bold gap-1 rounded-lg transition-all"
              >
                {actionLoadingMap[lot.id] ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldAlert className="w-3 h-3" />}
                Quarantine
              </Button>
            )}
          </div>
        );
      },
    },
  ], [locale, canManageLots, actionLoadingMap]);

  return (
    <div className="min-h-screen bg-surface text-foreground space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="max-w-[1600px] mx-auto space-y-8">

        {/* Premium Header */}
        <div data-slot="page-header" className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
          <div className="space-y-4">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              Inventory Ledger Control
            </span>
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-operational-cyan/10 rounded-2xl border border-operational-cyan/20">
                  <Archive className="w-6 h-6 text-operational-cyan" />
                </div>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground" style={{ fontFamily: 'Tajawal, sans-serif' }}>
                  Lot Ledger Directory
                </h1>
              </div>
              <div dir="ltr" className="text-left w-full">
                <p className="text-sm text-muted-foreground/80 max-w-2xl mt-2">
                  Scan, review, and control quarantined inventory batches. Toggle lot statuses to quarantine defective goods or release cleared assets for production.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Directory Controls & Table */}
        <div className="p-6 md:p-8 rounded-[2.5rem] bg-card border border-border space-y-6 shadow-sm">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-4 w-full mb-6 bg-transparent">
            {/* Start side: Search and Toggle */}
            <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto">
              <div className="w-full sm:w-64">
                <div className="relative group w-full">
                  <Search className="absolute ltr:left-4 rtl:right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40 group-focus-within:text-operational-cyan transition-colors" />
                  <Input
                    type="text"
                    placeholder={tCommon('search_placeholder') || "Search..."}
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                    className="w-full h-12 font-medium bg-black/5 dark:bg-white/5 border border-border/50 shadow-sm rounded-2xl focus:ring-operational-cyan focus:border-operational-cyan transition-all ltr:pl-12 rtl:pr-12"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 px-4 h-12 bg-black/5 dark:bg-white/5 border border-border/50 rounded-2xl shrink-0">
                <Switch
                  id="expired-switch"
                  checked={includeExpired}
                  onCheckedChange={setIncludeExpired}
                  className="data-[state=checked]:bg-operational-cyan"
                />
                <Label htmlFor="expired-switch" className="text-sm font-medium text-foreground uppercase tracking-wider cursor-pointer whitespace-nowrap">
                  Include Expired Lots
                </Label>
              </div>
            </div>

            {/* End side: Refresh Button & Export */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => refetch()}
                className="h-12 px-4 bg-black/5 dark:bg-white/5 border border-border/50 hover:bg-surface-container-high rounded-2xl text-muted-foreground shrink-0"
              >
                <RefreshCw className="w-4 h-4 ltr:mr-2 rtl:ml-2" />
                <span className="font-bold text-xs uppercase">{tCommon('retry') || 'Refresh'}</span>
              </Button>

              {lotsList && lotsList.length > 0 && (
                <PermissionGate action="export" resource="inventory_lots">
                  <div className="shrink-0">
                    <ExportMenu
                      data={lotsList as unknown as Record<string, unknown>[]}
                      columns={[
                        { header: 'Lot #', key: 'lotNumber' },
                        { header: 'Item', key: 'itemName' },
                        { header: 'Quantity', key: 'qtyAvailable' },
                        { header: 'Status', key: 'status' },
                      ]}
                      filename="inventory_lots"
                      title="Lot Directory"
                    />
                  </div>
                </PermissionGate>
              )}
            </div>
          </div>

          {/* Mobile Card View (Virtualized) */}
          <VirtualizedMobileGrid<InventoryLot>
            data={lotsList}
            estimateSize={140}
            maxHeight={600}
            className="mt-4 block md:hidden"
            renderCard={(lot) => {
              const status = lot.status || (lot.isExpired ? 'EXPIRED' : 'ACTIVE');
              return (
                <div key={lot.id} className="bg-surface-lowest dark:bg-surface-container rounded-xl p-3 flex flex-col gap-3 shadow-sm border border-border group hover:border-operational-cyan/30 transition-colors">
                  
                  <div className="flex gap-3 items-start">
                    {/* Image / Icon */}
                    <div className="w-12 h-12 rounded-lg bg-surface-container-highest flex items-center justify-center border border-border shrink-0 overflow-hidden">
                      {lot.image ? (
                        <img src={lot.image} alt={lot.itemName || ''} className="w-full h-full object-cover" />
                      ) : (
                        <Package className="w-5 h-5 text-muted-foreground/40" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex flex-col min-w-0 flex-1 gap-1">
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-sm font-bold text-foreground line-clamp-1 group-hover:text-operational-cyan transition-colors">
                          {lot.itemName}
                        </span>
                        {status === 'QUARANTINE' ? (
                          <Badge className="bg-status-error/15 text-status-error hover:bg-status-error/20 border-none uppercase font-bold tracking-widest text-[9px] gap-1 px-1.5 py-0.5 rounded-md h-auto shrink-0">
                            <ShieldAlert className="w-3 h-3" />
                            Quarantined
                          </Badge>
                        ) : status === 'EXPIRED' ? (
                          <Badge className="bg-amber-500/15 text-amber-500 hover:bg-amber-500/20 border-none uppercase font-bold tracking-widest text-[9px] gap-1 px-1.5 py-0.5 rounded-md h-auto shrink-0">
                            <Clock className="w-3 h-3" />
                            Expired
                          </Badge>
                        ) : (
                          <Badge className="bg-status-active/15 text-status-active hover:bg-status-active/20 border-none uppercase font-bold tracking-widest text-[9px] gap-1 px-1.5 py-0.5 rounded-md h-auto shrink-0">
                            <ShieldCheck className="w-3 h-3" />
                            Active
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-2 mt-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-mono font-bold text-operational-cyan uppercase bg-operational-cyan/10 px-1.5 py-0.5 rounded-md border border-operational-cyan/20">
                            {lot.itemCode}
                          </span>
                          <span className="text-[10px] font-mono font-bold text-foreground bg-muted border border-border px-1.5 py-0.5 rounded-md">
                            {lot.lotNumber}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-1.5 shrink-0 pl-1">
                           <Calendar className="w-3 h-3 text-muted-foreground" />
                           <span className="text-[10px] font-bold text-muted-foreground truncate max-w-[90px]">
                             {lot.expiryDate ? formatDate(lot.expiryDate, locale as 'ar' | 'en') : '—'}
                           </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Row: Qty + Actions (Compact) */}
                  <div className="flex items-center justify-between pt-2 border-t border-border/40 mt-auto">
                    <div className="flex flex-col">
                      <span className="text-[9px] text-muted-foreground font-bold tracking-wider uppercase mb-0.5">
                         Available Stock
                      </span>
                      <div className="flex items-baseline gap-1">
                        <span dir="ltr" className="font-mono text-base leading-none font-bold text-foreground">
                          {Number(lot.qtyAvailable ?? 0).toLocaleString('en-US')}
                        </span>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">
                          {lot.uomCode || ''}
                        </span>
                      </div>
                    </div>

                    {canManageLots && (
                      <div className="flex gap-1.5">
                        {status === 'QUARANTINE' ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRelease(lot.id)}
                            disabled={actionLoadingMap[lot.id]}
                            className="h-8 px-3 bg-status-active/10 hover:bg-status-active/20 text-status-active text-[10px] uppercase tracking-wider font-bold gap-1 rounded-lg transition-all shrink-0"
                          >
                            {actionLoadingMap[lot.id] ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldCheck className="w-3 h-3" />}
                            Release
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleQuarantine(lot.id)}
                            disabled={actionLoadingMap[lot.id] || status === 'EXPIRED'}
                            className="h-8 px-3 bg-status-error/10 hover:bg-status-error/20 text-status-error text-[10px] uppercase tracking-wider font-bold gap-1 rounded-lg transition-all shrink-0"
                          >
                            {actionLoadingMap[lot.id] ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldAlert className="w-3 h-3" />}
                            Quarantine
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            }}
          />

          {/* Desktop Table View (DataTable + Virtualized) */}
          <div className="hidden md:block w-full">
            <DataTable<InventoryLot>
              columns={columns}
              data={lotsList}
              isLoading={isLoading}
              collectionName="inventory_lots"
              enableVirtualization={true}
              emptyState={
                <div className="py-24 flex flex-col items-center justify-center text-center space-y-4 w-full">
                  <div className="p-4 bg-surface-container-high rounded-full shrink-0">
                    <Database className="w-8 h-8 text-muted-foreground/40" />
                  </div>
                  <div className="space-y-1 w-full max-w-[320px] px-4 shrink-0">
                    <p className="text-sm font-bold text-foreground w-full">No Lots Located</p>
                    <p className="text-xs text-muted-foreground w-full">
                      No inventory lots matching the active filters or search terms could be found.
                    </p>
                  </div>
                </div>
              }
              pagination={lotData?.meta ? {
                page: lotData.meta.page,
                pageSize: lotData.meta.pageSize,
                total: lotData.meta.total,
                totalPages: lotData.meta.totalPages,
                onPageChange: setPage
              } : undefined}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
