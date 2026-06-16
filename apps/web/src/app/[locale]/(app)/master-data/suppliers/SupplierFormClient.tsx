'use client';

import { useEffect, useState, useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useForm, useWatch, Controller, type FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Truck, CreditCard, ShieldCheck, Edit3, Trash2 } from 'lucide-react';
import { useConflictHandler } from '@/core/concurrency/useConflictHandler';
import { toast } from 'sonner';
import { ConflictDialog } from '@/core/concurrency/ConflictDialog';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { useAbortController } from '@/hooks/useAbortController';
import { MasterDataFormLayout } from '@/features/master-data/components/MasterDataFormLayout';
import { SmartCombobox } from '@/components/shared/SmartCombobox';
import { useSupplier, useCreateSupplier, useUpdateSupplier, useDeleteSupplier, useSuppliers } from '@/features/suppliers/hooks/useSuppliers';
import { generateNextCode } from '@/lib/code-generator';
import { SupplierFormSchema, type SupplierFormValues, type Supplier } from '@/types/master-data';
import { useCurrencies, type Currency } from '@/features/purchasing/hooks/useCurrencies';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { ErrorState } from '@/components/shared/ErrorState';
import { useUnsavedChangesGuard } from '@/lib/unsaved-changes/useUnsavedChangesGuard';
import { Button } from '@/components/ui/button';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { PostConfirmDialog } from '@/components/shared/PostConfirmDialog';
import { useAudioFeedback } from '@/hooks/useAudioFeedback';
import { onFormError } from '@/hooks/useFormError';

interface Props {
  id: string | null;
  createTitle: string;
  editTitle: string;
  viewTitle: string;
  isReadOnly?: boolean;
}

