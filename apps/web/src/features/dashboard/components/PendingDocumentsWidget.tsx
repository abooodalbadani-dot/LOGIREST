'use client';
import { FileText, ChevronRight, Timer, ArrowUpRight } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { useBaseCurrency } from '@/hooks/useBaseCurrency';
import { EmptyScopeState } from '@/components/ui/EmptyScopeState';

export interface PendingDocument {
 id: string;
 documentNumber: string;
 type: 'PR' | 'PO' | 'ADJUSTMENT' | 'ISSUE' | 'TRANSFER';
 status: string;
 priority: string;
 destination: string;
 createdAt: string;
 totalValue?: number;
}

export function PendingDocumentsWidget({ 
 locale, 
 data,
 baseCurrency: propBaseCurrency
}: { 
 locale: string;
 data?: PendingDocument[];
 baseCurrency?: string;
}) {
 const t = useTranslations('dashboard.pending_approvals');
 const tc = useTranslations('common');
 const contextCurrency = useBaseCurrency();
 const baseCurrency = propBaseCurrency ?? contextCurrency.currency;
 const loadingCurrency = propBaseCurrency ? false : contextCurrency.isLoading;
 
 // Map dynamic API data if available, otherwise fall back to empty array
 const docs = (data || []).map((doc) => {
   let path = 'purchase-requests';
   if (doc.type === 'PO') path = 'purchase-orders';
   else if (doc.type === 'ADJUSTMENT') path = 'adjustments';
   else if (doc.type === 'ISSUE') path = 'kitchen-requests';
   else if (doc.type === 'TRANSFER') path = 'internal-transfers';

   let typeKey = doc.type.toLowerCase();
   if (typeKey === 'adjustment') typeKey = 'adj';

   return {
    id: doc.id,
    type: typeKey,
    number: doc.documentNumber,
    destination: doc.destination,
    total: doc.totalValue,
    date: doc.createdAt,
    path,
   };
  });

 const isRtl = locale === 'ar';

 return (
  <section className="bg-card border border-border shadow-sm/50 rounded-2xl overflow-hidden backdrop-blur-sm flex flex-col h-full" aria-labelledby="pending-docs-title">
   <div className="px-6 py-4 flex items-center justify-between">
    <h3 id="pending-docs-title" className="text-label-xs font-semibold text-muted-foreground uppercase flex items-center gap-2">
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
     {docs.length === 0 && (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
       <span className="text-label-xs font-semibold text-muted-foreground/30 uppercase my-auto">{tc('no_data', { defaultValue: 'No Data' })}</span>
      </div>
     )}
     {docs.map((doc) => (
      <Link 
       key={doc.id} 
       href={`/${doc.path}/${doc.id}`}
       className="px-6 py-4 transition-all duration-140 ease-industrial flex items-center justify-between group hover:bg-muted"
      >
       <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-3">
         <span className="text-label-xxs font-semibold px-2 py-0.5 rounded bg-surface-container-highest/50 text-on-surface uppercase">
          {tc(`doc_types.${doc.type}`)}
         </span>
         <span className="text-body-md font-bold text-foreground group-hover:text-operational-cyan transition-colors font-mono">
          {doc.number}
         </span>
        </div>
        <div className="flex items-center gap-3">
         <span className="text-label-xs text-muted-foreground font-bold">
          {doc.destination}
         </span>
         <div className="flex items-center gap-1.5 text-label-xxs font-bold text-muted-foreground uppercase ps-3">
          <Timer className="w-3 h-3" />
          {doc.date}
         </div>
        </div>
       </div>
       <div className="flex items-center gap-4">
        {doc.total !== undefined && (
         <div className="flex flex-col items-end">
          <span className="text-body-sm font-semibold text-foreground tabular-nums">
           {doc.total.toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="text-label-xxs text-muted-foreground/40 uppercase font-semibold">
           {loadingCurrency ? '...' : baseCurrency}
          </span>
         </div>
        )}
        <div className="p-2 text-muted-foreground/20 group-hover:text-operational-cyan group-hover:bg-operational-cyan/10 rounded-xl transition-all border-none">
         <ArrowUpRight className={`w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 ${isRtl ? 'rotate-[-90deg] group-hover:rotate-[-45deg]' : ''}`} />
        </div>
       </div>
      </Link>
     ))}
    </div>
   <div className="p-4 bg-muted/30 border-t border-border text-center">
    <Link 
     href="/purchase-requests"
     className="text-label-xxs font-semibold text-operational-cyan hover:text-operational-cyan/80 uppercase transition-all flex items-center justify-center gap-2"
    >
     {t('view_all')}
     <ChevronRight className={`w-3 h-3 ${isRtl ? 'rotate-180' : ''}`} />
    </Link>
   </div>
  </section>
 );
}
