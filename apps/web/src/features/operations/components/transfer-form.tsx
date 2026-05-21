"use client";

import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { Button } from '@/components/ui/button';
import { StatusBadge, type BadgeStatus } from '@/components/shared/StatusBadge';
import { DocumentReadOnlyOverlay } from '@/components/shared/DocumentReadOnlyOverlay';
import { DocumentLineItemTable } from '@/components/shared/DocumentLineItemTable/DocumentLineItemTable';
import { LockBanner } from '@/components/shared/LockBanner';
import { TransferLine } from '@/features/operations/hooks/useTransfer';
import { useWarehouseLock } from '@/hooks/useWarehouseLock';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { Truck, PackageCheck, Printer, ArrowLeft } from 'lucide-react';
import { ClientOnlyTime } from '@/components/shared/ClientOnlyTime';
import { ActionGuard } from '@/core/workflow/ActionGuard';
import { TRANSFER_STATUS } from '@logirest/shared-types';
import { type DocumentStatus } from '@logirest/shared-types';
import { useAuth } from '@/providers/AuthProvider';
import { Link } from '@/i18n/navigation';
import { DocumentLockBanner, DocumentLockWrapper } from '@/components/shared/DocumentLockBanner';
import { FormFooter } from '@/components/shared/FormFooter';
import { useLocale } from '@/hooks/useLocale';
import type { Transfer } from '@/types/documents';

interface TransferFormProps {
  transfer: Transfer;
  id: string;
  onConflict: (type: string, id: string) => void;
}