export function SupplierFormClient({ id, createTitle, editTitle, viewTitle, isReadOnly = false }: Props) {
  const t = useTranslations('common');
  const tm = useTranslations('master_data.common');
  const ts = useTranslations('master_data.suppliers');
  const tv = useTranslations();
  const locale = useLocale();
  const abortController = useAbortController();

  const { data, isLoading, isError, refetch } = useSupplier(id);
  const { data: currencies, isLoading: isCurrenciesLoading } = useCurrencies();
  const { data: suppliersData } = useSuppliers();
  const create = useCreateSupplier();
  const conflict = useConflictHandler('supplier', id ?? '');
  const update = useUpdateSupplier({ onConflict: conflict.triggerConflict });
  const deleteMutation = useDeleteSupplier();
  const { playSound } = useAudioFeedback();

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isAutoPopulated, setIsAutoPopulated] = useState(false);

  const { register, handleSubmit, reset, setValue, control, formState: { errors, isDirty, isValid } } =
    useForm<SupplierFormValues>({
      resolver: zodResolver(SupplierFormSchema),
      disabled: isReadOnly,
      defaultValues: { code: '', name: '', currencyId: '', paymentTerms: '', contactName: '', contactEmail: '', contactPhone: '', isActive: true, version: undefined },
    });

  const { router: guardedRouter } = useUnsavedChangesGuard(isDirty);

  const isActive = useWatch({ control, name: 'isActive' });

  const currencyItems = useMemo(() => {
    const list = currencies?.map((c: Currency) => ({
      id: c.id,
      name_en: `${c.code} — ${c.name}`,
      name_ar: `${c.code} — ${c.name}`,
    })) || [];
    return [{ id: '', name_en: '—', name_ar: '—' }, ...list];
  }, [currencies]);

  const codeValue = useWatch({ control, name: 'code' });

  useEffect(() => {
    if (data) {
      reset({
        code: data.code,
        name: data.name,
        currencyId: data.currencyId,
        paymentTerms: data.paymentTerms || '',
        contactName: data.contactName || '',
        contactEmail: data.contactEmail || '',
        contactPhone: data.contactPhone || '',
        isActive: data.isActive,
        version: data.version,
      });
    }
  }, [data, reset]);

  useEffect(() => {
    if (!id && suppliersData?.data && !codeValue && !isAutoPopulated) {
      const existingCodes = suppliersData.data.map((s: Supplier) => s.code);
      const nextCode = generateNextCode(existingCodes, 'SUP-', 4);
      setValue('code', nextCode, { shouldDirty: true, shouldValidate: true });
      setIsAutoPopulated(true);
    }
  }, [id, suppliersData, setValue, codeValue, isAutoPopulated]);

  const onValid = (values: SupplierFormValues) => {
    if (isReadOnly) return;

    const payload = {
      code: values.code || undefined,
      name: values.name,
      currencyId: values.currencyId || undefined,
      paymentTerms: values.paymentTerms,
      contactName: values.contactName || undefined,
      contactEmail: values.contactEmail || undefined,
      contactPhone: values.contactPhone || undefined,
      isActive: values.isActive ?? true,
    };

    if (id) {
      update.mutate(
        {
          id,
          values: {
            ...payload,
            version: values.version || undefined,
          },
          signal: abortController.signal
        },
        {
          onSuccess: () => {
            reset(values);
            guardedRouter.push('/master-data/suppliers', { skipGuard: true });
          },
          onError: (error) => {
            console.error('Update failed:', error);
          }
        }
      );
    } else {
      create.mutate(
        {
          ...payload,
          signal: abortController.signal
        },
        {
          onSuccess: () => {
            reset(values);
            guardedRouter.push('/master-data/suppliers', { skipGuard: true });
          },
          onError: (error) => {
            console.error('Create failed:', error);
          }
        }
      );
    }
  };

  const onInvalid = (errors: FieldErrors<SupplierFormValues>) => {
    console.log('3. [SupplierForm] Validation FAILED (Silent Zod Blocker):', errors);
    onFormError(errors);
  };

  const onSubmit = handleSubmit(onValid, onInvalid);

  const handleDelete = () => {
    if (!id) return;
    deleteMutation.mutate(
      { id, version: data?.version, signal: abortController.signal },
      {
        onSuccess: () => {
          guardedRouter.push('/master-data/suppliers', { skipGuard: true });
        },
        onError: (error) => {
          console.error('Delete failed:', error);
          setDeleteConfirmOpen(false);
        }
      }
    );
  };

  const isSaving = create.isPending || update.isPending;

  if (id && isLoading) return <PageSkeleton variant="detail" />;
  if (id && isError) return <ErrorState onRetry={refetch} />;
  if (id && !data && !isLoading) return <ErrorState type="not_found" onRetry={() => guardedRouter.push('/master-data/suppliers')} />;

  if (isCurrenciesLoading && !id) return <PageSkeleton variant="detail" />;

  return (
    <>
      <MasterDataFormLayout
        title={isReadOnly ? viewTitle : (id ? editTitle : createTitle)}
        backHref='/master-data/suppliers'
        isSaving={isSaving}
        saveDisabled={conflict.saveDisabled}
        onSubmit={onSubmit}
        onCancel={() => guardedRouter.push('/master-data/suppliers', { skipGuard: true })}
        hideSave={isReadOnly}
        resource="master_data"
        saveAction={id ? 'edit' : 'create'}
        isDirty={isDirty}
        isValid={isValid}
        headerActions={
          id && (
            <div className="flex gap-4">
              <PermissionGate action="delete" resource="master_data">
                <Button
                  variant="ghost"
                  onClick={() => setDeleteConfirmOpen(true)}
                  className="h-12 w-12 rounded-xl bg-status-error/5 hover:bg-status-error/10 text-status-error border-none transition-all"
                  title={t('actions.delete')}
                >
                  <Trash2 className="w-5 h-5" />
                </Button>
              </PermissionGate>

              {isReadOnly && (
                <PermissionGate action="edit" resource="master_data">
                  <Button
                    onClick={() => guardedRouter.push(`/master-data/suppliers/${id}/edit`)}
                    className="h-12 px-6 bg-operational-cyan text-white hover:bg-operational-cyan/90 font-bold rounded-xl flex items-center gap-2 transition-all shadow-sm shadow-operational-cyan/20"
                  >
                    <Edit3 className="w-4 h-4" />
                    {t('actions.edit')}
                  </Button>
                </PermissionGate>
              )}
            </div>
          )
        }
      >
        <div className="col-span-12 w-full max-w-3xl mx-auto flex flex-col gap-8 p-6 bg-card border border-border rounded-xl mt-6">
          {/* Partner Identity Section */}
          <div className="w-full min-w-0 flex flex-col gap-6">
            <div className="flex items-center gap-2 border-b border-border pb-3 mb-4">
              <Truck className="text-muted-foreground w-5 h-5" />
              <h3 className="text-base font-bold text-foreground">{ts('partner_identity')}</h3>
            </div>

            <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Code */}
              <div className="w-full min-w-0 flex flex-col gap-1.5 text-start">
                <Label htmlFor="sup-code" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">{tm('code')}</Label>
                <Input
                  id="sup-code"
                  dir="ltr"
                  {...register('code')}
                  disabled={isReadOnly}
                  className="font-mono font-semibold uppercase text-status-active w-full h-10"
                  placeholder={ts('code_placeholder')}
                />
                {errors.code?.message && <p className="text-xs text-red-500 mt-1">{tv(errors.code.message as never)}</p>}
              </div>

              {/* Name */}
              <div className="w-full min-w-0 flex flex-col gap-1.5 text-start">
                <Label htmlFor="sup-name" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">{tm('name') || 'Name'}</Label>
                <Input
                  id="sup-name"
                  {...register('name')}
                  disabled={isReadOnly}
                  className="font-semibold w-full h-10"
                  placeholder={ts('name_placeholder') || 'Enter Supplier Name'}
                />
                {errors.name?.message && <p className="text-xs text-red-500 mt-1">{tv(errors.name.message as never)}</p>}
              </div>
            </div>
          </div>

          {/* Contact Info Section */}
          <div className="w-full min-w-0 flex flex-col gap-6">
            <div className="flex items-center gap-2 border-b border-border pb-3 mb-4">
              <Truck className="text-muted-foreground w-5 h-5" />
              <h3 className="text-base font-bold text-foreground">{ts('contact_info')}</h3>
            </div>

            <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Contact Person */}
              <div className="w-full min-w-0 flex flex-col gap-1.5 text-start">
                <Label htmlFor="sup-contact-name" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">{ts('contact_person')}</Label>
                <Input
                  id="sup-contact-name"
                  {...register('contactName')}
                  disabled={isReadOnly}
                  className="font-semibold w-full h-10"
                  placeholder={ts('contact_person_placeholder')}
                />
              </div>

              {/* Email */}
              <div className="w-full min-w-0 flex flex-col gap-1.5 text-start">
                <Label htmlFor="sup-contact-email" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">{ts('email')}</Label>
                <Input
                  id="sup-contact-email"
                  type="email"
                  {...register('contactEmail')}
                  disabled={isReadOnly}
                  className="font-semibold w-full h-10"
                  placeholder={ts('email_placeholder')}
                />
                {errors.contactEmail?.message && <p className="text-xs text-red-500 mt-1">{tv(errors.contactEmail.message as never)}</p>}
              </div>

              {/* Phone */}
              <div className="w-full min-w-0 flex flex-col gap-1.5 text-start md:col-span-2">
                <Label htmlFor="sup-contact-phone" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">{ts('phone')}</Label>
                <Input
                  id="sup-contact-phone"
                  {...register('contactPhone')}
                  disabled={isReadOnly}
                  className="font-semibold w-full h-10"
                  placeholder={ts('phone_placeholder')}
                />
              </div>
            </div>
          </div>

          {/* Financial Terms Section */}
          <div className="w-full min-w-0 flex flex-col gap-6">
            <div className="flex items-center gap-2 border-b border-border pb-3 mb-4">
              <CreditCard className="text-muted-foreground w-5 h-5" />
              <h3 className="text-base font-bold text-foreground">{ts('financial_terms')}</h3>
            </div>

            <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Currency */}
              <div className="w-full min-w-0 flex flex-col gap-1.5 text-start">
                <Label htmlFor="sup-currency" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">{ts('fields.currency')}</Label>
                <Controller
                  name="currencyId"
                  control={control}
                  render={({ field }) => (
                    <SmartCombobox
                      disabled={isReadOnly}
                      value={field.value ?? undefined}
                      onSelect={(item) => field.onChange(item.id)}
                      items={currencyItems}
                      placeholder="—"
                      className="w-full bg-surface-container-high/40 hover:bg-surface-container-high transition-colors text-label-xs font-bold"
                    />
                  )}
                />
                {errors.currencyId?.message && <p className="text-xs text-red-500 mt-1">{tv(errors.currencyId.message as never)}</p>}
              </div>

              {/* Payment Terms */}
              <div className="w-full min-w-0 flex flex-col gap-1.5 text-start">
                <Label htmlFor="sup-terms" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">{ts('fields.payment_terms')}</Label>
                <Textarea
                  id="sup-terms"
                  rows={4}
                  {...register('paymentTerms')}
                  disabled={isReadOnly}
                  className="font-medium resize-none p-4 w-full"
                  placeholder={ts('terms_placeholder')}
                />
              </div>
            </div>
          </div>

          {/* Status Section */}
          <div className="w-full min-w-0 flex flex-col gap-6">
            <div className="flex items-center gap-2 border-b border-border pb-3 mb-4">
              <ShieldCheck className="text-muted-foreground w-5 h-5" />
              <h3 className="text-base font-bold text-foreground">{tm('status_label')}</h3>
            </div>

            <div className="flex flex-row items-center justify-between w-full rounded-lg border border-border p-4 shadow-sm bg-transparent transition-colors hover:bg-muted/30">
              <div className="flex flex-col space-y-1 text-start min-w-0">
                <span className="text-sm font-medium text-text-main dark:text-white">{tm('is_active')}</span>
                <span className="text-xs text-muted-foreground dark:text-gray-400">{isActive ? tm('active') : tm('inactive')}</span>
              </div>
              <Controller
                control={control}
                name="isActive"
                render={({ field }) => (
                  <Switch
                    id="sup-active"
                    checked={field.value ?? true}
                    onCheckedChange={(v) => !isReadOnly && field.onChange(v)}
                    disabled={isReadOnly}
                    activeClassName="bg-status-active"
                  />
                )}
              />
            </div>
          </div>
        </div>

      </MasterDataFormLayout>

      <ConflictDialog
        open={conflict.open}
        onReload={conflict.handleReload}
        onClose={conflict.handleClose}
        error={conflict.error}
      />

      <PostConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        onConfirm={handleDelete}
        isLoading={deleteMutation.isPending}
        title={ts('delete_confirm_title')}
        description={ts('delete_confirm_desc')}
        confirmText={t('actions.delete')}
        variant="destructive"
        icon="delete"
      />
    </>
  );
}
