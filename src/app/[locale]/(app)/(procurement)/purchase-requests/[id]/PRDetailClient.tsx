'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { usePR } from '@/features/purchasing/hooks/usePR';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/PageHeader';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { DocumentReadOnlyOverlay } from '@/components/shared/DocumentReadOnlyOverlay';
import { DocumentLineItemTable, type LineItem } from '@/components/shared/DocumentLineItemTable/DocumentLineItemTable';
import { StatusBadge, type BadgeStatus } from '@/components/shared/StatusBadge';
import { StatusTimeline, type Status } from '@/components/shared/StatusTimeline';
import { 
 Edit3, 
 CheckCircle, 
 ArrowRight, 
 History, 
 Building2, 
 Clock, 
 FileText,
 Package,
 ShieldCheck,
 ExternalLink
} from 'lucide-react';

export function PRDetailClient({ id, locale }: { id: string | null; locale: 'ar' | 'en' }) {
 const t = useTranslations('procurement.pr');
 const tc = useTranslations('common');
 const router = useRouter();

 const { data: pr, isLoading } = usePR(id);

 if (isLoading) return (
 <div className="min-h-screen bg-surface-container-low p-10 flex items-center justify-center">
 <div className="flex flex-col items-center justify-center space-y-8 animate-pulse">
 <div className="relative w-32 h-32 flex items-center justify-center">
 <div className="absolute inset-0 border-4 border-primary/5 rounded-full" />
 <div className="absolute inset-0 border-4 border-t-primary rounded-full animate-spin" />
 <Package className="w-10 h-10 text-primary/40 animate-pulse" />
 </div>
 <p className="text-label-xs font-semibold uppercase text-primary/60">{t('sync_context')}</p>
 </div>
 </div>
 );

 if (!pr) return null;

 const isReadOnly = pr.status !== 'DRAFT';
 const mockTimeline = [
 { status: 'draft' as Status, at: pr.created_at || new Date().toISOString(), by: pr.created_by || 'System' },
 ...(pr.status === 'SUBMITTED' || pr.status === 'APPROVED' || pr.status === 'REJECTED' ? [
 { status: 'submitted' as Status, at: new Date().toISOString(), by: pr.created_by || 'System' }
 ] : []),
 ...(pr.status === 'APPROVED' ? [
 { status: 'approved' as Status, at: new Date().toISOString(), by: 'Approver' }
 ] : []),
 ...(pr.status === 'REJECTED' ? [
 { status: 'rejected' as Status, at: new Date().toISOString(), by: 'Approver' }
 ] : [])
 ];

 const headerActions = (
 <div className="flex items-center gap-3">
 {pr.status === 'DRAFT' && (
 <PermissionGate action="update" resource="pr">
 <Button
 onClick={() => router.push(`/ ${locale}/purchase-requests/ ${id}/edit`)}
 variant="outline"
 className="h-11 px-6 text-label-xs font-semibold uppercase rounded-[var(--radius)] border-operational-cyan/20 text-operational-cyan hover:bg-operational-cyan/5 hover:border-operational-cyan/40 transition-all"
 >
 <Edit3 className="w-4 h-4 me-2 opacity-60" />
 {tc('edit')}
 </Button>
 </PermissionGate>
 )}

 {pr.status === 'SUBMITTED' && (
 <PermissionGate action="approve" resource="pr">
 <Button
 onClick={() => router.push(`/ ${locale}/purchase-requests/ ${id}/approve`)}
 className="h-11 px-8 bg-operational-cyan hover:bg-operational-cyan/90 text-primary-foreground text-label-xs font-semibold uppercase shadow-sm rounded-[var(--radius)] transition-all active:scale-95"
 >
 <ShieldCheck className="w-4 h-4 me-2" />
 {t('go_to_approval')}
 </Button>
 </PermissionGate>
 )}

 {pr.status === 'APPROVED' && (
 <PermissionGate action="create" resource="po">
 <Button
 onClick={() => router.push(`/ ${locale}/purchase-orders/new?pr_id=${id}`)}
 className="primary-gradient h-11 px-8 text-white text-label-xs font-semibold uppercase rounded-lg transition-all active:scale-95 border-none"
 >
 <ArrowRight className="w-4 h-4 me-2 rtl:rotate-180" />
 {t('convert_to_po')}
 </Button>
 </PermissionGate>
 )}
 </div>
 );

 return (
 <div className="min-h-screen bg-surface-container-low">
 <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-10 flex flex-col gap-10 relative animate-in fade-in slide-in-from-bottom-4 duration-700">
 <PageHeader
 title={pr.document_number}
 description={t('specification')}
 status={pr.status as BadgeStatus}
 actions={headerActions}
 />

 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
 <div className="bg-surface-container-lowest p-6 rounded-lg flex flex-col gap-1 group transition-all relative overflow-hidden border border-surface-variant/5">
 <div className="absolute top-0 end-0 p-4 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity">
 <Building2 className="w-12 h-12" />
 </div>
 <label className="text-label-xs font-semibold uppercase text-muted-foreground/50 group-hover:text-operational-cyan/60 transition-colors">
 {t('department')}
 </label>
 <p className="font-bold text-title-sm">{pr.department_id}</p>
 </div>

 <div className="bg-surface-container-lowest p-6 rounded-lg flex flex-col gap-1 group transition-all relative overflow-hidden border border-surface-variant/5">
 <div className="absolute top-0 end-0 p-4 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity">
 <Clock className="w-12 h-12" />
 </div>
 <label className="text-label-xs font-semibold uppercase text-muted-foreground/50 group-hover:text-operational-cyan/60 transition-colors">
 {t('expected_date')}
 </label>
 <p className="font-mono font-bold text-title-sm text-foreground/80" dir="ltr">{pr.expected_date}</p>
 </div>

 <div className="bg-surface-container-lowest p-6 rounded-lg flex flex-col gap-1 group transition-all relative overflow-hidden border border-surface-variant/5">
 <div className="absolute top-0 end-0 p-4 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity text-operational-cyan">
 <Package className="w-12 h-12" />
 </div>
 <label className="text-label-xs font-semibold uppercase text-muted-foreground/50 group-hover:text-operational-cyan/60 transition-colors">
 {tc('status_label')}
 </label>
 <div className="flex items-center gap-2">
 <StatusBadge status={pr.status as BadgeStatus} />
 <span className="text-label-xs font-semibold uppercase text-operational-cyan opacity-40">#{pr.id.split('-').pop()}</span>
 </div>
 </div>
 </div>

 <DocumentReadOnlyOverlay isPosted={isReadOnly}>
 <div className="bg-surface-container-lowest p-8 rounded-lg border border-surface-variant/10">
 <div className="flex items-center gap-4 mb-8 pb-6 border-b border-surface-variant/10">
 <div className="p-3 rounded-[calc(var(--radius)*0.75)] bg-operational-cyan/10 text-operational-cyan">
 <FileText className="w-5 h-5" />
 </div>
 <div>
 <h3 className="text-body-md font-semibold uppercase text-foreground">{tc('items')}</h3>
 <p className="text-label-xs font-bold text-muted-foreground/60 uppercase mt-0.5">{t('specification')}</p>
 </div>
 </div>

 <DocumentLineItemTable
 lines={pr.lines.map(l => ({
 id: l.id,
 item: {
 id: l.item.id,
 code: l.item.code,
 name_en: l.item.name_en,
 name_ar: l.item.name_ar,
 primary_uom: {
 code: l.item.primary_uom.code
 }
 },
 qty: l.req_qty,
 uom_id: l.uom_id
 })) as LineItem[]}
 locale={locale}
 isReadOnly={true}
 />
 </div>
 </DocumentReadOnlyOverlay>

 {/* Audit Trail */}
 <div className="bg-surface-container-lowest p-8 rounded-lg border border-surface-variant/10 transition-all hover:bg-surface-container-medium/50">
 <div className="flex items-center gap-3 mb-10">
 <History className="w-4 h-4 text-operational-cyan opacity-40" />
 <h3 className="text-label-xs font-semibold uppercase text-muted-foreground/40">{tc('audit_trail')}</h3>
 </div>
 <StatusTimeline entries={mockTimeline} />
 </div>

 {pr.notes && (
 <div className="bg-surface-container-lowest p-8 rounded-lg border border-surface-variant/10">
 <h4 className="text-label-xs font-semibold uppercase text-muted-foreground/40 mb-4">{tc('notes')}</h4>
 <p className="text-body-md font-medium text-foreground/70 italic">{pr.notes}</p>
 </div>
 )}
 </div>
 </div>
 );
}
