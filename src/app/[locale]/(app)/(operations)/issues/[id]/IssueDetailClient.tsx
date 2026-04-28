"use client";

import { useState, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { AlertCircle, History, Package, Clock, User, FileText, ChevronRight, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { DocumentReadOnlyOverlay } from '@/components/shared/DocumentReadOnlyOverlay';
import { ScanInput } from '@/components/shared/ScanInput/ScanInput';
import { DocumentLineItemTable, type LineItem } from '@/components/shared/DocumentLineItemTable/DocumentLineItemTable';
import { PostConfirmDialog } from '@/components/shared/PostConfirmDialog';
import { FEFOLotAllocator } from '@/components/shared/FEFOLotAllocator/FEFOLotAllocator';
import { LockBanner } from '@/components/shared/LockBanner';
import { useIssue } from '@/features/operations/hooks/useIssue';
import { usePostIssue } from '@/features/operations/hooks/usePostIssue';
import { useWarehouseLock } from '@/hooks/useWarehouseLock';
import { useLotsByItem } from '@/features/operations/hooks/useLotsByItem';
import { apiClient } from '@/lib/api/client';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/providers/AuthProvider';
import type { LotAllocation } from '@/types/documents';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { StatusTimeline, type StatusTimelineEntry } from '@/components/shared/StatusTimeline';

export function IssueDetailClient({ id, locale }: { id: string; locale: 'ar' | 'en' }) {
  const t = useTranslations('operations.issue');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const { user } = useAuth();
  
  const isNew = id === 'new';
  const { data: issue, isLoading } = useIssue(isNew ? null : id);
  const postIssue = usePostIssue(id);
  
  const [lines, setLines] = useState<LineItem[]>([]);
  const [destinationId, setDestinationId] = useState('');
  const [warehouseId, setWarehouseId] = useState('wh-1');
  const [notes, setNotes] = useState('');
  const [scanError, setScanError] = useState('');
  const [requestedBy, setRequestedBy] = useState('');
  
  const [isPostDialogOpen, setIsPostDialogOpen] = useState(false);
  const [isWarehouseLockedError, setIsWarehouseLockedError] = useState(false);

  // FEFO Allocator State
  const [fefoOpen, setFefoOpen] = useState(false);
  const [activeLine, setActiveLine] = useState<LineItem | null>(null);

  // Auto fetch lots when activeLine changes
  const { data: lots = [] } = useLotsByItem({ 
    item_id: activeLine?.item?.id || '', 
    warehouse_id: warehouseId 
  });

  // Lock Banner state
  const { data: lockState } = useWarehouseLock(warehouseId);

  useEffect(() => {
    if (issue) {
      setTimeout(() => {
        setLines((issue.lines || []) as unknown as LineItem[]);
        setDestinationId(issue.destination_dept_id ?? issue.destination_department_id ?? '');
        setRequestedBy(issue.requested_by ?? '');
        setWarehouseId(issue.warehouse_id || 'wh-1');
        setNotes(issue.notes || '');
      }, 0);
    }
  }, [issue]);

  const handleScan = async (barcode: string) => {
    try {
      setScanError('');
      const ItemSchema = z.object({
        data: z.array(z.object({
          id: z.string(), code: z.string(), name_ar: z.string(), name_en: z.string(),
          primary_uom: z.object({ id: z.string(), code: z.string(), name_ar: z.string(), name_en: z.string() })
        }))
      });
      const res = await apiClient.get(`/master-data/items?barcode=${barcode}`, ItemSchema);
      if (res.data && res.data.length > 0) {
        const item = res.data[0];
        setLines(prev => {
          const existing = prev.find(l => l.item.id === item.id);
          if (existing) {
            return prev.map(l => l.item.id === item.id ? { ...l, qty: l.qty + 1 } : l);
          }
          return [...prev, {
            id: `new-${Date.now()}`,
            item,
            qty: 1,
            uom_id: item.primary_uom.id,
            lot_allocations: []
          }];
        });
      } else {
        setScanError(t('no_item_found'));
      }
    } catch {
      setScanError(t('no_item_found'));
    }
  };

  const removeLine = (lineId: string) => {
    setLines(prev => prev.filter(l => l.id !== lineId));
  };

  const handleLotClick = (line: LineItem) => {
    setActiveLine(line);
    setFefoOpen(true);
  };

  const handlePost = async () => {
    try {
      await postIssue.mutateAsync({ confirmation: 'ACKNOWLEDGE_IRREVERSIBLE' });
      setIsPostDialogOpen(false);
      router.push(`/${locale}/issues`);
    } catch (err: unknown) {
      const apiErr = err as { code?: string };
      if (apiErr?.code === 'WAREHOUSE_LOCKED') {
        setIsWarehouseLockedError(true);
        setIsPostDialogOpen(false);
      }
    }
  };

  // History Timeline Mock/Derived
  const history = useMemo((): StatusTimelineEntry[] => {
    if (!issue) return [];
    const h: StatusTimelineEntry[] = [
      { status: 'draft', at: issue.created_at ?? '', by: issue.created_by != null ? issue.created_by : 'System' }
    ];
    if (issue.posted_at) {
      h.push({ status: 'posted', at: issue.posted_at, by: issue.posted_by != null ? issue.posted_by : 'System' });
    }
    return h;
  }, [issue]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8">
        <div className="relative w-32 h-32 flex items-center justify-center">
          <div className="absolute inset-0 border-4 border-cyan-500/5 rounded-full" />
          <div className="absolute inset-0 border-4 border-t-cyan-500/40 rounded-full animate-spin shadow-[0_0_20px_rgba(6,182,212,0.1)]" />
          <div className="absolute inset-4 border-2 border-b-emerald-500/40 rounded-full animate-spin-slow" />
          <Package className="w-10 h-10 text-cyan-500/60 animate-pulse" />
        </div>
        <div className="flex flex-col items-center gap-2">
          <div className="text-[10px] font-black uppercase tracking-[0.4em] text-cyan-500/80 animate-pulse">
            {t('synchronizing_matrix')}
          </div>
          <div className="h-0.5 w-12 bg-gradient-to-e from-transparent via-cyan-500/30 to-transparent" />
        </div>
      </div>
    );
  }

  const isPosted = issue?.status === 'POSTED';
  const isLocked = lockState?.is_locked ?? false;

  return (
    <div className="min-h-screen bg-surface-container-lowest/50 p-6 lg:p-10 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-4">
          <Breadcrumb 
            items={[
              { label: tCommon('modules.operations'), href: `/${locale}/issues` },
              { label: t('title'), href: `/${locale}/issues` },
              { label: isNew ? t('create_new') : t('detail_title') }
            ]} 
          />
          <div className="space-y-1">
            <h1 className="text-4xl font-black tracking-tighter uppercase italic bg-gradient-to-e from-foreground to-foreground/50 bg-clip-text text-transparent">
              {isNew ? t('create_new') : t('detail_title')}
            </h1>
            {!isNew && (
              <div className="flex items-center gap-3">
                <div className="px-3 py-1 bg-cyan-500/10 rounded-full flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-cyan-500/80">
                    {issue?.document_number || '—'}
                  </span>
                </div>
                {isPosted && (
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500/60 flex items-center gap-1.5">
                    <Clock className="w-3 h-3" />
                    {issue.posted_at ? new Date(issue.posted_at).toLocaleDateString() : ''}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <PermissionGate action="create" resource="issue">
            <Button 
              variant="outline" 
              disabled={isPosted || isLocked}
              className="h-12 px-6 border-none bg-surface-container-low hover:bg-surface-container-medium text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-sm transition-all"
            >
              {t('save_draft')}
            </Button>
          </PermissionGate>
          <PermissionGate action="post" resource="issue">
            <Button 
              disabled={isPosted || isLocked || isNew}
              onClick={() => setIsPostDialogOpen(true)}
              className="h-12 px-10 bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl transition-all shadow-xl shadow-cyan-900/20 active:scale-95"
            >
              {t('post_issue')}
            </Button>
          </PermissionGate>
        </div>
      </div>

      {(isLocked || isWarehouseLockedError) && <LockBanner lockState={lockState} />}
      
      <div className="grid grid-cols-12 gap-8">
        <div className="col-span-12 lg:col-span-8 space-y-8">
          <DocumentReadOnlyOverlay isPosted={isPosted}>
            <div className="space-y-8">
              {!isPosted && (
                <div className="bg-surface-container-low p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden group transition-all hover:bg-surface-container-medium/50">
                  <div className="absolute top-0 end-0 w-64 h-64 bg-cyan-500/5 blur-[80px] -me-32 -mt-32 rounded-full transition-all group-hover:bg-cyan-500/10" />
                  <div className="relative space-y-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                        <Package className="w-4 h-4 text-cyan-500" />
                      </div>
                      <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-foreground/70">{t('scan_and_add')}</h3>
                    </div>
                    <ScanInput 
                      onScan={handleScan} 
                      disabled={isPosted} 
                      placeholder={t('scan_placeholder')} 
                      onError={(bc) => setScanError(t('not_found_prefix') + bc)}
                    />
                    {scanError && (
                      <div className="flex items-center gap-3 p-4 bg-red-500/5 rounded-2xl text-[10px] font-bold text-red-500 uppercase tracking-wider animate-in shake duration-500">
                        <AlertCircle className="w-4 h-4" />
                        {scanError}
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              <div className="bg-surface-container-low rounded-[2.5rem] shadow-2xl overflow-hidden relative">
                <div className="p-8 flex justify-between items-center bg-white/[0.01]">
                  <div className="flex items-center gap-4">
                    <div className="w-1.5 h-6 bg-cyan-500/30 rounded-full" />
                    <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-foreground/80">{t('line_items')}</h3>
                  </div>
                  <div className="px-4 py-2 bg-foreground/5 rounded-full text-[10px] font-mono text-foreground/50 tracking-tighter">
                    {lines.length} {t('entries').toUpperCase()}
                  </div>
                </div>
                <DocumentLineItemTable 
                  lines={lines} 
                  locale={locale as 'ar' | 'en'}
                  isReadOnly={isPosted}
                  onRemoveLine={removeLine}
                  extraColumns={[
                    {
                      header: t('qty'),
                      cell: (line) => (
                        <div className="flex items-center gap-2">
                          <input type="number" 
                            dir="ltr"
                            className="w-20 bg-surface-container-highest/20 border-none rounded-xl text-center px-2 py-2 font-mono text-sm focus:ring-2 focus:ring-cyan-500/30 outline-none transition-all disabled:opacity-50"
                            value={line.qty as number} 
                            disabled={isPosted}
                            onChange={e => {
                              const val = Number(e.target.value);
                              setLines(prev => prev.map(l => l.id === line.id ? { ...l, qty: val } : l));
                            }} 
                          />
                          <span className="text-[10px] font-black uppercase text-muted-foreground/40 tracking-widest">{line.item.primary_uom.code}</span>
                        </div>
                      )
                    },
                    {
                      header: t('allocate'),
                      cell: (line: LineItem) => {
                        const lineAllocations = line.lot_allocations || [];
                        const totalAllocated = lineAllocations.reduce((sum: number, a: LotAllocation) => sum + a.allocated_qty, 0);
                        const isFullyAllocated = totalAllocated >= line.qty;
                        
                        if (isPosted) {
                          return (
                            <div className="flex flex-wrap gap-1.5 max-w-[200px]">
                              {lineAllocations.map((alloc, idx) => (
                                <div key={idx} className="px-2.5 py-1 bg-emerald-500/10 rounded-lg flex items-center gap-1.5">
                                  <span className="text-[9px] font-mono text-emerald-500/80 tracking-tighter">{alloc.lot_number}</span>
                                  <div className="w-1 h-1 rounded-full bg-emerald-500/30" />
                                  <span className="text-[9px] font-black text-emerald-500">{alloc.allocated_qty}</span>
                                </div>
                              ))}
                              {lineAllocations.length === 0 && (
                                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/30">—</span>
                              )}
                            </div>
                          );
                        }

                        return (
                          <Button 
                            variant="ghost"
                            size="sm"
                            className={`h-10 px-5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${
                              isFullyAllocated 
                                ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20' 
                                : 'bg-cyan-500/10 text-cyan-500 hover:bg-cyan-500/20'
                            }`}
                            onClick={() => handleLotClick(line)}
                          >
                            {lineAllocations.length > 0 
                              ? <div className="flex items-center gap-2" dir="ltr">
                                  <span>{totalAllocated}</span>
                                  <div className="w-1 h-1 rounded-full bg-current/30" />
                                  <span className="opacity-50">{line.qty}</span>
                                </div> 
                              : t('allocate')}
                          </Button>
                        );
                      }
                    }
                  ]}
                />
              </div>
            </div>
          </DocumentReadOnlyOverlay>
        </div>

        <div className="col-span-12 lg:col-span-4 space-y-8">
          <div className="bg-surface-container-low p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden">
            <div className="absolute top-0 start-0 w-32 h-32 bg-cyan-500/5 blur-[50px] -ms-16 -mt-16 rounded-full" />
            <div className="relative space-y-10">
              <div className="flex items-center gap-4 border-b border-white/5 pb-6">
                <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-cyan-500" />
                </div>
                <div>
                  <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-foreground/80">{t('document_manifest')}</h3>
                  <p className="text-[10px] text-muted-foreground/50 tracking-wider font-medium">{t('operational_parameters')}</p>
                </div>
              </div>

              <div className="space-y-8">
                <div className="space-y-3 group">
                  <div className="flex items-center gap-2">
                    <ArrowRight className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity rtl:rotate-180" />
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">{t('destination')}</label>
                  </div>
                  <div className="relative">
                    <select 
                      value={destinationId} 
                      onChange={e => setDestinationId(e.target.value)} 
                      disabled={isPosted} 
                      className="w-full bg-surface-container-highest/20 border-none rounded-2xl p-4 text-xs font-bold focus:ring-2 focus:ring-cyan-500/30 outline-none transition-all appearance-none cursor-pointer pe-10"
                    >
                      <option value="">{t('select_department')}</option>
                      <option value="dep-1" dir="ltr">Kitchen 1</option>
                      <option value="dep-2" dir="ltr">Pastry</option>
                    </select>
                    <div className="absolute end-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-20">
                      <ChevronRight className="w-4 h-4 rotate-90" />
                    </div>
                  </div>
                </div>

                <div className="space-y-3 group">
                  <div className="flex items-center gap-2">
                    <User className="w-3 h-3 text-cyan-500/50" />
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">{t('requested_by') || 'Requested By'}</label>
                  </div>
                  <input 
                    type="text"
                    value={requestedBy}
                    onChange={e => setRequestedBy(e.target.value)}
                    disabled={isPosted}
                    placeholder={t('requested_by_placeholder')}
                    className="w-full bg-surface-container-highest/20 border-none rounded-2xl p-4 text-xs font-bold focus:ring-2 focus:ring-cyan-500/30 outline-none transition-all placeholder:text-muted-foreground/20"
                  />
                </div>

                <div className="space-y-3 group pt-4">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3 h-3 text-cyan-500/50" />
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">{t('operational_notes')}</label>
                  </div>
                  <textarea 
                    value={notes} 
                    onChange={e => setNotes(e.target.value)} 
                    disabled={isPosted} 
                    placeholder={t('notes_placeholder')}
                    className="w-full bg-surface-container-highest/20 border-none rounded-2xl p-5 text-xs font-medium focus:ring-2 focus:ring-cyan-500/30 outline-none transition-all min-h-[140px] resize-none placeholder:text-muted-foreground/20 leading-relaxed"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-surface-container-low p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden group transition-all">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <History className="w-5 h-5 text-emerald-500" />
              </div>
              <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-foreground/80">{t('status_history')}</h4>
            </div>
            
            <div className="relative ps-2">
              <StatusTimeline entries={history} />
            </div>

            {!isNew && (
              <div className="mt-10 pt-8 border-t border-white/5 space-y-4">
                <div className="flex justify-between items-center group">
                  <span className="text-[10px] text-muted-foreground/40 font-black uppercase tracking-[0.15em]">{t('created_by')}</span>
                  <div className="px-3 py-1 bg-foreground/5 rounded-lg">
                    <span className="text-[11px] font-mono text-foreground/70" dir="ltr">{user?.name || 'System'}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-muted-foreground/40 font-black uppercase tracking-[0.15em]">{t('created_at')}</span>
                  <div className="px-3 py-1 bg-foreground/5 rounded-lg">
                    <span className="text-[11px] font-mono text-foreground/70" dir="ltr">
                      {issue?.created_at ? new Date(issue.created_at).toLocaleDateString() : '—'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <PostConfirmDialog 
        open={isPostDialogOpen} 
        onOpenChange={setIsPostDialogOpen}
        title={t('post_confirm_title')}
        description={t('post_confirm_desc')}
        warningText=""
        requiresTextConfirmation={true}
        onConfirm={handlePost}
        isLoading={postIssue.isPending}
      />

      <Dialog open={fefoOpen} onOpenChange={setFefoOpen}>
        <DialogContent className="max-h-[85vh] max-w-2xl bg-surface-container-lowest border border-white/5 rounded-3xl shadow-2xl p-0 overflow-hidden">
          <div className="p-8 border-b border-white/5 bg-white/[0.02]">
            <DialogHeader>
              <DialogTitle className="text-xl font-display font-bold tracking-tight">
                {t('fefo_drawer_title')}: <span className="text-cyan-500 font-mono">{locale === 'ar' ? activeLine?.item.name_ar : activeLine?.item.name_en}</span>
              </DialogTitle>
            </DialogHeader>
          </div>
          <div className="p-8">
            {activeLine && (
              <FEFOLotAllocator
                lots={lots}
                requestedQty={activeLine.qty}
                uomLabel={activeLine.item.primary_uom.code}
                userRole={user?.role || 'WH_KEEPER'}
                onAllocate={(allocations) => {
                  setLines(prev => prev.map(l => l.id === activeLine.id ? {
                    ...l, lot_allocations: allocations
                  } : l));
                  setFefoOpen(false);
                }}
                onClose={() => setFefoOpen(false)}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
