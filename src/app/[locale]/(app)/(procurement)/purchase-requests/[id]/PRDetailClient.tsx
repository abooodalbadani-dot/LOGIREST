'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { usePR } from '@/features/purchasing/hooks/usePR';
import { useCreatePR } from '@/features/purchasing/hooks/useCreatePR';
import { useSubmitPR } from '@/features/purchasing/hooks/useSubmitPR';
import { useApprovePR } from '@/features/purchasing/hooks/useApprovePR';
import { useRejectPR } from '@/features/purchasing/hooks/useRejectPR';
import { Button } from '@/components/ui/button';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageHeader } from '@/components/shared/PageHeader';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { DocumentReadOnlyOverlay } from '@/components/shared/DocumentReadOnlyOverlay';
import { DocumentLineItemTable, type LineItem } from '@/components/shared/DocumentLineItemTable/DocumentLineItemTable';
import { PostConfirmDialog } from '@/components/shared/PostConfirmDialog';
import { StatusBadge, type BadgeStatus } from '@/components/ui/status-badge';
import { StatusTimeline, type Status } from '@/components/shared/StatusTimeline';
import { Save, CheckCircle, XCircle, Send, ArrowRight, ClipboardList, Clock, CheckCircle2, History, Building2 } from 'lucide-react';

// Static department list — replace with API hook when endpoint is available
const DEPARTMENTS = [
  { id: 'dep-kitchen', labelKey: 'warehouses.kitchen' },
  { id: 'dep-pastry',  labelKey: 'warehouses.pastry'  },
  { id: 'dep-dry',     labelKey: 'warehouses.dry'     },
  { id: 'dep-cold',    labelKey: 'warehouses.cold'    },
] as const;

const buildSchema = (t: (k: string) => string) =>
  z.object({
    department_id:  z.string().min(1, t('validation.department_required')),
    expected_date:  z.string().min(1, t('validation.date_required')),
  });

type PRHeaderFormValues = {
  department_id: string;
  expected_date: string;
};

