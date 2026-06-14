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
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
 <div className="lg:col-span-2 space-y-8">
 <Card className="bg-surface-container-low border-none rounded-md overflow-hidden">
 <CardContent className="p-8 space-y-8">
 <div className="flex items-center gap-3 pb-4 border-b border-surface-variant/10">
 <div className="w-10 h-10 rounded-md bg-tertiary-container/10 flex items-center justify-center">
 <LinkIcon className="w-5 h-5 text-tertiary" />
 </div>
 <div>
 <h3 className="text-body-md font-semibold text-foreground uppercase">{tb('title')}</h3>
 <p className="text-label-xs font-semibold text-muted-foreground/60 uppercase mt-0.5">{tb('description')}</p>
 </div>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
   <div className="space-y-2">
   <Label htmlFor="bc-item" className="text-label-xs font-semibold uppercase text-muted-foreground/70">
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
   {errors.itemId && <p className="text-label-xs font-semibold text-rose-400 uppercase">{errors.itemId.message}</p>}
   </div>


 </div>
 </CardContent>
 </Card>

 <Card className="bg-surface-container-low border-none rounded-md overflow-hidden">
 <CardContent className="p-8 space-y-8">
 <div className="flex items-center gap-3 pb-4 border-b border-surface-variant/10">
 <div className="w-10 h-10 rounded-md bg-status-secondary/10 flex items-center justify-center">
 <BarcodeIcon className="w-5 h-5 text-status-secondary" />
 </div>
 <div>
 <h3 className="text-body-md font-semibold text-foreground uppercase">{tb('fields.code')}</h3>
 <p className="text-label-xs font-semibold text-muted-foreground/60 uppercase mt-0.5">{tb('physical_mapping')}</p>
 </div>
 </div>

 <div className="space-y-6">
 <div className="space-y-2">
 <Label htmlFor="bc-val" className="text-label-xs font-semibold uppercase text-muted-foreground/70">
 {tb('fields.code')}
 </Label>
                <ScanInput
                  onScan={(val) => setValue('code', val, { shouldValidate: true })}
                  placeholder={isReadOnly ? "" : tb('scan_or_type')}
                  disabled={isReadOnly}
                  size="md"
                />
 <input type="hidden" {...register('code')} />
 {errors.code && <p className="text-label-xs font-semibold text-rose-400 uppercase">{errors.code.message}</p>}
 </div>

 {currentCode && (
 <div className="p-4 bg-surface-container-highest/20 rounded-md border border-status-secondary/10 flex items-center justify-between group">
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
 </CardContent>
 </Card>
 </div>

 <div className="space-y-8">

 <Card className="bg-surface-container-low border-none rounded-md overflow-hidden">
 <CardContent className="p-8 space-y-6">
 <div className="flex items-center gap-3 pb-4 border-b border-surface-variant/10">
 <div className="w-10 h-10 rounded-md bg-tertiary-container/10 flex items-center justify-center">
 <Cpu className="w-5 h-5 text-tertiary" />
 </div>
 <div className="flex flex-col">
 <h3 className="text-body-md font-semibold text-foreground uppercase">{tc('quick_tips')}</h3>
 <p className="text-label-xs font-semibold text-muted-foreground/60 uppercase mt-0.5">{tc('hardware_usage')}</p>
 </div>
 </div>
 
 <ul className="space-y-4">
 <li className="text-label-xs text-muted-foreground/80 leading-relaxed font-medium flex gap-3">
 <span className="text-status-active/60 font-semibold">/</span>
 <span>{tb('tips.multi_unit_desc')}</span>
 </li>
 <li className="text-label-xs text-muted-foreground/80 leading-relaxed font-medium flex gap-3">
 <span className="text-status-active/60 font-semibold">/</span>
 <span>{tb('tips.uniqueness_desc')}</span>
 </li>
 </ul>
 </CardContent>
 </Card>
 </div>
      </div>
    </MasterDataFormLayout>
      <ConflictDialog open={conflict.open} onReload={conflict.handleReload} onClose={conflict.handleClose} />
    </>
  );
}

