"use client";

import { useState, useEffect, useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { AlertCircle, History, Package, Clock, User, FileText, ArrowRight, ArrowLeft, Save, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DocumentReadOnlyOverlay } from '@/components/shared/DocumentReadOnlyOverlay';
import { ScanInput } from '@/components/shared/ScanInput/ScanInput';
import { DocumentLineItemTable, type LineItem } from '@/components/shared/DocumentLineItemTable/DocumentLineItemTable';
import { PostConfirmDialog } from '@/components/shared/PostConfirmDialog';
import { FEFOLotAllocator } from '@/components/shared/FEFOLotAllocator/FEFOLotAllocator';
import { LockBanner } from '@/components/shared/LockBanner';
import { usePostIssue } from '@/features/operations/hooks/usePostIssue';
import { useWarehouseLock } from '@/hooks/useWarehouseLock';
import { useLotsByItem } from '@/features/operations/hooks/useLotsByItem';
import { apiClient } from '@/lib/api/client';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { canPerformActionV2, isDocumentLocked, type DocumentStatus } from '@/core/workflow/document-engine';
import { useAuth } from '@/providers/AuthProvider';
import type { LotAllocation } from '@/types/documents';
import { ActionGuard } from '@/core/workflow/ActionGuard';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { StatusTimeline, type StatusTimelineEntry, type Status } from '@/components/shared/StatusTimeline';
import { cn } from '@/lib/utils';
import { ISSUE_STATUS } from '@/contracts/statuses';

interface IssueFormProps {
  issue: any;
  id: string;
  isNew: boolean;
  onConflict?: () => void;
}

export function IssueForm({ issue, id, isNew, onConflict }: IssueFormProps) {
  const t = useTranslations('operations.issue');
  const locale = useLocale();
  const router = useRouter();
  const { user } = useAuth();
  
  const postIssue = usePostIssue(id, { onConflict });
  
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

  // Workflow Engine Integrations
  const status = (issue?.status || ISSUE_STATUS.DRAFT) as DocumentStatus;
  const isDocLocked = isDocumentLocked("ISSUE", status);
  const isWarehouseLocked = !!lockState?.isLocked;
  
  const canEdit = !isDocLocked;

  useEffect(() => {
    if (issue) {
      setLines((issue.lines || []) as unknown as LineItem[]);
      setDestinationId(issue.destination_dept_id ?? issue.destination_department_id ?? '');
      setRequestedBy(issue.requested_by ?? '');
      setWarehouseId(issue.warehouse_id || 'wh-1');
      setNotes(issue.notes || '');
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
      await postIssue.mutateAsync({ 
        confirmation: 'ACKNOWLEDGE_IRREVERSIBLE',
        version: issue.version
      });
      setIsPostDialogOpen(false);
      router.push('/issues');
    } catch (err: unknown) {
      const apiErr = err as { code?: string };
      if (apiErr?.code === 'WAREHOUSE_LOCKED') {
        setIsWarehouseLockedError(true);
        setIsPostDialogOpen(false);
      }
    }
  };

  const history = useMemo((): StatusTimelineEntry[] => {
    if (!issue) return [];
    const h: StatusTimelineEntry[] = [
      { status: ISSUE_STATUS.DRAFT.toLowerCase() as Status, at: issue.created_at ?? '', by: issue.created_by != null ? issue.created_by : 'System' }
    ];
    if (issue.posted_at) {
      h.push({ status: ISSUE_STATUS.POSTED.toLowerCase() as Status, at: issue.posted_at, by: issue.posted_by != null ? issue.posted_by : 'System' });
    }
    return h;
  }, [issue]);

  return (
    <div className="min-h-screen bg-surface-container-low flex flex-col animate-in fade-in duration-1000">
      <div className="glass-header sticky top-0 z-50 h-16 px-6 lg:px-10 flex items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => router.back()} 
            className="rounded-lg shrink-0 hover:bg-primary/5 transition-colors"
          >
            <ArrowLeft className={cn("w-5 h-5 text-primary", locale === 'ar' && "rotate-180")} />
          </Button>
          <div className="flex flex-col">
            <div className="flex items-center gap-3">
              <h1 className="text-title-lg font-semibold uppercase italic text-foreground leading-none">
                {isNew ? t('create_new') : t('detail_title')}
              </h1>
              {!isNew && (
                <div className="px-2 py-0.5 bg-primary/10 rounded flex items-center gap-1.5">
                  <span className="text-label-xxs font-semibold uppercase text-primary leading-none">
                    {issue?.document_number || '—'}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <PermissionGate action="create" resource="issue">
            <ActionGuard documentType="ISSUE" status={status} action="EDIT" role={user?.role || 'WH_KEEPER'}>
              <Button 
                variant="ghost" 
                disabled={isWarehouseLocked}
                className="h-9 px-6 text-label-xs font-semibold uppercase rounded-lg transition-all"
              >
                <Save className="w-4 h-4 me-2 opacity-40" />
                {t('save_draft')}
              </Button>
            </ActionGuard>
          </PermissionGate>
          <PermissionGate action="post" resource="issue">
            <ActionGuard documentType="ISSUE" status={status} action="POST" role={user?.role || 'WH_KEEPER'}>
              <Button 
                disabled={isWarehouseLocked || isNew}
                onClick={() => setIsPostDialogOpen(true)}
                className="h-9 px-8 primary-gradient text-white text-label-xs font-semibold uppercase shadow-xl shadow-primary/20 transition-all active:scale-95 border-none rounded-lg"
              >
                <Send className="w-4 h-4 me-2" />
                {t('post_issue')}
              </Button>
            </ActionGuard>
          </PermissionGate>
        </div>
      </div>

      <div className="px-6 lg:px-10 py-10 space-y-10">
        {(isDocLocked || isWarehouseLockedError) && <LockBanner lockState={lockState} />}
        
        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-12 lg:col-span-8 space-y-8">
            <DocumentReadOnlyOverlay isPosted={isDocLocked}>
              <div className="space-y-8">
                {canEdit && (
                  <div className="bg-surface-container-lowest p-8 rounded-lg shadow-sm relative overflow-hidden group transition-all hover:shadow-md">
                    <div className="relative space-y-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Package className="w-4 h-4 text-primary" />
                        </div>
                        <h3 className="text-label-xs font-semibold uppercase text-primary/30 group-hover:text-primary transition-colors">{t('scan_and_add')}</h3>
                      </div>
                      <ScanInput 
                        onScan={handleScan} 
                        disabled={isDocLocked} 
                        placeholder={t('scan_placeholder')} 
                        onError={(bc) => setScanError(t('not_found_prefix') + bc)}
                        className="bg-surface-container-low rounded-lg transition-all focus-within:ring-1 focus-within:ring-primary-fixed-dim/10 shadow-none border-none"
                      />
                      {scanError && (
                        <div className="flex items-center gap-3 p-4 bg-red-500/5 rounded-xl text-label-xs font-bold text-red-500 uppercase animate-in shake duration-500">
                          <AlertCircle className="w-4 h-4" />
                          {scanError}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                <div className="bg-surface-container-lowest rounded-lg overflow-hidden shadow-sm">
                  <div className="p-8 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <div className="w-1 h-6 bg-primary/20 rounded-full" />
                      <h3 className="text-label-xs font-semibold uppercase text-primary/30">{t('line_items')}</h3>
                    </div>
                    <div className="px-4 py-2 bg-surface-container-low rounded-lg text-label-xs font-mono text-primary/40">
                      {lines.length} {t('entries').toUpperCase()}
                    </div>
                  </div>
                  <DocumentLineItemTable 
                    lines={lines} 
                    locale={locale as 'ar' | 'en'} isReadOnly={isDocLocked}
                    onRemoveLine={removeLine}
                    extraColumns={[
                      {
                        header: t('qty'),
                        cell: (line) => (
                          <div className="flex items-center gap-2">
                            <Input 
                              type="number" 
                              dir="ltr"
                              className="w-24 h-10 bg-surface-container-low border-none rounded-lg text-center font-mono text-body-md shadow-none focus-visible:ring-1 focus-visible:ring-primary-fixed-dim/10 disabled:opacity-50 transition-all"
                              value={line.qty as number} 
                              disabled={isDocLocked}
                              onChange={e => {
                                const val = Number(e.target.value);
                                setLines(prev => prev.map(l => l.id === line.id ? { ...l, qty: val } : l));
                              }} 
                            />
                            <span className="text-label-xs font-semibold uppercase text-primary/20">{line.item.primary_uom.code}</span>
                          </div>
                        )
                      },
                      {
                        header: t('allocate'),
                        cell: (line: LineItem) => {
                          const lineAllocations = line.lot_allocations || [];
                          const totalAllocated = lineAllocations.reduce((sum: number, a: LotAllocation) => sum + a.allocated_qty, 0);
                          const isFullyAllocated = totalAllocated >= line.qty;
                          
                          if (isDocLocked) {
                            return (
                              <div className="flex flex-wrap gap-1.5 max-w-[200px]">
                                {lineAllocations.map((alloc, idx) => (
                                  <div key={idx} className="px-2.5 py-1 bg-emerald-500/10 rounded-lg flex items-center gap-1.5">
                                    <span className="text-label-xxs font-mono text-emerald-500/80">{alloc.lot_number}</span>
                                    <div className="w-1 h-1 rounded-full bg-emerald-500/30" />
                                    <span className="text-label-xxs font-semibold text-emerald-500">{alloc.allocated_qty}</span>
                                  </div>
                                ))}
                                {lineAllocations.length === 0 && (
                                  <span className="text-label-xxs font-semibold uppercase text-muted-foreground/30">—</span>
                                )}
                              </div>
                            );
                          }

                          return (
                            <Button 
                              variant="ghost"
                              size="sm"
                              className={`h-10 px-5 text-label-xs font-semibold uppercase rounded-lg transition-all ${ isFullyAllocated ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20' : 'bg-primary/10 text-primary hover:bg-primary/20' }`}
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
            <div className="bg-surface-container-lowest p-8 rounded-lg shadow-sm relative overflow-hidden group transition-all hover:shadow-md">
              <div className="relative space-y-10">
                <div className="flex items-center gap-4 pb-6">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FileText className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-label-xs font-semibold uppercase text-primary/30 group-hover:text-primary transition-colors">{t('document_manifest')}</h3>
                    <p className="text-label-xs text-primary/20 font-bold">{t('operational_parameters')}</p>
                  </div>
                </div>

                <div className="space-y-8">
                  <div className="space-y-3 group">
                    <div className="flex items-center gap-2">
                      <ArrowRight className={cn("w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity", locale === 'ar' ? "rotate-180" : "")} />
                      <label className="text-label-xs font-semibold uppercase text-muted-foreground/60">{t('destination')}</label>
                    </div>
                    <Select 
                      value={destinationId} 
                      onValueChange={(val) => setDestinationId(val || '')} 
                      disabled={isDocLocked}
                    >
                      <SelectTrigger className="w-full h-12 bg-surface-container-highest border-none rounded-lg px-4 font-bold text-label-sm transition-all shadow-none focus:ring-1 focus:ring-primary-fixed-dim/10">
                        <SelectValue placeholder={t('select_department')} />
                      </SelectTrigger>
                      <SelectContent className="bg-surface-container-highest border-none rounded-lg shadow-2xl">
                        <SelectItem value="dep-1" className="text-label-sm font-bold focus:bg-primary/10 focus:text-primary">Kitchen 1</SelectItem>
                        <SelectItem value="dep-2" className="text-label-sm font-bold focus:bg-primary/10 focus:text-primary">Pastry</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3 group">
                    <div className="flex items-center gap-2">
                      <User className="w-3 h-3 text-cyan-500/50" />
                      <label className="text-label-xs font-semibold uppercase text-muted-foreground/60">{t('requested_by') || 'Requested By'}</label>
                    </div>
                    <Input 
                      type="text"
                      value={requestedBy}
                      onChange={e => setRequestedBy(e.target.value)}
                      disabled={isDocLocked}
                      placeholder={t('requested_by_placeholder')}
                      className="w-full h-12 bg-surface-container-highest border-none rounded-lg px-4 font-bold text-label-sm transition-all placeholder:text-muted-foreground/20 shadow-none focus-visible:ring-1 focus-visible:ring-primary-fixed-dim/10"
                    />
                  </div>

                  <div className="space-y-3 group pt-4">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3 h-3 text-cyan-500/50" />
                      <label className="text-label-xs font-semibold uppercase text-muted-foreground/60">{t('operational_notes')}</label>
                    </div>
                    <Textarea 
                      value={notes} 
                      onChange={e => setNotes(e.target.value)} 
                      disabled={isDocLocked} 
                      placeholder={t('notes_placeholder')}
                      className="w-full bg-surface-container-highest border-none rounded-lg p-5 text-label-sm font-medium transition-all min-h-[140px] resize-none placeholder:text-muted-foreground/20 leading-relaxed shadow-none focus-visible:ring-1 focus-visible:ring-primary-fixed-dim/10"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-surface-container-lowest p-8 rounded-lg shadow-sm relative overflow-hidden group transition-all hover:shadow-md">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <History className="w-5 h-5 text-primary" />
                </div>
                <h4 className="text-label-xs font-semibold uppercase text-primary/30 group-hover:text-primary transition-colors">{t('status_history')}</h4>
              </div>
              
              <div className="relative ps-2">
                <StatusTimeline entries={history} />
              </div>

              {!isNew && (
                <div className="mt-10 pt-8 border-t border-primary/5 space-y-4">
                  <div className="flex justify-between items-center group">
                    <span className="text-label-xs text-primary/20 font-semibold uppercase">{t('created_by')}</span>
                    <div className="px-3 py-1 bg-surface-container-low rounded-lg transition-colors group-hover:bg-primary/5">
                      <span className="text-label-xs font-mono font-semibold text-primary/60 group-hover:text-primary transition-colors" dir="ltr">{user?.name || 'System'}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center group">
                    <span className="text-label-xs text-primary/20 font-semibold uppercase">{t('created_at')}</span>
                    <div className="px-3 py-1 bg-surface-container-low rounded-lg transition-colors group-hover:bg-primary/5">
                      <span className="text-label-xs font-mono font-semibold text-primary/60 group-hover:text-primary transition-colors" dir="ltr">
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
            <DialogContent className="max-h-[85vh] max-w-2xl bg-surface-container-lowest border-none shadow-2xl rounded-lg p-0 overflow-hidden">
              <div className="p-8 border-b border-primary/5 bg-primary/[0.02]">
                <DialogHeader>
                  <DialogTitle className="text-title-lg font-semibold uppercase italic italic text-foreground">
                    {t('fefo_drawer_title')}: <span className="text-primary font-mono">{locale === 'ar' ? activeLine?.item.name_ar : activeLine?.item.name_en}</span>
                  </DialogTitle>
                </DialogHeader>
              </div>
              <div className="p-8">
                {activeLine && (
                  <FEFOLotAllocator
                    lots={lots}
                    requestedQty={activeLine.qty}
                    uomLabel={activeLine.item.primary_uom.code}
                    userRole={user?.role || 'WH_KEEPER'} onAllocate={(allocations) => {
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
      </div>
    </div>
  );
}
