'use client';

import { useEffect, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useForm, useWatch, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Truck, CreditCard, ShieldCheck, Edit3, Trash2 } from 'lucide-react';
import { useConflictHandler } from '@/core/concurrency/useConflictHandler';
import { ConflictDialog } from '@/core/concurrency/ConflictDialog';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { useAbortController } from '@/hooks/useAbortController';
import { MasterDataFormLayout } from '@/features/master-data/components/MasterDataFormLayout';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSupplier, useCreateSupplier, useUpdateSupplier, useDeleteSupplier } from '@/features/suppliers/hooks/useSuppliers';
import { SupplierFormSchema, type SupplierFormValues } from '@/types/master-data';
import { useCurrencies, type Currency } from '@/features/purchasing/hooks/useCurrencies';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { ErrorState } from '@/components/shared/ErrorState';
import { useUnsavedChangesGuard } from '@/lib/unsaved-changes/useUnsavedChangesGuard';
import { Button } from '@/components/ui/button';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { PostConfirmDialog } from '@/components/shared/PostConfirmDialog';

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
  const tv = useTranslations('master_data.validation');
  const locale = useLocale();
  const abortController = useAbortController();

  const { data, isLoading, isError, refetch } = useSupplier(id);
  const { data: currencies, isLoading: isCurrenciesLoading } = useCurrencies();
  const create = useCreateSupplier();
  const conflict = useConflictHandler('supplier', id ?? '');
  const update = useUpdateSupplier({ onConflict: conflict.triggerConflict });
  const deleteMutation = useDeleteSupplier();

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const { register, handleSubmit, reset, setValue, control, formState: { errors, isDirty, isValid } } =
    useForm<SupplierFormValues>({
      resolver: zodResolver(SupplierFormSchema),
      disabled: isReadOnly,
      defaultValues: { code: '', name_ar: '', name_en: '', currency_id: '', payment_terms: '', is_active: true, version: undefined },
    });

  const { router: guardedRouter } = useUnsavedChangesGuard(isDirty);

  const isActive = useWatch({ control, name: 'is_active' });

  useEffect(() => {
    if (data) {
      reset({
        code: data.code,
        name_ar: data.name_ar,
        name_en: data.name_en,
        currency_id: data.currency_id,
        payment_terms: data.payment_terms || '',
        is_active: data.is_active,
        version: data.version,
      });
    }
  }, [data, reset]);

  const onSubmit = handleSubmit(async (values) => {
    if (isReadOnly) return;
    
    try {
      if (id) {
        await update.mutateAsync({ id, values, signal: abortController.signal });
      } else {
        await create.mutateAsync({ ...values, signal: abortController.signal });
      }
      reset(values);
      guardedRouter.push('/master-data/suppliers', { skipGuard: true });
    } catch {
      // Error handled by mutation hooks or conflict handler
    }
  });

  const handleDelete = async () => {
    if (!id) return;
    try {
      await deleteMutation.mutateAsync({ id, signal: abortController.signal });
      guardedRouter.push('/master-data/suppliers', { skipGuard: true });
    } catch {
      // Error handled by mutation hook
    }
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
                  className="h-12 px-6 bg-operational-cyan text-white hover:bg-operational-cyan/90 font-bold rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-operational-cyan/20"
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Card className="bg-surface-container-low border-none overflow-hidden">
            <CardContent className="p-8 space-y-8">
              <div className="flex items-center gap-3 pb-4 border-b border-surface-variant/10">
                <div className="w-10 h-10 rounded-md bg-tertiary-container/10 flex items-center justify-center">
                  <Truck className="w-5 h-5 text-tertiary" />
                </div>
                <div>
                  <h3 className="text-body-md font-semibold text-foreground uppercase">{ts('partner_identity')}</h3>
                  <p className="text-label-xs font-semibold text-muted-foreground/60 uppercase mt-0.5">{ts('partner_identity_desc')}</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <Label htmlFor="sup-code" className="text-label-xs font-semibold uppercase text-muted-foreground/70">{tm('code')}</Label>
                    <Input 
                      id="sup-code" 
                      dir="ltr" 
                      {...register('code')} 
                      disabled={isReadOnly}
                      className="font-mono font-semibold uppercase text-status-active" 
                      placeholder={ts('code_placeholder')} 
                    />
                    {errors.code && <p className="text-label-xs font-semibold text-status-error uppercase">{tv(errors.code.message as Parameters<typeof tv>[0])}</p>}
                  </div>
                  <div className="hidden md:block" /> {/* Spacer for consistent grid alignment */}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <Label htmlFor="sup-name-en" className="text-label-xs font-semibold uppercase text-muted-foreground/70">{tm('name_en')}</Label>
                    <Input 
                      id="sup-name-en" 
                      dir="ltr" 
                      {...register('name_en')} 
                      disabled={isReadOnly}
                      className="font-semibold" 
                      placeholder={ts('name_en_placeholder')} 
                    />
                    {errors.name_en && <p className="text-label-xs font-semibold text-status-error uppercase">{tv(errors.name_en.message as Parameters<typeof tv>[0])}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sup-name-ar" className="text-label-xs font-semibold uppercase text-muted-foreground/70">{tm('name_ar')}</Label>
                    <Input 
                      id="sup-name-ar" 
                      dir="rtl" 
                      {...register('name_ar')} 
                      disabled={isReadOnly}
                      className="font-semibold" 
                      placeholder={ts('name_ar_placeholder')} 
                    />
                    {errors.name_ar && <p className="text-label-xs font-semibold text-status-error uppercase">{tv(errors.name_ar.message as Parameters<typeof tv>[0])}</p>}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-surface-container-low border-none overflow-hidden">
            <CardContent className="p-8 space-y-8">
              <div className="flex items-center gap-3 pb-4 border-b border-surface-variant/10">
                <div className="w-10 h-10 rounded-md bg-tertiary-container/10 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-tertiary" />
                </div>
                <div>
                  <h3 className="text-body-md font-semibold text-foreground uppercase">{ts('financial_terms')}</h3>
                  <p className="text-label-xs font-semibold text-muted-foreground/60 uppercase mt-0.5">{ts('financial_terms_desc')}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <Label htmlFor="sup-currency" className="text-label-xs font-semibold uppercase text-muted-foreground/70">{ts('fields.currency')}</Label>
                  <Controller
                    name="currency_id"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange} disabled={isReadOnly}>
                        <SelectTrigger id="sup-currency">
                          <SelectValue placeholder="—" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">—</SelectItem>
                          {currencies?.map((c: Currency) => (
                            <SelectItem key={c.id} value={c.id} className="font-semibold text-label-sm uppercase">
                              {c.code} — {locale === 'ar' ? c.name_ar : c.name_en}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.currency_id && <p className="text-label-xs font-semibold text-status-error uppercase">{tv(errors.currency_id.message as Parameters<typeof tv>[0])}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sup-terms" className="text-label-xs font-semibold uppercase text-muted-foreground/70">{ts('fields.payment_terms')}</Label>
                  <Textarea 
                    id="sup-terms" 
                    rows={4} 
                    {...register('payment_terms')} 
                    disabled={isReadOnly}
                    className="font-medium resize-none p-4" 
                    placeholder={ts('terms_placeholder')} 
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
          <Card className="bg-surface-container-low border-none overflow-hidden">
            <CardContent className="p-8 space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-surface-variant/10">
                <div className="w-10 h-10 rounded-md bg-tertiary-container/10 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-tertiary" />
                </div>
                <div>
                  <h3 className="text-body-md font-semibold text-foreground uppercase">{tm('status_label')}</h3>
                  <p className="text-label-xs font-semibold text-muted-foreground/60 uppercase mt-0.5">{tm('operational_availability')}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-surface-container-highest/20 rounded-md border border-surface-variant/10 group transition-all hover:bg-surface-container-highest/30">
                <div className="space-y-1">
                  <Label htmlFor="sup-active" className="text-label-xs font-semibold uppercase cursor-pointer text-muted-foreground/60">{tm('is_active')}</Label>
                  <p className={`text-label-sm font-semibold uppercase ${isActive ? 'text-status-active' : 'text-status-error'}`}>{isActive ? tm('active') : tm('inactive')}</p>
                </div>
                <Switch
                  id="sup-active"
                  checked={isActive}
                  onCheckedChange={(v) => !isReadOnly && setValue('is_active', v)}
                  disabled={isReadOnly}
                  className="data-[state=checked]:bg-status-active"
                />
              </div>
            </CardContent>
          </Card>
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