export function TransferForm({ transfer, id }: TransferFormProps) {

  const t = useTranslations('operations.transfer');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const { user } = useAuth();
  const { gradientClass } = useLocale();

  // Dual warehouse lock
  const { data: fromLockState } = useWarehouseLock(transfer?.from_warehouse_id ?? '');
  const { data: toLockState } = useWarehouseLock(transfer?.to_warehouse_id ?? '');
  const isFromLocked = fromLockState?.isLocked ?? false;
  const isToLocked = toLockState?.isLocked ?? false;
  const isEitherLocked = isFromLocked || isToLocked;

  const transferStatus = (transfer?.transfer_status || TRANSFER_STATUS.DRAFT) as DocumentStatus;
  const isLocked = transferStatus !== TRANSFER_STATUS.DRAFT;
  const isLockedState = isLocked;

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-200">
      <div className="flex items-center justify-between">
        <Breadcrumb 
          items={[
            { label: tCommon('modules.operations'), href: `/transfers` },
            { label: t('title'), href: `/transfers` },
            { label: t('detail_title') }
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
        title={t('detail_title')}
        description={
          <div className="flex items-center gap-2">
            <span>{tCommon('doc_number')}</span>
            <span dir="ltr" className="font-mono text-cyan-500/80">{transfer?.document_number}</span>
          </div>
        }
        actions={
          <div className="flex gap-4 items-center">
            <StatusBadge status={transferStatus as BadgeStatus} />
            
            <Button
              variant="outline"
              className="bg-surface-container-high rounded-xl h-11 px-6 text-label-xs font-semibold uppercase transition-all hover:bg-surface-container-highest"
              onClick={() => window.print()}
            >
              <Printer className="w-4 h-4 me-2" />
              {tCommon('print')}
            </Button>
          </div>
        }
      />

      <form 
        onSubmit={(e) => e.preventDefault()} 
        className="space-y-8"
      >
        <DocumentLockBanner 
          status={transferStatus} 
          isLocked={isLockedState} 
        />

        <DocumentLockWrapper isLocked={isLockedState}>
          <div className="space-y-8">
            <div className="space-y-2">
              {isFromLocked && <LockBanner lockState={fromLockState} />}
              {isToLocked && toLockState?.sessionId !== fromLockState?.sessionId && (
                <LockBanner lockState={toLockState} />
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 bg-surface-container-low/50 p-8 rounded-2xl relative overflow-hidden shadow-2xl">
              <div className={`absolute top-0 inset-x-0 h-1 ${gradientClass} from-cyan-500/50 via-cyan-500/20 to-transparent`} />

              <div className="space-y-2">
                <label className="text-label-xs font-semibold uppercase text-muted-foreground/60 ms-1">{t('from_warehouse')}</label>
                <div className="bg-surface-container-highest/40 rounded-xl p-4 font-bold text-body-md">
                  {transfer?.from_warehouse_name}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-label-xs font-semibold uppercase text-muted-foreground/60 ms-1">{t('to_warehouse')}</label>
                <div className="bg-surface-container-highest/40 rounded-xl p-4 font-bold text-body-md">
                  {transfer?.to_warehouse_name}
                </div>
              </div>

              {transfer?.shipped_at && (
                <div className="space-y-2">
                  <label className="text-label-xs font-semibold uppercase text-muted-foreground/60 ms-1">{t('shipped_at')}</label>
                  <div className="bg-surface-container-highest/30 rounded-xl p-4 flex items-center justify-between">
                    <ClientOnlyTime 
                      date={transfer.shipped_at} 
                      mode="datetime" 
                      className="font-mono text-body-md font-bold text-cyan-500/80"
                    />
                    <Truck className="w-4 h-4 text-cyan-500/40" />
                  </div>
                </div>
              )}

              {transfer?.received_at && (
                <div className="space-y-2">
                  <label className="text-label-xs font-semibold uppercase text-muted-foreground/60 ms-1">{t('received_at')}</label>
                  <div className="bg-surface-container-highest/30 rounded-xl p-4 flex items-center justify-between">
                    <ClientOnlyTime 
                      date={transfer.received_at} 
                      mode="datetime" 
                      className="font-mono text-body-md font-bold text-emerald-500/80"
                    />
                    <PackageCheck className="w-4 h-4 text-emerald-500/40" />
                  </div>
                </div>
              )}

              <div className="col-span-1 md:col-span-4 space-y-2">
                <label className="text-label-xs font-semibold uppercase text-muted-foreground/60 ms-1">{tCommon('notes')}</label>
                <div className="bg-surface-container-highest/40 rounded-xl p-4 font-medium text-body-md min-h-[60px]">
                  {transfer?.notes || '—'}
                </div>
              </div>

              {transfer?.variance_reason && (
                <div className="col-span-1 md:col-span-4 space-y-2">
                  <label className="text-label-xs font-semibold uppercase text-status-warning/80 ms-1">{t('variance_reason')}</label>
                  <div className="bg-status-warning/5 border-none rounded-xl p-4 font-medium text-body-md">
                    {transfer.variance_reason}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-surface-container-low/30 rounded-2xl overflow-hidden shadow-2xl">
              <DocumentReadOnlyOverlay isPosted={transferStatus === 'POSTED' || transferStatus === 'CANCELLED'}>
                <DocumentLineItemTable
                  lines={transfer?.lines ?? []}
                  isReadOnly={true}
                  onRemoveLine={() => {}}
                  hideLotColumns={true}
                  dense={true}
                  headers={{
                    code: tCommon('table_headers.code'),
                    name: tCommon('table_headers.name'),
                    qty: t('transfer_qty'),
                    uom: tCommon('table_headers.uom'),
                  }}
                  extraColumns={[
                    {
                      header: t('shipped_qty'),
                      cell: (line: TransferLine) => (
                        <div className="flex justify-center">
                          <span dir="ltr" className="font-mono text-body-md font-semibold bg-surface-container-highest px-3 py-1 rounded-xl">
                            {line.shipped_qty ?? line.qty}
                          </span>
                        </div>
                      ),
                    },
                    {
                      header: t('received_qty'),
                      cell: (line: TransferLine) => (
                        <div className="flex justify-center">
                          <span dir="ltr" className={`font-mono text-body-md font-semibold px-3 py-1 rounded-xl ${line.received_qty ? 'bg-emerald-500/10 text-emerald-400' : 'bg-surface-container-highest text-muted-foreground/40'}`}>
                            {line.received_qty ?? '—'}
                          </span>
                        </div>
                      ),
                    },
                  ]}
                />
              </DocumentReadOnlyOverlay>
            </div>
          </div>
        </DocumentLockWrapper>

        <FormFooter 
          onCancel={() => router.push(`/transfers`)}
          isSaving={false}
          isLocked={isLockedState}
          isDirty={false}
          isValid={true}
          actions={
            <PermissionGate action="post" resource="transfer">
              <div className="flex items-center gap-2">
          {transferStatus === TRANSFER_STATUS.DRAFT && (
            <ActionGuard documentType="TRANSFER" status={transferStatus} action="SHIP" role={user?.role}>
              <div>
                <Link href={`/transfers/${id}/ship`}>
                  <Button
                    className="bg-cyan-600 hover:bg-cyan-500 text-white rounded-full h-10 md:h-12 px-4 md:px-8 text-[10px] md:text-xs font-black uppercase tracking-wide transition-all shadow-lg shadow-cyan-900/20 active:scale-95"
                  >
                    <Truck className="w-4 h-4 md:w-5 md:h-5 me-2" />
                    {t('ship')}
                  </Button>
                </Link>
              </div>
            </ActionGuard>
          )}

          {transferStatus === TRANSFER_STATUS.IN_TRANSIT && (
            <ActionGuard documentType="TRANSFER" status={transferStatus} action="RECEIVE" role={user?.role}>
              <div>
                <Link href={`/transfers/${id}/receive`}>
                  <Button
                    className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-full h-10 md:h-12 px-4 md:px-8 text-[10px] md:text-xs font-black uppercase tracking-wide transition-all shadow-lg shadow-emerald-900/20 active:scale-95"
                  >
                    <PackageCheck className="w-4 h-4 md:w-5 md:h-5 me-2" />
                    {t('confirm_receipt')}
                  </Button>
                </Link>
              </div>
            </ActionGuard>
          )}
              </div>
            </PermissionGate>
          }
        />

      </form>
    </div>
  );
}
