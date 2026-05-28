'use client';
import { FileText, ChevronRight, Timer, ArrowUpRight } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { useBaseCurrency } from '@/hooks/useBaseCurrency';

export interface PendingDocument {
  id: string;
  document_number: string;
  type: 'PR' | 'PO' | 'ADJUSTMENT' | 'ISSUE' | 'TRANSFER';
  status: string;
  priority: string;
  destination: string;
  created_at: string;
  total_value?: number;
}

export function PendingDocumentsWidget({ 
  locale, 
  data 
}: { 
  locale: string;
  data?: PendingDocument[];
}) {
  const t = useTranslations('dashboard.pending_approvals');
  const tc = useTranslations('common');
  const { currency: baseCurrency, isLoading: loadingCurrency } = useBaseCurrency();
  
  // Map dynamic API data if available, otherwise fall back to mock data
  const docs = data
    ? data.map((doc) => {
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
          number: doc.document_number,
          destination: doc.destination,
          total: doc.total_value,
          date: doc.created_at,
          path,
          isApi: true,
          numberKey: '',
          deptKey: '',
          warehouseKey: '',
        };
      })
    : [
        { id: '1', type: 'pr', number: 'PR-9021', destination: 'kitchen', total: 4500.00, date: '2024-04-20', path: 'purchase-requests', isApi: false, numberKey: 'doc_1', deptKey: 'kitchen', warehouseKey: '' },
        { id: '2', type: 'adj', number: 'ADJ-4402', destination: 'main_store', total: undefined, date: '2024-04-21', path: 'adjustments', isApi: false, numberKey: 'doc_2', deptKey: '', warehouseKey: 'main_store' },
        { id: '3', type: 'pr', number: 'PR-9025', destination: 'bakery', total: 1200.50, date: '2024-04-22', path: 'purchase-requests', isApi: false, numberKey: 'doc_3', deptKey: 'bakery', warehouseKey: '' },
      ];

  const isRtl = locale === 'ar';

  return (
    <section className="bg-surface-container-low/50 rounded-2xl overflow-hidden border-none backdrop-blur-sm flex flex-col h-full" aria-labelledby="pending-docs-title">
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
        {docs.map((doc) => (
          <Link 
            key={doc.id} 
            href={`/${doc.path}/${doc.id}`}
            className="px-6 py-4 transition-all duration-140 ease-industrial flex items-center justify-between group hover:bg-surface-container-high/40"
          >
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-3">
                <span className="text-label-xxs font-semibold px-2 py-0.5 rounded bg-surface-container-highest/50 text-foreground uppercase">
                  {tc(`doc_types.${doc.type}`)}
                </span>
                <span className="text-body-md font-bold text-foreground group-hover:text-operational-cyan transition-colors font-mono">
                  {doc.isApi ? doc.number : t(`mock.${doc.numberKey}`)}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-label-xs text-muted-foreground font-bold">
                  {doc.isApi 
                    ? doc.destination 
                    : (doc.deptKey ? tc(`departments.${doc.deptKey}`) : tc(`warehouses.${doc.warehouseKey}`))}
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
      <div className="p-4 bg-surface-container/50 text-center">
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
