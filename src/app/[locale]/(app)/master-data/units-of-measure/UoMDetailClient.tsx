'use client';

import { Ruler, Activity, Clock, Hash } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { format } from 'date-fns';

import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { MasterDataDetailLayout } from '@/features/master-data/components/MasterDataDetailLayout';
import { useUoM } from '@/features/uoms/hooks/useUoMs';
import { cn } from '@/lib/utils';

interface Props {
  id: string;
  locale: string;
}

export function UoMDetailClient({ id, locale }: Props) {
  const tc = useTranslations('master_data.common');
  const t = useTranslations('master_data.uoms');
  const { data, isLoading } = useUoM(id);

  if (isLoading) return null;
  if (!data) return <div>UoM not found</div>;

  return (
    <MasterDataDetailLayout
      title={data.name_en}
      backHref={`/${locale}/master-data/units-of-measure`}
      editHref={`/${locale}/master-data/units-of-measure/${id}/edit`}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Card className="bg-surface-container-low border-none overflow-hidden">
            <CardContent className="p-8 space-y-8">
              <div className="flex items-center gap-3 pb-4 border-b border-surface-variant/10">
                <div className="w-10 h-10 rounded-md bg-tertiary-container/10 flex items-center justify-center">
                  <Ruler className="w-5 h-5 text-tertiary" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold tracking-[0.08em] rtl:tracking-normal text-foreground uppercase">{tc('basic_info')}</h3>
                  <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-[0.08em] rtl:tracking-normal mt-0.5">{t('description')}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.08em] rtl:tracking-normal text-muted-foreground/50">{t('fields.code')}</p>
                    <div className="flex items-center gap-2">
                      <Hash className="w-3.5 h-3.5 text-status-active/40" />
                      <p className="font-mono text-lg font-bold tracking-wider text-status-active dir-ltr">{data.code}</p>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.08em] rtl:tracking-normal text-muted-foreground/50">{t('fields.name_en')}</p>
                    <p className="text-sm font-semibold text-foreground dir-ltr">{data.name_en}</p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[10px] font-semibold uppercase tracking-normal text-muted-foreground/50 text-end">{t('fields.name_ar')}</p>
                    <p className="text-sm font-semibold text-foreground text-end dir-rtl">{data.name_ar}</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="p-6 bg-surface-container-highest/20 rounded-lg border border-surface-variant/10 space-y-4">
                    <div className="flex items-center gap-2 text-muted-foreground/60">
                      <Clock className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-semibold uppercase tracking-wider">{tc('metadata')}</span>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-medium text-muted-foreground/40 uppercase">{tc('created_at')}</span>
                        <span className="text-[10px] font-mono font-bold text-muted-foreground/70 dir-ltr">
                          {data.created_at ? format(new Date(data.created_at), 'yyyy-MM-dd HH:mm') : '-'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-medium text-muted-foreground/40 uppercase">{tc('id')}</span>
                        <span className="text-[10px] font-mono font-bold text-muted-foreground/30 dir-ltr">{data.id.slice(0, 8)}...</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
          <Card className="bg-surface-container-low border-none overflow-hidden">
            <CardContent className="p-8 space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-surface-variant/10">
                <div className="w-10 h-10 rounded-md bg-status-active/10 flex items-center justify-center">
                  <Activity className="w-5 h-5 text-status-active" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold tracking-[0.08em] rtl:tracking-normal text-foreground uppercase">{tc('status')}</h3>
                  <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-[0.08em] rtl:tracking-normal mt-0.5">{tc('system_state')}</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-surface-container-highest/20 rounded-md border border-surface-variant/10">
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.08em] rtl:tracking-normal text-muted-foreground/50">{tc('current_status')}</p>
                  <StatusBadge 
                    status={data.is_active ? 'ACTIVE' : 'INACTIVE'} 
                    className="h-5 px-3 text-[9px]"
                  />
                </div>
              </div>

              <div className="p-4 bg-status-active/5 rounded-md border border-status-active/10 border-dashed">
                <h3 className="text-[10px] font-semibold uppercase tracking-[0.08em] rtl:tracking-normal text-status-active mb-1">{t('precision')}</h3>
                <p className="text-[10px] text-muted-foreground/60 uppercase tracking-[0.08em] rtl:tracking-normal font-medium leading-relaxed">
                  {t('precision_description')}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MasterDataDetailLayout>
  );
}
