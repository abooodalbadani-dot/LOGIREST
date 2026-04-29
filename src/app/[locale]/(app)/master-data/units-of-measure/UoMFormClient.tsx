'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Ruler, Hash, Globe2, Activity } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { MasterDataFormLayout } from '@/features/master-data/components/MasterDataFormLayout';
import {
  useMasterDataItem,
  useMasterDataCreate,
  useMasterDataUpdate,
} from '@/features/master-data/hooks/useMasterDataCRUD';
import { UoMSchema, UoMFormSchema, type UoMFormValues } from '@/types/master-data';

interface Props {
  id: string | null;
  createTitle: string;
  editTitle: string;
  locale: string;
}

export function UoMFormClient({ id, createTitle, editTitle, locale }: Props) {
  const tc = useTranslations('masterData.common');
  const tu = useTranslations('masterData.uom');
  const router = useRouter();

  const { data } = useMasterDataItem('units-of-measure', id, UoMSchema);
  const create = useMasterDataCreate('units-of-measure', UoMSchema);
  const update = useMasterDataUpdate('units-of-measure', UoMSchema);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<UoMFormValues>({
    resolver: zodResolver(UoMFormSchema),
    defaultValues: { code: '', name_ar: '', name_en: '' },
  });

  useEffect(() => {
    if (data) {
      reset({ code: data.code, name_ar: data.name_ar, name_en: data.name_en });
    }
  }, [data, reset]);

  const onSubmit = handleSubmit(async (values) => {
    if (id) {
      await update.mutateAsync({ id, body: values });
    } else {
      await create.mutateAsync(values);
    }
    router.push(`/${locale}/master-data/units-of-measure`);
  });

  const isSaving = create.isPending || update.isPending;

  return (
    <MasterDataFormLayout
      title={id ? editTitle : createTitle}
      backHref={`/${locale}/master-data/units-of-measure`}
      isSaving={isSaving}
      onSubmit={onSubmit}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          <Card className="bg-surface-container-low border-none overflow-hidden">
            <CardContent className="p-8 space-y-8">
            <div className="flex items-center gap-3 pb-4 border-b border-surface-variant/10">
              <div className="w-10 h-10 rounded-md bg-tertiary-container/10 flex items-center justify-center">
                <Ruler className="w-5 h-5 text-tertiary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold tracking-[0.08em] rtl:tracking-normal text-foreground uppercase">{tc('basic_info')}</h3>
                <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-[0.08em] rtl:tracking-normal mt-0.5">{tu('description') || tc('details_desc')}</p>
              </div>
            </div>

              {/* Code */}
              <div className="space-y-2 max-w-sm">
                <Label htmlFor="uom-code" className="text-[10px] font-semibold uppercase tracking-[0.08em] rtl:tracking-normal text-muted-foreground/70">{tc('code')}</Label>
                <Input 
                  id="uom-code" 
                  dir="ltr" 
                  {...register('code')} 
                  className="font-mono font-semibold uppercase tracking-[0.08em] text-status-active" 
                  placeholder="UNIT-01" 
                />
                {errors.code && <p className="text-[10px] font-semibold text-status-error uppercase tracking-tight">{errors.code.message}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Name EN */}
                <div className="space-y-2">
                  <Label htmlFor="uom-name-en" className="text-[10px] font-semibold uppercase tracking-[0.08em] rtl:tracking-normal text-muted-foreground/70">{tc('name_en')}</Label>
                  <Input 
                    id="uom-name-en" 
                    dir="ltr" 
                    {...register('name_en')} 
                    className="font-semibold" 
                    placeholder="Unit Name" 
                  />
                  {errors.name_en && <p className="text-[10px] font-semibold text-status-error uppercase tracking-tight">{errors.name_en.message}</p>}
                </div>

                {/* Name AR */}
                <div className="space-y-2">
                  <Label htmlFor="uom-name-ar" className="text-[10px] font-semibold uppercase tracking-normal text-muted-foreground/70">{tc('name_ar')}</Label>
                  <Input 
                    id="uom-name-ar" 
                    dir="rtl" 
                    {...register('name_ar')} 
                    className="font-semibold text-end" 
                    placeholder="اسم الوحدة" 
                  />
                  {errors.name_ar && <p className="text-[10px] font-semibold text-status-error uppercase tracking-tight">{errors.name_ar.message}</p>}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-8">
          <Card className="bg-surface-container-low border-none overflow-hidden">
            <CardContent className="p-8 space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-surface-variant/10">
                <div className="w-10 h-10 rounded-md bg-status-active/10 flex items-center justify-center">
                  <Activity className="w-5 h-5 text-status-active" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold tracking-[0.08em] rtl:tracking-normal text-foreground uppercase">{tu('precision') || tc('details')}</h3>
                  <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-[0.08em] rtl:tracking-normal mt-0.5">{tc('status')}</p>
                </div>
              </div>

              <div className="p-4 bg-status-active/5 rounded-md border border-status-active/10 border-dashed">
                <h3 className="text-[10px] font-semibold uppercase tracking-[0.08em] rtl:tracking-normal text-status-active mb-1">{tc('precision')}</h3>
                <p className="text-[10px] text-muted-foreground/60 uppercase tracking-[0.08em] rtl:tracking-normal font-medium leading-relaxed">
                  {tu('precision_description')}
                </p>
              </div>

              <div className="flex items-center justify-between p-4 bg-surface-container-highest/20 rounded-md border border-surface-variant/10">
                <div className="space-y-1">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.08em] rtl:tracking-normal text-muted-foreground/50">{tc('status')}</span>
                  <p className="text-[9px] text-status-active font-semibold uppercase">{tc('active')}</p>
                </div>
                <div className="h-2 w-2 rounded-full bg-status-active shadow-[0_0_8px_rgba(var(--operational-cyan-rgb),0.5)]" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MasterDataFormLayout>
  );
}
