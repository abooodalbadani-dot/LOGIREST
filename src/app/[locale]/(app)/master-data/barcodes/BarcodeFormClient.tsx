'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useForm, Controller } from 'react-hook-form';
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
import { ScanInput } from '@/components/shared/ScanInput/ScanInput';
import { MasterDataFormLayout } from '@/features/master-data/components/MasterDataFormLayout';
import {
  useMasterDataItem, useMasterDataCreate, useMasterDataUpdate, useMasterDataList,
} from '@/features/master-data/hooks/useMasterDataCRUD';
import { BarcodeSchema, BarcodeFormSchema, ItemSchema, type BarcodeFormValues } from '@/types/master-data';
import { Card, CardContent } from '@/components/ui/card';
import { Cpu, Link as LinkIcon, Hash, Barcode as BarcodeIcon } from 'lucide-react';

interface Props { id: string | null; createTitle: string; editTitle: string; locale: string; }

export function BarcodeFormClient({ id, createTitle, editTitle, locale }: Props) {
  const tc = useTranslations('masterData.common');
  const tb = useTranslations('masterData.barcodes');
  const router = useRouter();

  const { data } = useMasterDataItem('barcodes', id, BarcodeSchema);
  const { data: items } = useMasterDataList('items', ItemSchema);
  const create = useMasterDataCreate('barcodes', BarcodeSchema);
  const update = useMasterDataUpdate('barcodes', BarcodeSchema);

  const { register, handleSubmit, reset, setValue, watch, control, formState: { errors } } =
    useForm<BarcodeFormValues>({
      resolver: zodResolver(BarcodeFormSchema),
      defaultValues: { item_id: '', barcode: '', default_qty: 1 },
    });

  const currentBarcode = watch('barcode');

  useEffect(() => {
    if (data) {
      reset({ item_id: data.item_id, barcode: data.barcode, default_qty: data.default_qty });
    }
  }, [data, reset]);

  const onSubmit = handleSubmit(async (values) => {
    if (id) await update.mutateAsync({ id, body: values });
    else await create.mutateAsync(values);
    router.push(`/${locale}/master-data/barcodes`);
  });

  return (
    <MasterDataFormLayout 
      title={id ? editTitle : createTitle} 
      backHref={`/${locale}/master-data/barcodes`}
      isSaving={create.isPending || update.isPending} 
      onSubmit={onSubmit}
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
                  <h3 className="text-sm font-semibold tracking-tight text-foreground uppercase">{tb('mapping_section')}</h3>
                  <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-[0.08em] mt-0.5">{tb('mapping_description')}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <Label htmlFor="bc-item" className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">
                    {tb('item')}
                  </Label>
                  <Controller
                    name="item_id"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger id="bc-item">
                          <SelectValue placeholder="—" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">—</SelectItem>
                          {items?.data?.map((i) => (
                            <SelectItem key={i.id} value={i.id} className="font-semibold text-xs uppercase tracking-[0.08em]">
                              {i.code} — {i.name_en}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.item_id && <p className="text-[10px] font-semibold text-rose-400 uppercase tracking-tight">{errors.item_id.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bc-qty" className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">
                    {tb('default_qty')}
                  </Label>
                  <div className="relative group">
                    <Hash className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40 group-focus-within:text-status-active transition-colors" />
                    <Input 
                      id="bc-qty" 
                      type="number" 
                      dir="ltr" 
                      min={1}
                      {...register('default_qty', { valueAsNumber: true })} 
                      className="ps-10 font-mono font-semibold text-xs text-status-active"
                    />
                  </div>
                  {errors.default_qty && <p className="text-[10px] font-semibold text-rose-400 uppercase tracking-tight">{errors.default_qty.message}</p>}
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
                  <h3 className="text-sm font-semibold tracking-tight text-foreground uppercase">{tb('hardware_integration')}</h3>
                  <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-[0.08em] mt-0.5">{tb('scan_description')}</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="bc-val" className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">
                    {tb('barcode_label')}
                  </Label>
                  <ScanInput
                    onScan={(val) => setValue('barcode', val, { shouldValidate: true })}
                    placeholder={tb('scan_or_type')}
                    className="font-mono font-semibold text-xs text-status-secondary"
                  />
                  <input type="hidden" {...register('barcode')} />
                  {errors.barcode && <p className="text-[10px] font-semibold text-rose-400 uppercase tracking-tight">{errors.barcode.message}</p>}
                </div>

                {currentBarcode && (
                  <div className="p-4 bg-surface-container-highest/20 rounded-md border border-status-secondary/10 flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <BarcodeIcon className="w-5 h-5 text-status-secondary/50" />
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/60">{tb('current_identity')}</p>
                        <p dir="ltr" className="font-mono text-sm font-semibold text-status-secondary tracking-[0.08em] uppercase">{currentBarcode}</p>
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
                <div className="w-10 h-10 rounded-md bg-tertiary-container/10 flex items-center justify-center">
                  <Cpu className="w-5 h-5 text-tertiary" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold tracking-tight text-foreground uppercase">{tc('quick_tips')}</h3>
                  <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-[0.08em] mt-0.5">{tc('hardware_usage')}</p>
                </div>
              </div>
              
              <ul className="space-y-4">
                <li className="text-[11px] text-muted-foreground/80 leading-relaxed font-medium flex gap-3">
                  <span className="text-status-active/60 font-semibold">/</span>
                  <span>{tb('tip_1')}</span>
                </li>
                <li className="text-[11px] text-muted-foreground/80 leading-relaxed font-medium flex gap-3">
                  <span className="text-status-active/60 font-semibold">/</span>
                  <span>{tb('tip_2')}</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </MasterDataFormLayout>
  );
}
