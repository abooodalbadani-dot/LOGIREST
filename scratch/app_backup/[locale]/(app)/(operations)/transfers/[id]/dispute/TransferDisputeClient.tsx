'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { Button } from '@/components/ui/button';
import { DocumentLineItemTable } from '@/components/shared/DocumentLineItemTable/DocumentLineItemTable';
import { AlertTriangle, CheckCircle, Scale, ArrowLeft, Info } from 'lucide-react';
import { TransferLine, type TransferDetail } from '@/features/operations/hooks/useTransfer';

interface TransferDisputeClientProps {
  transfer: TransferDetail;
  locale: 'ar' | 'en';
}

export function TransferDisputeClient({ transfer, locale }: TransferDisputeClientProps) {
  const t = useTranslations('operations.transfer');
  const tCommon = useTranslations('common');
  const router = useRouter();

  // Filter lines that have variances
  const discrepantLines = transfer?.lines?.filter(line => 
    line.shipped_qty !== undefined && 
    line.received_qty !== undefined && 
    line.shipped_qty !== line.received_qty
  ) ?? [];

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <div className="flex items-center justify-between">
        <Breadcrumb 
          items={[
            { label: t('title'), href: `/transfers` },
            { label: transfer?.document_number || 'Transfer', href: `/transfers/${transfer?.id}` },
            { label: t('dispute_title') || 'Dispute Mediation' }
          ]} 
        />
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="text-label-xs font-semibold uppercase text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3 h-3 me-2" />
          {tCommon('back')}
        </Button>
      </div>

      <PageHeader
        title={t('dispute_title') || 'Dispute Mediation'}
        description={
          <div className="flex items-center gap-3">
            <Scale className="w-5 h-5 text-operational-cyan/60" />
            <span className="uppercase font-bold text-label-sm tracking-widest text-muted-foreground/60">
              Resolving quantities for Transfer <span dir="ltr" className="text-operational-cyan">{transfer?.document_number}</span>
            </span>
          </div>
        }
        actions={
          <div className="flex gap-4">
            <Button variant="outline" className="h-11 px-6 font-semibold uppercase text-label-xs rounded-sm">
              {t('request_recount') || 'Request Recount'}
            </Button>
            <Button className="h-11 px-8 bg-operational-cyan text-white hover:bg-operational-cyan/90 transition-all font-semibold uppercase text-label-xs rounded-sm shadow-lg shadow-operational-cyan/20">
              <CheckCircle className="w-4 h-4 me-2" />
              {t('finalize_resolution') || 'Finalize Resolution'}
            </Button>
          </div>
        }
      />

      {/* Mediation Summary Card */}
      <div className="p-8 bg-surface-container-low rounded-lg border border-outline-low relative overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-e from-amber-500/50 via-amber-500/10 to-transparent" />
        <div className="flex items-start gap-6">
          <div className="w-14 h-14 rounded-full bg-amber-500/10 flex items-center justify-center border border-amber-500/20 shrink-0">
            <AlertTriangle className="w-7 h-7 text-amber-500" />
          </div>
          <div className="space-y-2">
            <h3 className="text-body-md font-semibold uppercase text-foreground">
              {t('variance_detected') || 'Discrepancies Detected'}
            </h3>
            <p className="text-label-sm text-muted-foreground/70 uppercase leading-relaxed font-medium max-w-3xl">
              {t('dispute_instruction') || 'Please review the variances below. You must decide whether to accept the receiving warehouse\'s count, stick to the shipping records, or mark items as lost in transit.'}
            </p>
          </div>
        </div>
      </div>

      {/* Discrepancy Table */}
      <div className="space-y-6">
        <div className="flex items-center gap-3 border-s-4 border-operational-cyan ps-4">
          <Info className="w-5 h-5 text-operational-cyan" />
          <h2 className="text-body-md font-semibold uppercase text-foreground">
            {t('discrepancy_list') || 'Item-wise Variance Audit'}
          </h2>
        </div>
        
        <div className="bg-surface-container-low rounded-lg border border-outline-low overflow-hidden shadow-2xl">
          <DocumentLineItemTable
            lines={discrepantLines}
            locale={locale as 'ar' | 'en'} 
            isReadOnly={true}
            onRemoveLine={() => {}}
            hideLotColumns={true}
            headers={{
              code: tCommon('table_headers.code'),
              name: tCommon('table_headers.name'),
              qty: t('shipped_qty'),
              uom: tCommon('table_headers.uom'),
            }}
            extraColumns={[
              {
                header: t('received_qty'),
                cell: (line: TransferLine) => (
                  <div className="flex justify-center">
                    <span dir="ltr" className="font-mono text-body-md font-bold bg-amber-500/10 text-amber-500 px-4 py-1.5 rounded-md border border-amber-500/20">
                      {line.received_qty}
                    </span>
                  </div>
                ),
              },
              {
                header: t('variance'),
                cell: (line: TransferLine) => {
                  const variance = (line.received_qty ?? 0) - (line.shipped_qty ?? 0);
                  return (
                    <div className="flex justify-center">
                      <span dir="ltr" className={`font-mono text-body-md font-bold px-4 py-1.5 rounded-md border ${variance < 0 ? 'bg-status-error/10 text-status-error border-status-error/20' : 'bg-status-success/10 text-status-success border-status-success/20'}`}>
                        {variance > 0 ? '+' : ''}{variance}
                      </span>
                    </div>
                  );
                },
              },
              {
                header: t('resolution_action') || 'Resolution Action',
                cell: () => (
                  <div className="flex justify-center px-4 min-w-[200px]">
                    <select 
                      aria-label={t('resolution_action') || 'Resolution Action'}
                      className="w-full bg-surface-container-highest/20 border border-outline-low h-10 px-4 text-label-xs font-bold uppercase rounded-md outline-none focus:ring-1 focus:ring-operational-cyan transition-all"
                    >
                      <option>{t('action_accept_received') || 'Accept Received Qty'}</option>
                      <option>{t('action_claim_vendor') || 'Claim Against Shipper'}</option>
                      <option>{t('action_write_off') || 'Write-off Loss'}</option>
                    </select>
                  </div>
                ),
              },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
