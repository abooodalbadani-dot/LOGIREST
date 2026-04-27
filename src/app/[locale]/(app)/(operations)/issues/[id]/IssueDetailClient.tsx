'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { AlertCircle } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { StatusBadge, type BadgeStatus } from '@/components/shared/StatusBadge';
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
    item_id: activeLine?.item?.id, 
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

  const isPosted = issue?.status === 'POSTED';
  const isLocked = lockState?.is_locked ?? false;

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

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <div className="relative w-24 h-24 flex items-center justify-center">
          <div className="absolute inset-0 border-4 border-cyan-500/10 rounded-full" />
          <div className="absolute inset-0 border-4 border-t-cyan-500 rounded-full animate-spin shadow-[0_0_15px_rgba(6,182,212,0.2)]" />
          <span className="text-2xl font-black text-cyan-500 tracking-tighter italic">ISS</span>
        </div>
        <div className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-500/80 animate-pulse">
          {t('synchronizing_matrix')}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <Breadcrumb 
        items={[
          { label: tCommon('modules.operations'), href: `/${locale}/issues` },
          { label: t('title'), href: `/${locale}/issues` },
          { label: isNew ? t('create_new') : t('detail_title') }
        ]} 
      />

      <PageHeader 
        title={isNew ? t('create_new') : t('detail_title')}
        description={isNew ? t('new_description') : (
          <div className="flex items-center gap-2">
            <span>{t('doc_number_short')}</span>
            <span dir="ltr" className="font-mono text-cyan-500/80">{issue?.document_number || '—'}</span>
          </div>
        )}
        actions={
          <div className="flex gap-4">
            <Button 
              variant="outline" 
              disabled={isPosted || isLocked}
              className="h-11 px-6 border-white/5 bg-surface-container-low hover:bg-surface-container-medium text-[10px] font-black uppercase tracking-widest rounded-xl transition-all"
            >
              {t('save_draft')}
            </Button>
            <div title={isLocked ? tCommon('warehouse_locked') : undefined}>
              <Button 
                disabled={isPosted || isLocked || isNew}
                onClick={() => setIsPostDialogOpen(true)}
                className="h-11 px-8 bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] font-black uppercase tracking-[0.15em] rounded-xl transition-all shadow-lg shadow-cyan-900/20 shadow-[0_0_15px_rgba(8,145,178,0.4)]"
              >
                {t('post_issue')}
              </Button>
            </div>
          </div>
        }
      />

      {(isLocked || isWarehouseLockedError) && <LockBanner lockState={lockState} />}
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 space-y-8">
          <DocumentReadOnlyOverlay isPosted={isPosted}>
            <div className="space-y-8">
              <div className="bg-surface-container-low p-8 rounded-2xl border-l-4 border-cyan-500/50 shadow-xl space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">{t('scan_and_add')}</h3>
                </div>
                <ScanInput 
                  onScan={handleScan} 
                  disabled={isPosted} 
                  placeholder={t('scan_placeholder')} 
                  onError={(bc) => setScanError(t('not_found_prefix') + bc)}
                />
                {scanError && (
                  <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-[10px] font-bold text-red-500 uppercase tracking-wider animate-in shake duration-500">
                    <AlertCircle className="w-4 h-4" />
                    {scanError}
                  </div>
                )}
              </div>
              
              <div className="bg-surface-container-low rounded-2xl border border-white/5 shadow-xl overflow-hidden">
                <div className="p-6 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">{t('line_items')}</h3>
                  <div className="text-[10px] font-mono text-cyan-500/60">{lines.length} {t('entries')}</div>
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
                        <input type="number" 
                          dir="ltr"
                          className="w-24 bg-surface-container-highest/30 border-none rounded-xl text-center px-3 py-2 font-mono text-sm focus:ring-2 focus:ring-cyan-500/50 outline-none transition-all"
                          value={line.qty as number} 
                          disabled={isPosted}
                          onChange={e => {
                            const val = Number(e.target.value);
                            setLines(prev => prev.map(l => l.id === line.id ? { ...l, qty: val } : l));
                          }} 
                        />
                      )
                    },
                    {
                      header: t('allocate'),
                      cell: (line: LineItem) => {
                        const lineAllocations = line.lot_allocations || [];
                        const totalAllocated = lineAllocations.reduce((sum: number, a: LotAllocation) => sum + a.allocated_qty, 0);
                        const isFullyAllocated = totalAllocated >= line.qty;
                        
                        return (
                          <Button 
                            variant="ghost"
                            size="sm"
                            className={`h-9 px-4 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
                              isFullyAllocated 
                                ? 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-400/10' 
                                : 'text-cyan-500 hover:text-white hover:bg-cyan-500/20'
                            }`}
                            onClick={() => handleLotClick(line)}
                            disabled={isPosted}
                          >
                            {lineAllocations.length > 0 
                              ? <span dir="ltr">{`${totalAllocated} / ${line.qty} ${t('alloc_suffix')}`}</span> 
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

        <div className="space-y-6">
          <div className="bg-surface-container-low p-6 rounded-2xl border border-white/5 shadow-[0_0_20px_rgba(0,0,0,0.1)] space-y-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 blur-[50px] -mr-16 -mt-16 rounded-full" />
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">{t('destination')}</label>
                <select 
                  value={destinationId} 
                  onChange={e => setDestinationId(e.target.value)} 
                  disabled={isPosted} 
                  className="w-full bg-surface-container-highest/30 border border-white/5 rounded-xl p-3.5 text-xs font-bold focus:ring-2 focus:ring-cyan-500/50 outline-none transition-all appearance-none cursor-pointer"
                >
                  <option value="">{t('select_department')}</option>
                  <option value="dep-1" dir="ltr">Kitchen 1</option>
                  <option value="dep-2" dir="ltr">Pastry</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">{t('requested_by') || 'Requested By'}</label>
                <input 
                  type="text"
                  value={requestedBy}
                  onChange={e => setRequestedBy(e.target.value)}
                  disabled={isPosted}
                  placeholder={t('requested_by_placeholder')}
                  className="w-full bg-surface-container-highest/30 border border-white/5 rounded-xl p-3.5 text-xs font-bold focus:ring-2 focus:ring-cyan-500/50 outline-none transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">{t('status')}</label>
                <div className="pt-1"><StatusBadge status={(issue?.status || 'DRAFT') as BadgeStatus} /></div>
              </div>
            </div>

            <div className="pt-6 border-t border-white/5 space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">{t('operational_notes')}</label>
                <textarea 
                  value={notes} 
                  onChange={e => setNotes(e.target.value)} 
                  disabled={isPosted} 
                  placeholder={t('notes_placeholder')}
                  className="w-full bg-surface-container-highest/30 border border-white/5 rounded-xl p-4 text-xs font-medium focus:ring-2 focus:ring-cyan-500/50 outline-none transition-all min-h-[120px] resize-none"
                />
              </div>
            </div>
          </div>

          {!isNew && (
             <div className="bg-surface-container-low p-6 rounded-2xl border border-white/5 shadow-xl">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 mb-4">{t('audit_metadata')}</h4>
                <div className="space-y-3">
                   <div className="flex justify-between items-center">
                      <span className="text-[10px] text-muted-foreground/40 font-medium uppercase tracking-wider">{t('created_by')}</span>
                      <span className="text-[11px] font-mono text-foreground/70" dir="ltr">{user?.name || 'System'}</span>
                   </div>
                   <div className="flex justify-between items-center">
                      <span className="text-[10px] text-muted-foreground/40 font-medium uppercase tracking-wider">{t('created_at')}</span>
                      <span className="text-[11px] font-mono text-foreground/70" dir="ltr">
                         {issue?.created_at ? new Date(issue.created_at).toLocaleDateString() : '—'}
                      </span>
                   </div>
                </div>
             </div>
          )}
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
