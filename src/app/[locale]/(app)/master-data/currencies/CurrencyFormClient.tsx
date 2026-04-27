'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { MasterDataFormLayout } from '@/features/master-data/components/MasterDataFormLayout';
import { useMasterDataItem, useMasterDataCreate, useMasterDataUpdate } from '@/features/master-data/hooks/useMasterDataCRUD';
import { CurrencySchema, CurrencyFormSchema, type CurrencyFormValues } from '@/types/master-data';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { Card, CardContent } from '@/components/ui/card';
import { Coins, Star } from 'lucide-react';

interface Props { id: string | null; createTitle: string; editTitle: string; locale: string; }

export function CurrencyFormClient({ id, createTitle, editTitle, locale }: Props) {
  const tc = useTranslations('masterData.common');
  const t = useTranslations('masterData.currencies');
  const router = useRouter();

  const { data } = useMasterDataItem('currencies', id, CurrencySchema);
  const create = useMasterDataCreate('currencies', CurrencySchema);
  const update = useMasterDataUpdate('currencies', CurrencySchema);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<CurrencyFormValues>({
    resolver: zodResolver(CurrencyFormSchema),
    defaultValues: {
      code: '',
      symbol: '',
      name_ar: '',
      name_en: '',
      is_base: false,
    },
  });

  const isBase = watch('is_base');

  useEffect(() => {
    if (data) {
      reset({
        code: data.code,
        symbol: data.symbol,
        name_ar: data.name_ar,
        name_en: data.name_en,
        is_base: data.is_base,
      });
    }
  }, [data, reset]);

  const onSubmit = handleSubmit(async (values) => {
    if (id) await update.mutateAsync({ id, body: values });
    else await create.mutateAsync(values);
    router.push(`/${locale}/master-data/currencies`);
  });

  const breadcrumbs = [
    { label: tc('title'), href: `/${locale}/master-data` },
    { label: tc('currencies'), href: `/${locale}/master-data/currencies` },
    { label: id ? editTitle : createTitle, href: '#' }
  ];

  return (
    <div className="space-y-6">
      <Breadcrumb items={breadcrumbs} />
      
      <MasterDataFormLayout 
        title={id ? editTitle : createTitle} 
        backHref={`/${locale}/master-data/currencies`}
        isSaving={create.isPending || update.isPending} 
        onSubmit={onSubmit}
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <Card className="bg-surface-container-low border-none rounded-sm overflow-hidden">
              <CardContent className="p-6 space-y-8">
                <div className="flex items-center gap-3 pb-4 border-b border-white/5">
                  <div className="w-10 h-10 rounded-sm bg-cyan-500/10 flex items-center justify-center">
                    <Coins className="w-5 h-5 text-cyan-500" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold tracking-tight">{tc('basic_info')}</h3>
                    <p className="text-[10px] text-muted-foreground/60 uppercase tracking-widest font-medium">Currency identification and naming</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <Label htmlFor="curr-code" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">
                      {tc('code')}
                    </Label>
                    <Input 
                      id="curr-code" 
                      dir="ltr" 
                      {...register('code')} 
                      className="bg-surface-container-highest/30 border-none h-12 text-sm font-mono font-bold focus-visible:ring-1 focus-visible:ring-cyan-500/50 uppercase tracking-widest"
                      placeholder="e.g. USD"
                    />
                    {errors.code && <p className="text-[10px] font-bold text-rose-400 uppercase tracking-tight">{errors.code.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="curr-symbol" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">
                      {t('symbol')}
                    </Label>
                    <Input 
                      id="curr-symbol" 
                      dir="ltr" 
                      {...register('symbol')} 
                      className="bg-surface-container-highest/30 border-none h-12 text-sm font-mono font-bold focus-visible:ring-1 focus-visible:ring-cyan-500/50"
                      placeholder="e.g. $"
                    />
                    {errors.symbol && <p className="text-[10px] font-bold text-rose-400 uppercase tracking-tight">{errors.symbol.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="curr-name-en" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">
                      {tc('name_en')}
                    </Label>
                    <Input 
                      id="curr-name-en" 
                      dir="ltr" 
                      {...register('name_en')} 
                      className="bg-surface-container-highest/30 border-none h-12 text-sm font-bold focus-visible:ring-1 focus-visible:ring-cyan-500/50"
                      placeholder="e.g. US Dollar"
                    />
                    {errors.name_en && <p className="text-[10px] font-bold text-rose-400 uppercase tracking-tight">{errors.name_en.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="curr-name-ar" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">
                      {tc('name_ar')}
                    </Label>
                    <Input 
                      id="curr-name-ar" 
                      dir="rtl" 
                      {...register('name_ar')} 
                      className="bg-surface-container-highest/30 border-none h-12 text-sm font-bold focus-visible:ring-1 focus-visible:ring-cyan-500/50 text-right"
                      placeholder="مثال: دولار أمريكي"
                    />
                    {errors.name_ar && <p className="text-[10px] font-bold text-rose-400 uppercase tracking-tight">{errors.name_ar.message}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-8">
            <Card className="bg-surface-container-low border-none rounded-sm overflow-hidden">
              <CardContent className="p-6 space-y-6">
                <div className="space-y-1">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500">{t('base_currency') || 'Base Currency'}</h4>
                  <p className="text-[11px] text-muted-foreground/60 leading-relaxed">The system uses the base currency for all internal calculations and reporting.</p>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-surface-container-highest/30 rounded-sm border border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-sm bg-amber-500/10 flex items-center justify-center">
                      <Star className={`w-4 h-4 ${isBase ? 'fill-amber-500 text-amber-500' : 'text-amber-500/40'}`} />
                    </div>
                    <div className="space-y-0.5">
                      <Label className="text-xs font-bold">{t('is_base')}</Label>
                      <p className="text-[10px] text-muted-foreground/50 uppercase tracking-tight">{isBase ? t('base_active') : t('base_inactive')}</p>
                    </div>
                  </div>
                  <Switch checked={isBase} onCheckedChange={(val) => setValue('is_base', val)} />
                </div>
                
                {isBase && (
                  <div className="p-3 bg-amber-500/5 border border-amber-500/10 rounded-sm">
                    <p className="text-[9px] text-amber-500/70 font-bold uppercase tracking-tight leading-relaxed">
                      Warning: Setting this as base currency will affect all exchange rate calculations.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </MasterDataFormLayout>
    </div>
  );
}
