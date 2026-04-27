'use client';
import { FileText, ChevronRight } from 'lucide-react';
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
    <div className="bg-surface-container-lowest rounded overflow-hidden shadow-sm flex flex-col h-full">
      <div className="px-5 py-3.5 bg-surface-container-low/50 flex items-center justify-between">
        <h3 className="text-[10px] font-black text-on-surface-muted uppercase tracking-[0.2em] flex items-center gap-2">
          <FileText className="w-3.5 h-3.5 text-cyan-500" />
          {t('title')}
        </h3>
        <span className="px-1.5 py-0.5 rounded-sm bg-cyan-500/10 text-cyan-500 text-[9px] font-black uppercase tracking-widest ghost-border">
          {docs.length} {t('tasks')}
        </span>
      </div>
      <div className="flex flex-col flex-1">
        {docs.map((doc, idx) => (
          <Link 
            key={doc.id} 
            href={`/${locale}/${doc.path}/${doc.id}`}
            className={`px-5 py-3 transition-colors flex items-center justify-between group ${
              idx % 2 !== 0 ? 'bg-surface-container-low/30' : 'bg-transparent'
            } hover:bg-cyan-500/5`}
          >
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2">
                 <span className="text-[8px] font-black px-1 py-0.5 rounded-sm bg-surface-container-highest text-on-surface tracking-tighter">
                   {doc.type}
                 </span>
                 <span className="text-xs font-bold text-foreground group-hover:text-cyan-500 transition-colors tracking-tight font-mono">{doc.number}</span>
              </div>
              <span className="text-[9px] text-on-surface-muted/60 font-medium">
                {doc.department || doc.warehouse} • <span className="font-mono">{doc.date}</span>
              </span>
            </div>
            <div className="p-1.5 text-on-surface-muted/40 group-hover:text-cyan-500 group-hover:bg-cyan-500/10 rounded transition-all">
              <ChevronRight className={`w-3.5 h-3.5 ${isRtl ? 'rotate-180' : ''}`} />
            </div>
          </Link>
        ))}
      </div>
      <div className="p-2.5 bg-surface-container-low/20 text-center">
        <Link 
          href={`/${locale}/purchase-requests`}
          className="text-[9px] font-black text-cyan-500 hover:text-cyan-500/80 uppercase tracking-[0.3em] transition-all"
        >
          {t('view_all')}
        </Link>
      </div>
    </div>
  );
}
