'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useInventoryLots } from '@/features/inventory/hooks/useInventoryLots';
import { useAuth } from '@/providers/AuthProvider';
import { 
  ShieldAlert, 
  ShieldCheck, 
  Calendar, 
  Clock, 
  Database, 
  Search,
  RefreshCw,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Archive,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { apiClient } from '@/lib/api/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAudioFeedback } from '@/hooks/useAudioFeedback';
import { formatDate } from '@/utils/currency';
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
  const [actionLoadingMap, setActionLoadingMap] = useState<Record<string, boolean>>({});

  const { data: lotData, isLoading, isPlaceholderData } = useInventoryLots({
    include_expired: includeExpired,
    page,
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

  // Filter lots on client side for search query
  const filteredLots = (lotData?.data || []).filter(lot => {
    const term = searchQuery.toLowerCase();
    if (!term) return true;
    return (
      lot.lotNumber.toLowerCase().includes(term) ||
      lot.itemCode.toLowerCase().includes(term) ||
      lot.itemName.toLowerCase().includes(term)
    );
  });

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
                    onChange={(e) => setSearchQuery(e.target.value)}
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

            {/* End side: Refresh Button */}
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => queryClient.invalidateQueries({ queryKey: ['inventory/lots'] })}
                className="h-12 px-4 bg-black/5 dark:bg-white/5 border border-border/50 hover:bg-surface-container-high rounded-2xl text-muted-foreground shrink-0"
              >
                <RefreshCw className="w-4 h-4 ltr:mr-2 rtl:ml-2" />
                <span className="font-bold text-xs uppercase">{tCommon('retry') || 'Refresh'}</span>
              </Button>
            </div>
          </div>

          {/* Table Container */}
          {isLoading ? (
            <div className="py-32 flex flex-col items-center justify-center space-y-4">
              <Loader2 className="w-8 h-8 animate-spin text-operational-cyan" />
              <p className="text-xs text-muted-foreground">Indexing ledger lots...</p>
            </div>
          ) : filteredLots.length === 0 ? (
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
          ) : (
            <div className="w-full overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
              <table className="w-full text-start border-collapse block md:table">
                <thead className="bg-muted/50 border-b border-border text-muted-foreground text-xs uppercase tracking-wider hidden md:table-header-group">
                  <tr>
                    <th className="px-6 py-4 font-medium text-start whitespace-nowrap w-1/4">
                      Lot Identity
                    </th>
                    <th className="px-6 py-4 font-medium text-start whitespace-nowrap w-1/4">
                      Inventory Item SKU
                    </th>
                    <th className="px-6 py-4 font-medium text-end whitespace-nowrap w-1/6">
                      Available Stock
                    </th>
                    <th className="px-6 py-4 font-medium text-center whitespace-nowrap w-1/6">
                      Expiration Date
                    </th>
                    <th className="px-6 py-4 font-medium text-center whitespace-nowrap w-1/6">
                      Status State
                    </th>
                    {canManageLots && (
                      <th className="px-6 py-4 font-medium text-center whitespace-nowrap w-1/6">
                        Override Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-border block md:table-row-group md:divide-y-0">
                  {filteredLots.map((lot) => {
                    const status = lot.status || (lot.isExpired ? 'EXPIRED' : 'ACTIVE');
                    return (
                      <tr 
                        key={lot.id} 
                        className="flex flex-col md:table-row border-b border-slate-800 p-4 md:p-0 gap-3 md:gap-0 hover:bg-muted/50 transition-colors group"
                      >
                        {/* Mobile Only: Top Row (Flex Between) */}
                        <td className="block md:hidden w-full">
                          <div className="flex justify-between items-center w-full">
                            <span className="text-xs font-mono font-bold text-foreground bg-muted border border-border px-2 py-0.5 rounded">
                              {lot.lotNumber}
                            </span>
                            <div>
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
                          </div>
                        </td>

                        {/* Desktop Only: Lot Identity */}
                        <td className="hidden md:table-cell px-6 py-4 text-sm text-foreground whitespace-nowrap">
                          <div className="space-y-1">
                            <span className="text-xs font-mono font-bold text-foreground bg-muted border border-border px-2 py-0.5 rounded">
                              {lot.lotNumber}
                            </span>
                          </div>
                        </td>

                        {/* Middle Row: Inventory Item SKU */}
                        <td className="block md:table-cell px-0 md:px-6 py-0 md:py-4 text-sm text-foreground whitespace-nowrap">
                          <div className="space-y-0.5">
                            <span className="text-[10px] font-mono text-muted-foreground">
                              {lot.itemCode}
                            </span>
                            <p className="text-xs font-bold text-foreground">
                              {lot.itemName}
                            </p>
                          </div>
                        </td>

                        {/* Desktop Only: Available Stock with UoM */}
                        <td className="hidden md:table-cell px-6 py-4 text-sm text-foreground whitespace-nowrap text-end" dir="ltr">
                          <span className="text-xs font-bold font-mono text-foreground tabular-nums">
                            {Number(lot.qtyAvailable).toLocaleString('en-US')} {lot.uomCode || ''}
                          </span>
                        </td>

                        {/* Desktop Only: Expiration Date */}
                        <td className="hidden md:table-cell px-6 py-4 text-sm text-foreground whitespace-nowrap text-center">
                          <div className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                            <Calendar className="w-3.5 h-3.5" />
                            {lot.expiryDate ? formatDate(lot.expiryDate, locale as 'ar' | 'en') : '—'}
                          </div>
                        </td>

                        {/* Mobile Only: Data Row (Grid cols-2) */}
                        <td className="block md:hidden w-full">
                          <div className="grid grid-cols-2 gap-4 w-full">
                            {/* Left: Available Stock */}
                            <div className="flex flex-col gap-1">
                              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                Available Stock
                              </span>
                              <span className="text-xs font-bold font-mono text-foreground">
                                {Number(lot.qtyAvailable).toLocaleString('en-US')} {lot.uomCode || ''}
                              </span>
                            </div>
                            {/* Right: Expiration Date */}
                            <div className="flex flex-col gap-1 text-end">
                              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                Expiration Date
                              </span>
                              <div className="inline-flex items-center justify-end gap-1.5 text-xs font-medium text-muted-foreground">
                                <Calendar className="w-3.5 h-3.5" />
                                {lot.expiryDate ? formatDate(lot.expiryDate, locale as 'ar' | 'en') : '—'}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Desktop Only: Status State */}
                        <td className="hidden md:table-cell px-6 py-4 text-sm text-foreground whitespace-nowrap text-center">
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
                        </td>

                        {/* Override Actions */}
                        {canManageLots && (
                          <td className="block md:table-cell px-0 md:px-6 py-0 md:py-4 text-sm text-foreground whitespace-nowrap">
                            <div className="flex justify-end md:justify-center w-full">
                              {status === 'QUARANTINE' ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleRelease(lot.id)}
                                  disabled={actionLoadingMap[lot.id]}
                                  className="h-9 px-3 border-outline-low hover:bg-status-active/10 hover:border-status-active/20 text-status-active text-[10px] uppercase tracking-wider font-bold gap-1 rounded-lg transition-all"
                                >
                                  {actionLoadingMap[lot.id] ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <ShieldCheck className="w-3 h-3" />
                                  )}
                                  Release
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleQuarantine(lot.id)}
                                  disabled={actionLoadingMap[lot.id] || status === 'EXPIRED'}
                                  className="h-9 px-3 border-outline-low hover:bg-status-error/10 hover:border-status-error/20 text-status-error text-[10px] uppercase tracking-wider font-bold gap-1 rounded-lg transition-all"
                                >
                                  {actionLoadingMap[lot.id] ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <ShieldAlert className="w-3 h-3" />
                                  )}
                                  Quarantine
                                </Button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          {lotData?.meta && lotData.meta.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-surface-highest/10 pt-6 px-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage(prev => Math.max(1, prev - 1))}
                className="h-10 px-4 border-outline-low rounded-xl text-xs font-bold gap-1"
              >
                <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
                Prev
              </Button>
              <span className="text-xs text-muted-foreground font-medium">
                Page <span className="font-bold text-foreground">{page}</span> of {lotData.meta.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page === lotData.meta.totalPages}
                onClick={() => setPage(prev => Math.min(lotData.meta.totalPages, prev + 1))}
                className="h-10 px-4 border-outline-low rounded-xl text-xs font-bold gap-1"
              >
                Next
                <ChevronRight className="w-4 h-4 rtl:rotate-180" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
