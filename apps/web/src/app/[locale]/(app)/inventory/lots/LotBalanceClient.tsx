'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
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
import { z } from 'zod';

export default function LotBalanceClient() {
  const t = useTranslations('operational.lots');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const { user } = useAuth();
  const { playSound } = useAudioFeedback();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [includeExpired, setIncludeExpired] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoadingMap, setActionLoadingMap] = useState<Record<string, boolean>>({});

  const { data: lotData, isLoading, isPlaceholderData } = useInventoryLots({
    include_expired: includeExpired,
    page,
  });

  const handleQuarantine = async (lotId: string) => {
    setActionLoadingMap(prev => ({ ...prev, [lotId]: true }));
    try {
      await apiClient.patch(`/lots/${lotId}/quarantine`, z.any(), {});
      playSound('success');
      toast.success('Lot successfully quarantined. Stock has been locked and excluded from future stocktake allocation.');
      queryClient.invalidateQueries({ queryKey: ['inventory/lots'] });
    } catch (err: any) {
      playSound('error');
      toast.error(err.message || 'Failed to quarantine lot.');
    } finally {
      setActionLoadingMap(prev => ({ ...prev, [lotId]: false }));
    }
  };

  const handleRelease = async (lotId: string) => {
    setActionLoadingMap(prev => ({ ...prev, [lotId]: true }));
    try {
      await apiClient.patch(`/lots/${lotId}/release-quarantine`, z.any(), {});
      playSound('success');
      toast.success('Lot successfully released from quarantine. Stock has been unlocked for operational use.');
      queryClient.invalidateQueries({ queryKey: ['inventory/lots'] });
    } catch (err: any) {
      playSound('error');
      toast.error(err.message || 'Failed to release lot.');
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
      lot.lot_number.toLowerCase().includes(term) ||
      lot.item_code.toLowerCase().includes(term) ||
      lot.item_name_en.toLowerCase().includes(term) ||
      lot.item_name_ar.includes(term)
    );
  });

  return (
    <div className="min-h-screen bg-surface text-foreground p-4 lg:p-10 space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>
      <div className="max-w-[1600px] mx-auto space-y-8">
        
        {/* Premium Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
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
              <p className="text-sm text-muted-foreground/80 max-w-2xl mt-2">
                Scan, review, and control quarantined inventory batches. Toggle lot statuses to quarantine defective goods or release cleared assets for production.
              </p>
            </div>
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-4 bg-surface-container-low p-3 rounded-2xl border border-white/5">
            <div className="flex items-center gap-2 px-2">
              <Switch
                id="expired-switch"
                checked={includeExpired}
                onCheckedChange={setIncludeExpired}
                className="data-[state=checked]:bg-operational-cyan"
              />
              <Label htmlFor="expired-switch" className="text-xs font-bold text-muted-foreground uppercase cursor-pointer">
                Include Expired Lots
              </Label>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['inventory/lots'] })}
              className="h-10 px-3 hover:bg-surface-container-high rounded-xl text-muted-foreground"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Directory Controls & Table */}
        <div className="p-6 md:p-8 rounded-[2.5rem] bg-surface-container-low border border-white/5 space-y-6 shadow-sm">
          {/* Search Inputs */}
          <div className="relative group max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40 group-focus-within:text-operational-cyan transition-colors" />
            <Input
              type="text"
              placeholder="Search by lot number, SKU, or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-12 font-medium bg-surface-container-lowest border-outline-low rounded-2xl focus:ring-operational-cyan focus:border-operational-cyan transition-all"
            />
          </div>

          {/* Table Container */}
          {isLoading ? (
            <div className="py-32 flex flex-col items-center justify-center space-y-4">
              <Loader2 className="w-8 h-8 animate-spin text-operational-cyan" />
              <p className="text-xs text-muted-foreground">Indexing ledger lots...</p>
            </div>
          ) : filteredLots.length === 0 ? (
            <div className="py-24 flex flex-col items-center justify-center text-center space-y-4">
              <div className="p-4 bg-surface-container-high rounded-full">
                <Database className="w-8 h-8 text-muted-foreground/40" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-foreground">No Lots Located</p>
                <p className="text-xs text-muted-foreground max-w-xs">
                  No inventory lots matching the active filters or search terms could be found.
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-surface-highest/10">
                    <th className="py-4 px-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 w-1/4">
                      Lot Identity
                    </th>
                    <th className="py-4 px-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 w-1/4">
                      Inventory Item SKU
                    </th>
                    <th className="py-4 px-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 text-right w-1/6">
                      Available Stock
                    </th>
                    <th className="py-4 px-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 w-1/6 text-center">
                      Expiration Date
                    </th>
                    <th className="py-4 px-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 w-1/6 text-center">
                      Status State
                    </th>
                    {canManageLots && (
                      <th className="py-4 px-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 text-center w-1/6">
                        Override Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-highest/5">
                  {filteredLots.map((lot) => {
                    const status = lot.status || (lot.is_expired ? 'EXPIRED' : 'ACTIVE');
                    return (
                      <tr key={lot.id} className="group hover:bg-surface-container-lowest/30 transition-colors">
                        <td className="py-4 px-4">
                          <div className="space-y-1">
                            <span className="text-xs font-mono font-bold text-foreground bg-surface-container-high/50 px-2 py-0.5 rounded border border-white/5">
                              {lot.lot_number}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="space-y-0.5">
                            <span className="text-[10px] font-mono text-muted-foreground">
                              {lot.item_code}
                            </span>
                            <p className="text-xs font-bold text-foreground">
                              {locale === 'ar' ? lot.item_name_ar : lot.item_name_en}
                            </p>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <span className="text-xs font-bold font-mono text-foreground">
                            {Number(lot.qty_available).toLocaleString()}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <div className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                            <Calendar className="w-3.5 h-3.5" />
                            {lot.expiry_date ? new Date(lot.expiry_date).toLocaleDateString() : '—'}
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center">
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
                        {canManageLots && (
                          <td className="py-4 px-4 text-center">
                            <div className="flex justify-center">
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
          {lotData?.meta && lotData.meta.total_pages > 1 && (
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
                Page <span className="font-bold text-foreground">{page}</span> of {lotData.meta.total_pages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page === lotData.meta.total_pages}
                onClick={() => setPage(prev => Math.min(lotData.meta.total_pages, prev + 1))}
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