export function PRDetailClient({ id, locale }: { id: string | null; locale: 'ar' | 'en' }) {
  const t       = useTranslations('procurement.pr');
  const tCommon = useTranslations('common');
  const router  = useRouter();

  const { data: pr, isLoading } = usePR(id || '');
  const createPRMutation  = useCreatePR();
  const submitPRMutation  = useSubmitPR();
  const approvePRMutation = useApprovePR();
  const rejectPRMutation  = useRejectPR();

  const [approveConfirmOpen, setApproveConfirmOpen] = useState(false);
  const [rejectConfirmOpen,  setRejectConfirmOpen]  = useState(false);

  const schema = buildSchema((k) => tCommon(k as Parameters<typeof tCommon>[0]));

  const form = useForm<PRHeaderFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { department_id: '', expected_date: '' },
  });

  useEffect(() => {
    if (pr) {
      form.reset({
        department_id: pr.department_id || '',
        expected_date: pr.expected_date  || '',
      });
    }
  }, [pr, form]);

  const isNew      = !id;
  const isReadOnly = ['APPROVED', 'POSTED', 'REJECTED'].includes(pr?.status ?? '');

  /* ── Handlers ────────────────────────────────────────────────────────── */
  const handleSaveDraft = async (values: PRHeaderFormValues) => {
    try {
      await createPRMutation.mutateAsync({
        department_id: values.department_id,
        expected_date: values.expected_date,
        lines: [],
      });
      router.push(`/${locale}/purchase-requests`);
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
    } catch (e) { console.error(e); }
  };

  const handleReject = async () => {
    if (!id) return;
    try {
      await rejectPRMutation.mutateAsync(id);
      setRejectConfirmOpen(false);
    } catch (e) { console.error(e); }
  };

  /* ── Loading ─────────────────────────────────────────────────────────── */
  if (isLoading) return (
    <div className="flex flex-col h-[60vh] items-center justify-center bg-surface-container-low shadow-xl rounded-2xl animate-pulse">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-primary tracking-tighter">PR</div>
      </div>
      <p className="mt-6 text-[10px] font-black uppercase tracking-[0.4em] text-primary/60 animate-pulse">{t('sync_context')}</p>
    </div>
  );

  const mockTimeline = pr?.status ? [
    { status: pr.status.toLowerCase() as Status, at: pr.created_at || new Date().toISOString(), by: 'System User' }
  ] : [];

  /* ── Header actions — strict status gates ────────────────────────────── */
  const headerActions = (
    <div className="flex items-center gap-3">
      {(isNew || pr?.status === 'DRAFT') && (
        <PermissionGate action="create" resource="pr">
          <Button
            onClick={form.handleSubmit(handleSaveDraft)}
            disabled={createPRMutation.isPending}
            variant="outline"
            className="h-11 px-6 hover:bg-white/5 text-[10px] font-black uppercase tracking-widest rounded-2xl"
          >
            <Save className="w-4 h-4 me-2 opacity-60" />
            {t('save_draft')}
          </Button>
        </PermissionGate>
      )}

      {!isNew && pr?.status === 'DRAFT' && (
        <PermissionGate action="create" resource="pr">
          <Button
            onClick={handleSubmit}
            disabled={submitPRMutation.isPending}
            className="h-11 px-8 bg-primary hover:bg-primary/90 text-primary-foreground text-[10px] font-black uppercase tracking-widest shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)] transition-all rounded-2xl"
          >
            <Send className="w-4 h-4 me-2" />
            {t('submit')}
          </Button>
        </PermissionGate>
      )}

      {!isNew && pr?.status === 'SUBMITTED' && (
        <PermissionGate action="approve" resource="pr">
          <div className="flex items-center gap-3">
            <Button
              variant="destructive"
              onClick={() => setRejectConfirmOpen(true)}
              className="h-11 px-6 text-[10px] font-black uppercase tracking-widest rounded-2xl"
            >
              <XCircle className="w-4 h-4 me-2" />
              {t('reject_pr')}
            </Button>
            <Button
              onClick={() => setApproveConfirmOpen(true)}
              className="h-11 px-8 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest shadow-[0_0_20px_rgba(16,185,129,0.3)] rounded-2xl"
            >
              <CheckCircle className="w-4 h-4 me-2" />
              {t('approve_pr')}
            </Button>
          </div>
        </PermissionGate>
      )}

      {!isNew && pr?.status === 'APPROVED' && (
        <PermissionGate action="approve" resource="pr">
          <Button
            onClick={() => router.push(`/${locale}/purchase-orders/new?pr_id=${id}`)}
            className="h-11 px-8 bg-primary hover:bg-primary/90 text-primary-foreground text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)]"
          >
            <ArrowRight className="w-4 h-4 me-2 rtl:rotate-180" />
            {t('convert_to_po')}
          </Button>
        </PermissionGate>
      )}
    </div>
  );

  /* ── Render ───────────────────────────────────────────────────────────── */
  return (
    <div className="flex flex-col gap-10 relative pb-20">
      <PageHeader
        title={isNew ? t('new_intent') : pr?.document_number || ''}
        description={t('specification')}
        status={pr?.status as BadgeStatus}
        showStatus={!isNew}
        actions={headerActions}
      />

      <Form {...form}>
        <form className="space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            {/* Department selector */}
            <FormField
              control={form.control}
              name="department_id"
              render={({ field }) => (
                <FormItem className="bg-surface-container-low p-6 rounded-2xl shadow-sm flex flex-col gap-1 transition-all hover:bg-surface-container-medium group relative overflow-hidden">
                  <div className="absolute top-0 end-0 p-4 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity">
                    <Building2 className="w-12 h-12" />
                  </div>
                  <FormLabel className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 group-hover:text-cyan-500/60 transition-colors">
                    {t('department')}
                  </FormLabel>
                  <FormControl>
                    {isReadOnly ? (
                      <p className="font-bold text-lg tracking-tight">
                        {DEPARTMENTS.find(d => d.id === field.value)
                          ? tCommon(DEPARTMENTS.find(d => d.id === field.value)!.labelKey as Parameters<typeof tCommon>[0])
                          : (field.value || '—')}
                      </p>
                    ) : (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger
                          id="pr-department-select"
                          className="bg-transparent border-none p-0 h-auto font-bold text-lg tracking-tight focus:ring-0 shadow-none"
                        >
                          <SelectValue placeholder={tCommon('status.all')} />
                        </SelectTrigger>
                        <SelectContent className="bg-surface-container-highest border border-surface-variant/10 shadow-2xl rounded-sm">
                          {DEPARTMENTS.map(dep => (
                            <SelectItem key={dep.id} value={dep.id} className="text-[11px] font-bold">
                              {tCommon(dep.labelKey as Parameters<typeof tCommon>[0])}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </FormControl>
                  <FormMessage className="text-[9px] font-black uppercase" />
                </FormItem>
              )}
            />

            {/* Expected delivery date */}
            <FormField
              control={form.control}
              name="expected_date"
              render={({ field }) => (
                <FormItem className="bg-surface-container-low p-6 rounded-2xl shadow-sm flex flex-col gap-1 transition-all hover:bg-surface-container-medium group relative overflow-hidden">
                  <div className="absolute top-0 end-0 p-4 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity">
                    <Clock className="w-12 h-12" />
                  </div>
                  <FormLabel className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 group-hover:text-cyan-500/60 transition-colors">
                    {t('expected_date')}
                  </FormLabel>
                  <FormControl>
                    {isReadOnly ? (
                      <p className="font-mono font-bold text-lg tracking-tight text-foreground/80" dir="ltr">{field.value || '—'}</p>
                    ) : (
                      <Input
                        id="pr-expected-date"
                        type="date"
                        {...field}
                        dir="ltr"
                        className="bg-transparent border-none p-0 h-auto font-mono font-bold text-lg tracking-tight focus-visible:ring-0"
                      />
                    )}
                  </FormControl>
                  <FormMessage className="text-[9px] font-black uppercase" />
                </FormItem>
              )}
            />

            {/* Status tile — display only */}
            <div className="bg-surface-container-low p-6 rounded-2xl shadow-sm flex flex-col gap-1 transition-all hover:bg-surface-container-medium group relative overflow-hidden">
              <div className="absolute top-0 end-0 p-4 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity text-primary">
                <CheckCircle2 className="w-12 h-12" />
              </div>
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 group-hover:text-cyan-500/60 transition-colors">
                {tCommon('status_label')}
              </Label>
              <p className="font-bold text-lg tracking-tight uppercase text-primary/80">
                {pr?.status ? tCommon(`status.${pr.status.toLowerCase()}` as Parameters<typeof tCommon>[0]) : t('status_init')}
              </p>
            </div>
          </div>

          {/* Line items */}
          {isReadOnly ? (
            <DocumentReadOnlyOverlay isPosted={isReadOnly}>
              <DocumentLineItemTable
                lines={(pr?.lines || []).map(l => ({ ...l, qty: l.req_qty })) as LineItem[]}
                locale={locale}
                isReadOnly={true}
                extraColumns={[
                  {
                    header: t('requested_qty'),
                    cell: (line: LineItem) => <span dir="ltr" className="font-mono">{line.qty as number}</span>
                  },
                  ...(pr?.status === 'APPROVED' || pr?.status === 'POSTED' ? [{
                    header: t('approved_qty'),
                    cell: (line: LineItem) => <span dir="ltr" className="font-mono">{line.qty as number}</span>
                  }] : [])
                ]}
              />
            </DocumentReadOnlyOverlay>
          ) : (
            <DocumentLineItemTable
              lines={(pr?.lines || []).map(l => ({ ...l, qty: l.req_qty })) as LineItem[]}
              locale={locale}
              isReadOnly={false}
              extraColumns={[
                {
                  header: t('requested_qty'),
                  cell: (line: LineItem) => (
                    <input
                      type="number"
                      defaultValue={line.qty as number}
                      aria-label={t('requested_qty')}
                      className="w-20 px-2 py-1.5 bg-surface-container-highest rounded-2xl font-mono text-sm focus:ring-1 focus:ring-primary outline-none transition-all"
                      dir="ltr"
                    />
                  )
                }
              ]}
            />
          )}

          {/* Audit trail */}
          {mockTimeline.length > 0 && (
            <div className="bg-surface-container-low p-8 rounded-2xl shadow-lg transition-all hover:bg-surface-container-medium/50">
              <div className="flex items-center gap-3 mb-10">
                <History className="w-4 h-4 text-primary opacity-40" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground/40">{tCommon('audit_trail')}</h3>
              </div>
              <StatusTimeline entries={mockTimeline} />
            </div>
          )}
        </form>
      </Form>

      <PostConfirmDialog
        open={approveConfirmOpen}
        onOpenChange={setApproveConfirmOpen}
        onConfirm={handleApprove}
        title={t('approve_confirm_title')}
        description={t('approve_confirm_desc')}
        warningText={t('irreversible')}
      />

      <PostConfirmDialog
        open={rejectConfirmOpen}
        onOpenChange={setRejectConfirmOpen}
        onConfirm={handleReject}
        title={t('reject_confirm_title')}
        description={t('reject_confirm_desc')}
        warningText={t('irreversible')}
      />
    </div>
  );
}
