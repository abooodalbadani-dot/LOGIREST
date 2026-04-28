'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } =
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
          <Card className="bg-surface-container-low border-none rounded-sm overflow-hidden">
            <CardContent className="p-8 space-y-8">
              <div className="flex items-center gap-3 pb-4 border-b border-surface-variant/10">
                <div className="w-10 h-10 rounded-sm bg-cyan-500/10 flex items-center justify-center">
                  <LinkIcon className="w-5 h-5 text-cyan-500" />
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-tight text-foreground uppercase">{tb('mapping_section')}</h3>
                  <p className="text-[10px] font-bold text-muted-foreground/60/40 uppercase tracking-widest mt-0.5">{tb('mapping_description')}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <Label htmlFor="bc-item" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">
                    {tb('item')}
                  </Label>
                  <select 
                    id="bc-item" 
                    {...register('item_id')}
                    className="h-12 px-4 bg-surface-container-highest/30 border-none rounded-sm w-full text-xs font-bold uppercase tracking-widest appearance-none hover:bg-surface-container-highest/50 transition-all outline-none focus-visible:ring-1 focus-visible:ring-cyan-500/50"
                  >
                    <option value="" className="bg-surface-container-low text-muted-foreground/60">—</option>
                    {items?.data?.map((i) => (
                      <option key={i.id} value={i.id} className="bg-surface-container-low font-bold text-xs uppercase tracking-widest">
                        {i.code} — {i.name_en}
                      </option>
                    ))}
                  </select>
                  {errors.item_id && <p className="text-[10px] font-bold text-rose-400 uppercase tracking-tight">{errors.item_id.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bc-qty" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">
                    {tb('default_qty')}
                  </Label>
                  <div className="relative group">
                    <Hash className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40 group-focus-within:text-cyan-400 transition-colors" />
                    <Input 
                      id="bc-qty" 
                      type="number" 
                      dir="ltr" 
                      min={1}
                      {...register('default_qty', { valueAsNumber: true })} 
                      className="h-12 ps-10 bg-surface-container-highest/30 border-none rounded-sm font-mono font-bold text-xs focus:ring-1 focus:ring-cyan-500/50"
                    />
                  </div>
                  {errors.default_qty && <p className="text-[10px] font-bold text-rose-400 uppercase tracking-tight">{errors.default_qty.message}</p>}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-surface-container-low border-none rounded-sm overflow-hidden">
            <CardContent className="p-8 space-y-8">
              <div className="flex items-center gap-3 pb-4 border-b border-surface-variant/10">
                <div className="w-10 h-10 rounded-sm bg-amber-500/10 flex items-center justify-center">
                  <BarcodeIcon className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-tight text-foreground uppercase">{tb('hardware_integration')}</h3>
                  <p className="text-[10px] font-bold text-muted-foreground/60/40 uppercase tracking-widest mt-0.5">{tb('scan_description')}</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="bc-val" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">
                    {tb('barcode_label')}
                  </Label>
                  <ScanInput
                    onScan={(val) => setValue('barcode', val, { shouldValidate: true })}
                    placeholder={tb('scan_or_type')}
                    className="h-12 bg-surface-container-highest/30 border-none rounded-sm focus-visible:ring-1 focus-visible:ring-amber-500/50 transition-all font-mono font-bold text-xs"
                  />
                  <input type="hidden" {...register('barcode')} />
                  {errors.barcode && <p className="text-[10px] font-bold text-rose-400 uppercase tracking-tight">{errors.barcode.message}</p>}
                </div>

                {currentBarcode && (
                  <div className="p-4 bg-surface-container-highest/20 rounded-sm border border-amber-500/10 flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <BarcodeIcon className="w-5 h-5 text-amber-400/50" />
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">{tb('current_identity')}</p>
                        <p dir="ltr" className="font-mono text-sm font-black text-amber-400 tracking-[0.2em] uppercase">{currentBarcode}</p>
                      </div>
                    </div>
                    <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
          <Card className="bg-surface-container-low border-none rounded-sm overflow-hidden">
            <CardContent className="p-8 space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-surface-variant/10">
                <div className="w-10 h-10 rounded-sm bg-cyan-500/10 flex items-center justify-center">
                  <Cpu className="w-5 h-5 text-cyan-500" />
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-tight text-foreground uppercase">{tc('quick_tips')}</h3>
                  <p className="text-[10px] font-bold text-muted-foreground/60/40 uppercase tracking-widest mt-0.5">{tc('hardware_usage')}</p>
                </div>
              </div>
              
              <ul className="space-y-4">
                <li className="text-[11px] text-muted-foreground/80 leading-relaxed font-medium flex gap-3">
                  <span className="text-cyan-400/60 font-black">/</span>
                  <span>{tb('tip_1')}</span>
                </li>
                <li className="text-[11px] text-muted-foreground/80 leading-relaxed font-medium flex gap-3">
                  <span className="text-cyan-400/60 font-black">/</span>
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
