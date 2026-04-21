'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { usePR } from '@/features/purchasing/hooks/usePR';
import { useCreatePR } from '@/features/purchasing/hooks/useCreatePR';
import { useSubmitPR } from '@/features/purchasing/hooks/useSubmitPR';
import { useApprovePR } from '@/features/purchasing/hooks/useApprovePR';
import { useRejectPR } from '@/features/purchasing/hooks/useRejectPR';
import { usePermission } from '@/hooks/usePermission';
import { Button } from '@/components/ui/button';
import { DocumentReadOnlyOverlay } from '@/components/shared/DocumentReadOnlyOverlay';
import { DocumentLineItemTable } from '@/components/shared/DocumentLineItemTable/DocumentLineItemTable';
import { PostConfirmDialog } from '@/components/shared/PostConfirmDialog';
import { StatusTimeline } from '@/components/shared/StatusTimeline';
import { Badge } from '@/components/ui/badge';
import { Save, CheckCircle, XCircle, Send, ArrowRight } from 'lucide-react';

export function PRDetailClient({ id }: { id: string | null }) {
  const t = useTranslations('procurement.pr');
  const tCommon = useTranslations('common');
  const router = useRouter();
  
  const { data: pr, isLoading } = usePR(id || '');
  const createPRMutation = useCreatePR();
  const submitPRMutation = useSubmitPR();
  const approvePRMutation = useApprovePR();
  const rejectPRMutation = useRejectPR();

  const [approveConfirmOpen, setApproveConfirmOpen] = useState(false);
  const [rejectConfirmOpen, setRejectConfirmOpen] = useState(false);

  const isNew = !id;
  const isReadOnly = ['APPROVED', 'POSTED', 'REJECTED'].includes(pr?.status ?? '');

  const canApprove = usePermission('approve', 'pr');
  const canSubmit = usePermission('create', 'pr');

  const handleSaveDraft = async () => {
    try {
      await createPRMutation.mutateAsync({
        department_id: 'dept-1',
        expected_date: '2026-05-01',
        lines: []
      } as any);
      router.push('/purchase-requests');
    } catch (e) {
      console.error(e);
    }
  };

  const handleSubmit = async () => {
    if (!id) return;
    try {
      await submitPRMutation.mutateAsync(id);
    } catch (e) { console.error(e); }
  };

  const handleApprove = async () => {
    if (!id) return;
    try {
      await approvePRMutation.mutateAsync(id);
      setApproveConfirmOpen(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleReject = async () => {
    if (!id) return;
    try {
      await rejectPRMutation.mutateAsync({ id, reason: "Manual rejection" } as any);
      setRejectConfirmOpen(false);
    } catch (e) {
      console.error(e);
    }
  };

  if (isLoading) return <div>Loading...</div>;

  const mockTimeline = pr ? [
    { status: pr.status, at: pr.created_at || new Date().toISOString(), by: 'System User' }
  ] : [];

  return (
    <div className="flex flex-col gap-6 relative">
      <div className="flex justify-between items-center bg-card p-4 rounded-lg border">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            {!isNew && (
              <span dir="ltr" className="font-mono text-primary">
                {pr?.document_number}
              </span>
            )}
            {!isNew && (
              <Badge variant={
                pr?.status === 'APPROVED' ? 'default' : 
                pr?.status === 'REJECTED' ? 'destructive' : 
                'secondary'
              }>
                {tCommon(`status.${pr?.status.toLowerCase()}` as any) || pr?.status}
              </Badge>
            )}
          </h2>
        </div>
        
        <div className="flex items-center gap-2 relative z-20">
          {(isNew || pr?.status === 'DRAFT') && (
            <Button onClick={handleSaveDraft} disabled={createPRMutation.isPending} variant="outline">
              <Save className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
              {t('save_draft')}
            </Button>
          )}

          {!isNew && pr?.status === 'DRAFT' && canSubmit && (
            <Button onClick={handleSubmit} disabled={submitPRMutation.isPending}>
              <Send className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
              {t('submit')}
            </Button>
          )}

          {!isNew && pr?.status === 'SUBMITTED' && canApprove && (
            <>
              <Button variant="destructive" onClick={() => setRejectConfirmOpen(true)}>
                <XCircle className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
                {t('reject')}
              </Button>
              <Button onClick={() => setApproveConfirmOpen(true)}>
                <CheckCircle className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
                {t('approve')}
              </Button>
            </>
          )}

          {!isNew && pr?.status === 'APPROVED' && canApprove && (
            <Button onClick={() => router.push(`/purchase-orders/new?pr_id=${id}`)}>
              <ArrowRight className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
              {t('convert_to_po')}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card p-4 rounded-lg border">
          <p className="text-sm text-muted-foreground">{t('department')}</p>
          <p className="font-medium">{pr?.department_id || '-'}</p>
        </div>
        <div className="bg-card p-4 rounded-lg border">
          <p className="text-sm text-muted-foreground">{t('expected_date')}</p>
          <p className="font-medium">{pr?.expected_date || '-'}</p>
        </div>
      </div>

      {isReadOnly ? (
        <DocumentReadOnlyOverlay isPosted={isReadOnly}>
          <DocumentLineItemTable
            lines={(pr?.lines as any) || []}
            locale="en"
            isReadOnly={true}
            extraColumns={[
              {
                header: "Requested Qty",
                cell: (line: any) => <span dir="ltr" className="font-mono">{line.req_qty}</span>
              },
              ...(pr?.status === 'APPROVED' || pr?.status === 'POSTED' ? [{
                header: "Approved Qty",
                cell: (line: any) => <span dir="ltr" className="font-mono">{line.req_qty}</span>
              }] : [])
            ]}
          />
        </DocumentReadOnlyOverlay>
      ) : (
        <DocumentLineItemTable
          lines={(pr?.lines as any) || []}
          locale="en"
          isReadOnly={false}
          extraColumns={[
            {
              header: "Requested Qty",
              cell: (line: any) => <input type="number" defaultValue={line.req_qty} className="w-20 px-2 py-1 bg-surface-2 border border-surface-3 rounded" dir="ltr" />
            }
          ]}
        />
      )}

      {mockTimeline.length > 0 && (
        <div className="bg-card p-4 rounded-lg border">
          <h3 className="font-semibold mb-4 text-sm text-muted-foreground">Status History</h3>
          <StatusTimeline entries={mockTimeline} />
        </div>
      )}

      <PostConfirmDialog 
        open={approveConfirmOpen}
        onOpenChange={setApproveConfirmOpen}
        onConfirm={handleApprove}
        title={t('approve_confirm_title')}
        description={t('approve_confirm_desc')}
        warningText="This action cannot be undone."
      />

      <PostConfirmDialog 
        open={rejectConfirmOpen}
        onOpenChange={setRejectConfirmOpen}
        onConfirm={handleReject}
        title={t('reject_confirm_title')}
        description={t('reject_confirm_desc')}
        warningText="This action cannot be undone."
      />
    </div>
  );
}
