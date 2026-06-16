'use client';

import { useEffect, useMemo, useState } from 'react';

import { useTranslations } from 'next-intl';
import { useUnsavedChangesGuard } from '@/lib/unsaved-changes/useUnsavedChangesGuard';
import { useForm, Controller, useWatch, type FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SmartCombobox } from '@/components/shared/SmartCombobox';
import { Switch } from '@/components/ui/switch';
import { ScanInput } from '@/components/shared/ScanInput/ScanInput';
import { MasterDataFormLayout } from '@/features/master-data/components/MasterDataFormLayout';
import { useBarcode, useCreateBarcode, useUpdateBarcode } from '@/features/barcodes/hooks/useBarcodes';
import { useItems } from '@/features/items/hooks/useItems';
import { useUoMs } from '@/features/uoms/hooks/useUoMs';
import { BarcodeFormSchema, type BarcodeFormValues } from '@/types/master-data';
import { Card, CardContent } from '@/components/ui/card';
import { Cpu, Link as LinkIcon, Hash, Barcode as BarcodeIcon, Settings2 } from 'lucide-react';
import { useConflictHandler } from '@/core/concurrency/useConflictHandler';
import { ConflictDialog } from '@/core/concurrency/ConflictDialog';
import { apiClient } from '@/infrastructure/api/client';
import { z } from 'zod';
import { useAudioFeedback } from '@/hooks/useAudioFeedback';
import { onFormError } from '@/hooks/useFormError';
import { useAbortController } from '@/hooks/useAbortController';

interface Props {
  id: string | null;
  createTitle: string;
  editTitle: string;
  viewTitle: string;
  locale: string;
  isReadOnly?: boolean;
}

