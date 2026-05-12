'use client';

import { useEffect } from 'react';

import { useTranslations } from 'next-intl';
import { useUnsavedChangesGuard } from '@/lib/unsaved-changes/useUnsavedChangesGuard';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from '@/components/ui/select';
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

  const { register, handleSubmit, reset, setValue, control, formState: { errors, isDirty, isValid } } =
    useForm<BarcodeFormValues>({
      resolver: zodResolver(BarcodeFormSchema),
      defaultValues: { 
        item_id: '', 
        uom_id: '', 
        code: '', 
        default_qty: 1,
        is_active: true,
        version: undefined
      },
      disabled: isReadOnly,
    });
    
  const { router: guardedRouter } = useUnsavedChangesGuard(isDirty);

  const currentCode = useWatch({ control, name: 'code' });

 useEffect(() => {
 if (barcode) {
 reset({ 
 item_id: barcode.item_id, 
 uom_id: barcode.uom_id,
 code: barcode.code, 
 default_qty: barcode.default_qty,
 is_active: barcode.is_active,
 version: barcode.version
 });
 }
 }, [barcode, reset]);

  const onSubmit = handleSubmit(async (values) => {
    if (isReadOnly) return;
    
    try {
      if (id) {
        await update.mutateAsync({ id, values });
      } else {
        await create.mutateAsync(values);
      }
      reset(values);
      guardedRouter.push('/master-data/barcodes', { skipGuard: true });
    } catch {
      // Error handled by mutation hooks or conflict handler
    }
  });

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
 name="item_id"
 control={control}
 render={({ field }) => (
  <Select disabled={isReadOnly} value={field.value} onValueChange={field.onChange}>
 <SelectTrigger id="bc-item" className="h-11 border-none bg-surface-container-high/40 hover:bg-surface-container-high transition-colors uppercase text-label-xs font-bold">
 <SelectValue placeholder="—" />
 </SelectTrigger>
 <SelectContent className="bg-surface-container-highest border-none">
 {items?.data?.map((i) => (
 <SelectItem key={i.id} value={i.id} className="font-semibold text-label-xs uppercase">
 {i.code} — {locale === 'ar' ? i.name_ar : i.name_en}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 )}
 />
 {errors.item_id && <p className="text-label-xs font-semibold text-rose-400 uppercase">{errors.item_id.message}</p>}
 </div>

 <div className="space-y-2">
 <Label htmlFor="bc-uom" className="text-label-xs font-semibold uppercase text-muted-foreground/70">
 {tb('fields.uom')}
 </Label>
 <Controller
 name="uom_id"
 control={control}
 render={({ field }) => (
  <Select disabled={isReadOnly} value={field.value} onValueChange={field.onChange}>
 <SelectTrigger id="bc-uom" className="h-11 border-none bg-surface-container-high/40 hover:bg-surface-container-high transition-colors uppercase text-label-xs font-bold">
 <SelectValue placeholder="—" />
 </SelectTrigger>
 <SelectContent className="bg-surface-container-highest border-none">
 {uoms?.data?.map((u) => (
 <SelectItem key={u.id} value={u.id} className="font-semibold text-label-xs uppercase">
 {u.code} — {locale === 'ar' ? u.name_ar : u.name_en}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 )}
 />
 {errors.uom_id && <p className="text-label-xs font-semibold text-rose-400 uppercase">{errors.uom_id.message}</p>}
 </div>

 <div className="space-y-2">
 <Label htmlFor="bc-qty" className="text-label-xs font-semibold uppercase text-muted-foreground/70">
 {tb('fields.default_qty')}
 </Label>
 <div className="relative group">
 <Hash className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40 group-focus-within:text-status-active transition-colors" />
                <Input 
                  id="bc-qty" 
                  type="number" 
                  dir="ltr" 
                  min={1}
                  disabled={isReadOnly}
                  {...register('default_qty', { valueAsNumber: true })} 
                  className="h-11 ps-10 border-none bg-surface-container-high/40 focus:bg-surface-container-high transition-colors font-mono font-bold text-label-sm text-status-active"
                />
 </div>
 {errors.default_qty && <p className="text-label-xs font-semibold text-rose-400 uppercase">{errors.default_qty.message}</p>}
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
 <div className="h-2 w-2 rounded-full bg-status-secondary animate-pulse" />
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
 <div className="w-10 h-10 rounded-md bg-status-active/10 flex items-center justify-center">
 <Settings2 className="w-5 h-5 text-status-active" />
 </div>
 <div>
 <h3 className="text-body-md font-semibold text-foreground uppercase">{tb('configuration')}</h3>
 <p className="text-label-xs font-semibold text-muted-foreground/60 uppercase mt-0.5">{tb('operational_status')}</p>
 </div>
 </div>
 
 <div className="flex items-center justify-between p-4 bg-surface-container-highest/10 rounded-md border border-surface-variant/5">
 <div className="space-y-0.5">
 <Label className="text-label-xs font-bold uppercase text-foreground/80">{tb('active_status_label')}</Label>
 <p className="text-label-xxs text-muted-foreground uppercase font-medium">{tb('active_status_desc')}</p>
 </div>
 <Controller
 name="is_active"
 control={control}
 render={({ field }) => (
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={isReadOnly}
                    className="data-[state=checked]:bg-status-active"
                  />
 )}
 />
 </div>
 </CardContent>
 </Card>

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

