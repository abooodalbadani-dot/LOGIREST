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
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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

  const breadcrumbs = [
    { label: tc('title'), href: `/${locale}/master-data` },
    { label: tb('title'), href: `/${locale}/master-data/barcodes` },
    { label: id ? editTitle : createTitle, href: '#' }
  ];

  return (
    <div className="p-8 max-w-[1200px] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <Breadcrumb items={breadcrumbs} />

      <MasterDataFormLayout 
        title={id ? editTitle : createTitle} 
        backHref={`/${locale}/master-data/barcodes`}
        isSaving={create.isPending || update.isPending} 
        onSubmit={onSubmit}
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Configuration */}
          <div className="lg:col-span-8 space-y-6">
            <Card className="bg-surface-container-low border-none rounded-sm overflow-hidden border-l-2 border-l-cyan-500/50">
              <CardHeader>
                <div className="flex items-center gap-2 mb-1">
                  <LinkIcon className="w-3.5 h-3.5 text-cyan-400" />
                  <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400">
                    {tb('mapping_section')}
                  </CardTitle>
                </div>
                <CardDescription className="text-xs text-muted-foreground/60 italic font-medium">
                  {tb('mapping_description')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-2">
                  <Label htmlFor="bc-item" className="text-[10px] font-black uppercase tracking-widest opacity-70">
                    {tb('item')}
                  </Label>
                  <select 
                    id="bc-item" 
                    {...register('item_id')}
                    className="h-11 px-4 bg-surface-container-highest/30 border-none rounded-sm w-full text-xs font-bold focus:ring-1 focus:ring-cyan-500/50 transition-all appearance-none"
                  >
                    <option value="">—</option>
                    {items?.data?.map((i) => (
                      <option key={i.id} value={i.id}>{i.code} — {i.name_en}</option>
                    ))}
                  </select>
                  {errors.item_id && <p className="text-[10px] font-bold text-red-400 uppercase tracking-tight">{errors.item_id.message}</p>}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="bc-qty" className="text-[10px] font-black uppercase tracking-widest opacity-70">
                    {tb('default_qty')}
                  </Label>
                  <div className="relative group">
                    <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40 group-focus-within:text-cyan-400 transition-colors" />
                    <Input 
                      id="bc-qty" 
                      type="number" 
                      dir="ltr" 
                      min={1}
                      {...register('default_qty', { valueAsNumber: true })} 
                      className="h-11 pl-10 bg-surface-container-highest/30 border-none rounded-sm font-mono font-bold text-xs focus:ring-1 focus:ring-cyan-500/50"
                    />
                  </div>
                  {errors.default_qty && <p className="text-[10px] font-bold text-red-400 uppercase tracking-tight">{errors.default_qty.message}</p>}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-surface-container-low border-none rounded-sm overflow-hidden border-l-2 border-l-amber-500/50">
              <CardHeader>
                <div className="flex items-center gap-2 mb-1">
                  <Cpu className="w-3.5 h-3.5 text-amber-400" />
                  <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-400">
                    {tb('hardware_integration')}
                  </CardTitle>
                </div>
                <CardDescription className="text-xs text-muted-foreground/60 italic font-medium">
                  {tb('scan_description')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-2">
                  <Label htmlFor="bc-val" className="text-[10px] font-black uppercase tracking-widest opacity-70">
                    {tb('barcode_label')}
                  </Label>
                  <ScanInput
                    onScan={(val) => setValue('barcode', val, { shouldValidate: true })}
                    placeholder={tb('scan_or_type')}
                  />
                  <input type="hidden" {...register('barcode')} />
                  {errors.barcode && <p className="text-[10px] font-bold text-red-400 uppercase tracking-tight">{errors.barcode.message}</p>}
                </div>

                {currentBarcode && (
                  <div className="p-4 bg-surface-container-highest/30 rounded-sm border border-amber-500/10 flex items-center justify-between group">
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
              </CardContent>
            </Card>
          </div>

          {/* Contextual Sidebar */}
          <div className="lg:col-span-4 space-y-6">
            <div className="p-6 bg-surface-container-low rounded-sm border-t-2 border-t-cyan-500/50 space-y-4">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400">{tc('quick_tips')}</h4>
              <ul className="space-y-3">
                <li className="text-[11px] text-muted-foreground/80 leading-relaxed font-medium">
                  <span className="text-cyan-400/60 mr-2">/</span>
                  {tb('tip_1')}
                </li>
                <li className="text-[11px] text-muted-foreground/80 leading-relaxed font-medium">
                  <span className="text-cyan-400/60 mr-2">/</span>
                  {tb('tip_2')}
                </li>
              </ul>
            </div>
          </div>
        </div>
      </MasterDataFormLayout>
    </div>
  );
}
