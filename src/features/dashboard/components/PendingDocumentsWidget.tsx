'use client';
import { FileText, ChevronRight, Timer, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

export function PendingDocumentsWidget({ locale }: { locale: string }) {
 const t = useTranslations('dashboard.pending_approvals');
 
 // Mock data for pending documents
 const docs = [
 { id: '1', type: 'PR', number: 'PR-2024-001', department: 'Kitchen', total: 4500.00, date: '2024-04-20', path: 'purchase-requests' },
 { id: '2', type: 'ADJ', number: 'ADJ-2024-042', warehouse: 'Main Store', reason: 'Damage', date: '2024-04-21', path: 'adjustments' },
 { id: '3', type: 'PR', number: 'PR-2024-005', department: 'Bakery', total: 1200.50, date: '2024-04-22', path: 'purchase-requests' },
 ];

 const isRtl = locale === 'ar';

 return (
 <div className="bg-surface-container-low/40 rounded-3xl overflow-hidden border-none backdrop-blur-sm flex flex-col h-full">
 <div className="px-6 py-4 flex items-center justify-between">
 <h3 className="text-label-xs font-semibold text-muted-foreground uppercase flex items-center gap-2">
 <FileText className="w-3.5 h-3.5 text-operational-cyan" />
 {t('title')}
 </h3>
 <div className="flex items-center gap-2">
 <span className="px-2 py-0.5 rounded-full bg-operational-cyan/10 text-operational-cyan text-label-xxs font-semibold uppercase">
 {docs.length} {t('tasks')}
 </span>
 </div>
 </div>
 <div className="flex flex-col flex-1">
 {docs.map((doc, idx) => (
 <Link 
 key={doc.id} 
 href={`/${locale}/${doc.path}/${doc.id}`}
 className="px-6 py-4 transition-all duration-300 flex items-center justify-between group hover:bg-muted/50"
 >
 <div className="flex flex-col gap-1.5">
 <div className="flex items-center gap-3">
 <span className="text-label-xxs font-semibold px-2 py-0.5 rounded bg-muted text-foreground uppercase">
 {doc.type}
 </span>
 <span className="text-body-md font-bold text-foreground group-hover:text-operational-cyan transition-colors font-mono">
 {doc.number}
 </span>
 </div>
 <div className="flex items-center gap-3">
 <span className="text-label-xs text-muted-foreground font-bold">
 {doc.department || doc.warehouse}
 </span>
 <div className="flex items-center gap-1.5 text-label-xxs font-bold text-muted-foreground uppercase ps-3">
 <Timer className="w-3 h-3" />
 {doc.date}
 </div>
 </div>
 </div>
 <div className="p-2 text-muted-foreground/20 group-hover:text-operational-cyan group-hover:bg-operational-cyan/10 rounded-xl transition-all border-none">
 <ArrowUpRight className={`w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 ${isRtl ? 'rotate-[-90deg] group-hover:rotate-[-45deg]' : ''}`} />
 </div>
 </Link>
 ))}
 </div>
 <div className="p-4 bg-muted/50 text-center">
 <Link 
 href={`/${locale}/purchase-requests`}
 className="text-label-xxs font-semibold text-operational-cyan hover:text-operational-cyan/80 uppercase transition-all flex items-center justify-center gap-2"
 >
 {t('view_all')}
 <ChevronRight className={`w-3 h-3 ${isRtl ? 'rotate-180' : ''}`} />
 </Link>
 </div>
 </div>
 );
}


