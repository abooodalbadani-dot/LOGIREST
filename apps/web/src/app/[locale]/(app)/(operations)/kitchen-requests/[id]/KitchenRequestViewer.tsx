'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { 
  ArrowLeft, 
  Clock, 
  User, 
  Building2, 
  Warehouse, 
  FileText,
  History,
  Printer
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { StatusTimeline, type StatusTimelineEntry } from '@/components/shared/StatusTimeline';
import { cn } from '@/lib/utils';
import type { Status } from '@/components/shared/StatusTimeline';

interface KitchenRequestViewerProps {
  request: any;
  locale: 'ar' | 'en';
  actions?: React.ReactNode;
}

export function KitchenRequestViewer({ request, locale, actions }: KitchenRequestViewerProps) {
  const t = useTranslations('operations.kitchen_request');
  const tCommon = useTranslations('common');
  const router = useRouter();

  const history = [
    { status: 'draft' as Status, at: request.created_at, by: request.requested_by }
  ];
  if (request.requested_at) {
    history.push({ status: 'submitted' as Status, at: request.requested_at, by: request.requested_by });
  }
  if (request.approved_at) {
    history.push({ status: 'approved' as Status, at: request.approved_at, by: request.approved_by || 'Approver' });
  }
  if (request.rejected_at) {
    history.push({ status: 'rejected' as Status, at: request.rejected_at, by: request.rejected_by || 'Rejecter' });
  }
  if (request.fulfilled_at) {
    history.push({ status: request.status.toLowerCase() as Status, at: request.fulfilled_at, by: request.fulfilled_by || 'Store Keeper' });
  }

  return (
    <div className="min-h-screen bg-surface-container-low">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-10 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-4">
            <Breadcrumb 
              items={[
                { label: tCommon('inventory'), href: '#' },
                { label: t('title'), href: "/kitchen-requests" },
                { label: request.request_number }
              ]} 
            />
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-lg">
                <ArrowLeft className={cn("w-5 h-5", locale === 'ar' && "rotate-180")} />
              </Button>
              <div>
                <h1 className="text-headline-lg font-semibold uppercase italic">{request.request_number}</h1>
                <div className="flex items-center gap-3 mt-1">
                  <StatusBadge status={request.status} />
                  <span className="text-label-xs font-semibold uppercase text-muted-foreground/40 flex items-center gap-1.5">
                    <Clock className="w-3 h-3" />
                    {new Date(request.created_at).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {actions}
            <Button
              variant="outline"
              className="bg-surface-container-high border-white/5 rounded-xl h-11 px-6 text-label-xs font-semibold uppercase transition-all hover:bg-surface-container-highest"
              onClick={() => window.print()}
            >
              <Printer className="w-4 h-4 me-2" />
              {tCommon('print')}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-8">
            <div className="bg-surface-container-lowest p-8 rounded-lg border border-surface-container-high/20 grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-1">
                <span className="text-label-xs font-semibold uppercase text-muted-foreground/40 flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5" />
                  {t('department')}
                </span>
                <p className="text-body-md font-bold">{request.department_name}</p>
              </div>
              <div className="space-y-1">
                <span className="text-label-xs font-semibold uppercase text-muted-foreground/40 flex items-center gap-2">
                  <Warehouse className="w-3.5 h-3.5" />
                  {t('warehouse')}
                </span>
                <p className="text-body-md font-bold">{request.warehouse_name}</p>
              </div>
              <div className="space-y-1">
                <span className="text-label-xs font-semibold uppercase text-muted-foreground/40 flex items-center gap-2">
                  <User className="w-3.5 h-3.5" />
                  {t('requested_by')}
                </span>
                <p className="text-body-md font-bold">{request.requested_by}</p>
              </div>
              {request.notes && (
                <div className="md:col-span-3 pt-4 border-t border-surface-container-high/50 space-y-1">
                  <span className="text-label-xs font-semibold uppercase text-muted-foreground/40 flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5" />
                    {tCommon('notes')}
                  </span>
                  <p className="text-label-sm text-muted-foreground italic leading-relaxed">&quot;{request.notes}&quot;</p>
                </div>
              )}
            </div>

            <div className="bg-surface-container-lowest rounded-lg border border-surface-container-high/20 overflow-hidden">
              <div className="p-8 border-b border-surface-container-high/50 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="w-1.5 h-6 bg-cyan-500 rounded-full" />
                  <h3 className="text-label-sm font-semibold uppercase">{t('items')}</h3>
                </div>
                <Badge variant="outline" className="rounded-lg text-label-xxs font-semibold px-3 py-1 border-none bg-surface-container-high text-muted-foreground/60">
                  {request.items.length} {t('entries')}
                </Badge>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left rtl:text-right border-collapse">
                  <thead>
                    <tr className="bg-surface-container-high/30">
                      <th className="px-8 py-5 text-label-xs font-semibold uppercase text-muted-foreground/60">{tCommon('item')}</th>
                      <th className="px-8 py-5 text-label-xs font-semibold uppercase text-muted-foreground/60 text-center">{tCommon('quantity')}</th>
                      <th className="px-8 py-5 text-label-xs font-semibold uppercase text-muted-foreground/60 text-center">{t('fulfilled')}</th>
                      <th className="px-8 py-5 text-label-xs font-semibold uppercase text-muted-foreground/60">{tCommon('notes')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-container-high/30">
                    {request.items.map((item: any) => (
                      <tr key={item.id} className="group hover:bg-surface-container-medium/30 transition-all">
                        <td className="px-8 py-6">
                          <div className="flex flex-col">
                            <span className="text-label-sm font-bold text-foreground">{item.item_name}</span>
                            <span className="text-label-xxs font-mono text-muted-foreground/40 mt-1 uppercase">ID: {item.item_id}</span>
                          </div>
                        </td>
                        <td className="px-8 py-6 text-center">
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="text-body-md font-semibold text-cyan-500 tabular-nums">{item.quantity}</span>
                            <span className="text-label-xxs font-semibold uppercase text-muted-foreground/30">{item.uom}</span>
                          </div>
                        </td>
                        <td className="px-8 py-6 text-center">
                          <div className="flex flex-col items-center gap-0.5">
                            <span className={cn(
                              "text-body-md font-semibold tabular-nums",
                              (item.fulfilled_quantity || 0) < item.quantity ? "text-amber-500" : "text-emerald-500"
                            )}>{item.fulfilled_quantity || 0}</span>
                            <span className="text-label-xxs font-semibold uppercase text-muted-foreground/30">{item.uom}</span>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <p className="text-label-xs font-medium text-muted-foreground/60 max-w-[200px] line-clamp-2 italic">
                            {item.notes || '—'}
                          </p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 space-y-8">
            <div className="bg-surface-container-lowest p-8 rounded-lg border border-surface-container-high/20 relative overflow-hidden group">
              <div className="absolute top-0 end-0 w-32 h-32 bg-cyan-500/5 blur-[50px] -me-16 -mt-16 rounded-full group-hover:bg-cyan-500/10 transition-all duration-700" />
              <div className="relative space-y-8">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                    <History className="w-5 h-5 text-cyan-500" />
                  </div>
                  <h4 className="text-label-xs font-semibold uppercase">{tCommon('history')}</h4>
                </div>
                <div className="ps-2">
                  <StatusTimeline entries={history} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