export function BarcodeFormClient({ id, createTitle, editTitle, viewTitle, locale, isReadOnly = false }: Props) {
  const tc = useTranslations('common');
  const tb = useTranslations('master_data.barcodes');

  const { data: barcode } = useBarcode(id);
  const { data: items } = useItems();
  const { data: uoms } = useUoMs();

  const create = useCreateBarcode();
  const conflict = useConflictHandler('barcode', id ?? '');
  const update = useUpdateBarcode({ onConflict: conflict.triggerConflict });
  const { playSound } = useAudioFeedback();
  const abortController = useAbortController();

  const { register, handleSubmit, reset, setValue, control, formState: { errors, isDirty, isValid } } =
    useForm<BarcodeFormValues>({
      resolver: zodResolver(BarcodeFormSchema),
      defaultValues: {
        itemId: '',
        code: '',
        version: undefined
      },
      disabled: isReadOnly,
    });

  const { router: guardedRouter } = useUnsavedChangesGuard(isDirty);

  const currentCode = useWatch({ control, name: 'code' });
  const [isCheckingCode, setIsCheckingCode] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);

  const itemItems = useMemo(() => {
    return items?.data?.map((i) => ({
      id: i.id,
      name_en: `${i.code} — ${i.name}`,
      name_ar: `${i.code} — ${i.name}`,
    })) || [];
  }, [items?.data]);

  useEffect(() => {
    if (barcode) {
      reset({
        itemId: barcode.itemId,
        code: barcode.code,
        version: barcode.version
      });
    }
  }, [barcode, reset]);

  useEffect(() => {
    if (!currentCode || id) {
      setCodeError(null);
      return;
    }
    const timer = setTimeout(async () => {
      setIsCheckingCode(true);
      try {
        const response = await apiClient.get(
          `/master-data/barcodes/check-duplicate?barcode=${currentCode}`,
          z.object({ isDuplicate: z.boolean() })
        );
        if (response.isDuplicate) {
          setCodeError(tb('errors.code_exists') || 'This code is already in use');
        } else {
          setCodeError(null);
        }
      } catch (e) {
        setCodeError(null);
      } finally {
        setIsCheckingCode(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [currentCode, id, tb]);

  const onValid = (values: BarcodeFormValues) => {
    if (isReadOnly || codeError) return;

    const payload = {
      itemId: values.itemId,
      code: values.code,
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
            guardedRouter.push('/master-data/barcodes', { skipGuard: true });
          },
          onError: (error) => {
            console.error('Update failed:', error);
          }
        }
      );
    } else {
      create.mutate(
        {
          values: payload,
          signal: abortController.signal
        },
        {
          onSuccess: () => {
            reset(values);
            guardedRouter.push('/master-data/barcodes', { skipGuard: true });
          },
          onError: (error) => {
            console.error('Create failed:', error);
          }
        }
      );
    }
  };

  const onInvalid = (errors: FieldErrors<BarcodeFormValues>) => {
    console.log('3. [BarcodeForm] Validation FAILED (Silent Zod Blocker):', errors);
    onFormError(errors);
  };

  const onSubmit = handleSubmit(onValid, onInvalid);

  return (
    <>
      <MasterDataFormLayout
        title={isReadOnly ? viewTitle : (id ? editTitle : createTitle)}
        backHref='/master-data/barcodes'
        isSaving={create.isPending || update.isPending}
        onSubmit={onSubmit}
        onCancel={() => guardedRouter.push('/master-data/barcodes')}
        hideSave={isReadOnly}
        isDirty={isDirty}
        isValid={isValid}
      >
        <div className="col-span-12 w-full max-w-3xl mx-auto flex flex-col gap-8 p-6 bg-card border border-border rounded-xl mt-6">
          {/* Link Header & Item Selector */}
          <div className="w-full min-w-0 flex flex-col gap-6">
            <div className="flex items-center gap-2 border-b border-border pb-3 mb-4">
              <LinkIcon className="text-muted-foreground w-5 h-5" />
              <h3 className="text-base font-bold text-foreground">{tb('title')}</h3>
            </div>

            <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="w-full min-w-0 flex flex-col gap-1.5 text-start">
                <Label htmlFor="bc-item" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                  {tb('fields.item')}
                </Label>
                <Controller
                  name="itemId"
                  control={control}
                  render={({ field }) => (
                    <SmartCombobox
                      disabled={isReadOnly}
                      value={field.value}
                      onSelect={(item) => field.onChange(item.id)}
                      items={itemItems}
                      placeholder="—"
                      className="w-full bg-surface-container-high/40 hover:bg-surface-container-high transition-colors text-label-xs font-bold"
                    />
                  )}
                />
                {errors.itemId && <p className="text-xs text-red-500 mt-1">{errors.itemId.message}</p>}
              </div>
            </div>
          </div>

          {/* Barcode Section */}
          <div className="w-full min-w-0 flex flex-col gap-6">
            <div className="flex items-center gap-2 border-b border-border pb-3 mb-4">
              <BarcodeIcon className="text-muted-foreground w-5 h-5" />
              <h3 className="text-base font-bold text-foreground">{tb('fields.code')}</h3>
            </div>

            <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="w-full min-w-0 flex flex-col gap-1.5 text-start">
                <Label htmlFor="bc-val" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                  {tb('fields.code')}
                </Label>
                <ScanInput
                  onScan={(val) => setValue('code', val, { shouldValidate: true })}
                  placeholder={isReadOnly ? "" : tb('scan_or_type')}
                  disabled={isReadOnly}
                  size="md"
                />
                <input type="hidden" {...register('code')} />
                {errors.code && <p className="text-xs text-red-500 mt-1">{errors.code.message}</p>}
              </div>
            </div>

            {currentCode && (
              <div className="p-4 bg-surface-container-highest/20 rounded-md border border-status-secondary/10 flex items-center justify-between group max-w-md">
                <div className="flex items-center gap-3">
                  <BarcodeIcon className="w-5 h-5 text-status-secondary/50" />
                  <div>
                    <p className="text-label-xs font-semibold uppercase text-muted-foreground/60">{tb('registered_identity')}</p>
                    <p dir="ltr" className="font-mono text-body-md font-bold text-status-secondary uppercase">{currentCode}</p>
                  </div>
                </div>
                {isCheckingCode ? (
                  <div className="h-4 w-4 border-2 border-status-secondary border-t-transparent rounded-full animate-spin" />
                ) : codeError ? (
                  <p className="text-label-xs font-semibold text-rose-400 uppercase">{codeError}</p>
                ) : (
                  <div className="h-2 w-2 rounded-full bg-status-success animate-pulse" />
                )}
              </div>
            )}
          </div>

          {/* Quick Tips Section */}
          <div className="w-full min-w-0 flex flex-col gap-6">
            <div className="flex items-center gap-2 border-b border-border pb-3 mb-4">
              <Cpu className="text-muted-foreground w-5 h-5" />
              <div className="flex flex-col min-w-0 text-start">
                <h3 className="text-base font-bold text-foreground">{tc('quick_tips')}</h3>
              </div>
            </div>

            <ul className="space-y-4 text-start">
              <li className="text-label-xs text-muted-foreground/80 leading-relaxed font-medium flex gap-3">
                <span className="text-status-active/60 font-semibold">/</span>
                <span>{tb('tips.multi_unit_desc')}</span>
              </li>
              <li className="text-label-xs text-muted-foreground/80 leading-relaxed font-medium flex gap-3">
                <span className="text-status-active/60 font-semibold">/</span>
                <span>{tb('tips.uniqueness_desc')}</span>
              </li>
            </ul>
          </div>
        </div>
      </MasterDataFormLayout>
      <ConflictDialog open={conflict.open} onReload={conflict.handleReload} onClose={conflict.handleClose} />
    </>
  );
}
