'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { useNotificationTemplate } from '@/features/notifications/hooks/useNotificationTemplates';
import { apiClient } from '@/lib/api/client';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/PageHeader';
import { useMutation, useQueryClient } from '@tanstack/react-query';

const TemplateUpdateSchema = z.object({
  id: z.string(),
  code: z.string(),
  subject_ar: z.string(),
  subject_en: z.string(),
  body_ar: z.string(),
  body_en: z.string(),
  trigger_event: z.string(),
  is_active: z.boolean(),
});

interface Props {
  id: string;
  title: string;
  locale: string;
}

export function TemplateEditorClient({ id, title, locale }: Props) {
  const t = useTranslations('notifications');
  const router = useRouter();
  const qc = useQueryClient();
  const { data, isLoading } = useNotificationTemplate(id);
  const [previewLang, setPreviewLang] = useState<'ar' | 'en'>('ar');

  const { register, handleSubmit, reset, watch } = useForm({
    defaultValues: {
      subject_ar: '',
      subject_en: '',
      body_ar: '',
      body_en: '',
    },
  });

  useEffect(() => {
    if (data) {
      reset({
        subject_ar: data.subject_ar,
        subject_en: data.subject_en,
        body_ar: data.body_ar,
        body_en: data.body_en,
      });
    }
  }, [data, reset]);

  const updateMutation = useMutation({
    mutationFn: (body: unknown) => apiClient.put(`/notifications/templates/${id}`, TemplateUpdateSchema, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications/templates'] });
      router.push(`/${locale}/communications/notifications/templates`);
    },
  });

  const onSubmit = handleSubmit((values) => {
    updateMutation.mutate({ ...data, ...values });
  });

  if (isLoading) {
    return <div className="flex items-center justify-center h-48"><div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  // eslint-disable-next-line react-hooks/incompatible-library
  const subject = previewLang === 'ar' ? watch('subject_ar') : watch('subject_en');
  // eslint-disable-next-line react-hooks/incompatible-library
  const body = previewLang === 'ar' ? watch('body_ar') : watch('body_en');

  return (
    <div className="space-y-6">
      <PageHeader title={`${title} - ${data?.code ?? id}`} />

      <form onSubmit={onSubmit} className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Arabic Template Section */}
          <div className="space-y-4 p-6 rounded-xl border border-white/5 bg-surface-1/50 backdrop-blur-sm relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent opacity-0 group-focus-within:opacity-100 transition-opacity" />
            <div className="flex items-center gap-2 mb-2 text-cyan-500/70 font-semibold text-xs uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)]" />
              العربية (RTL)
            </div>

            <div className="grid gap-2">
              <Label htmlFor="subject-ar" className="text-on-surface-muted text-xs">{t('subject_ar')}</Label>
              <Textarea
                id="subject-ar"
                dir="rtl"
                {...register('subject_ar')}
                className="min-h-[60px] bg-surface-0 border-white/5 focus-visible:ring-cyan-500 focus-visible:border-cyan-500 transition-all duration-300"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="body-ar" className="text-on-surface-muted text-xs">{t('body_ar')}</Label>
              <Textarea
                id="body-ar"
                dir="rtl"
                {...register('body_ar')}
                className="min-h-[200px] bg-surface-0 border-white/5 focus-visible:ring-cyan-500 focus-visible:border-cyan-500 transition-all duration-300 leading-relaxed"
              />
            </div>
          </div>

          {/* English Template Section */}
          <div className="space-y-4 p-6 rounded-xl border border-white/5 bg-surface-1/50 backdrop-blur-sm relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent opacity-0 group-focus-within:opacity-100 transition-opacity" />
            <div className="flex items-center gap-2 mb-2 text-cyan-500/70 font-semibold text-xs uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)]" />
              English (LTR)
            </div>

            <div className="grid gap-2">
              <Label htmlFor="subject-en" className="text-on-surface-muted text-xs">{t('subject_en')}</Label>
              <Input
                id="subject-en"
                dir="ltr"
                {...register('subject_en')}
                className="h-10 bg-surface-0 border-white/5 focus-visible:ring-cyan-500 focus-visible:border-cyan-500 transition-all duration-300"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="body-en" className="text-on-surface-muted text-xs">{t('body_en')}</Label>
              <Textarea
                id="body-en"
                dir="ltr"
                {...register('body_en')}
                className="min-h-[200px] bg-surface-0 border-white/5 focus-visible:ring-cyan-500 focus-visible:border-cyan-500 transition-all duration-300 leading-relaxed"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-white/5">
          <div className="flex gap-4">
            <Button
              type="submit"
              disabled={updateMutation.isPending}
              className="bg-cyan-500 text-surface-0 hover:bg-cyan-500/90 min-w-[120px] font-semibold"
            >
              {updateMutation.isPending ? '...' : t('subject_ar').includes('عربي') ? 'حفظ التغييرات' : 'Save Changes'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`/${locale}/communications/notifications/templates`)}
              className="border-white/10 hover:bg-white/5"
            >
              {t('retry') === 'إعادة المحاولة' ? 'إلغاء' : 'Cancel'}
            </Button>
          </div>

          <div className="flex items-center gap-2 text-xs text-on-surface-muted">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
            {t('code')}: <span className="font-mono">{data?.code}</span>
          </div>
        </div>
      </form>

      {/* Modernized Preview Section */}
      <div className="p-1 rounded-2xl bg-gradient-to-b from-white/10 to-transparent">
        <div className="rounded-[15px] border border-white/5 bg-surface-1 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-surface-2/50">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-on-surface">{t('preview')}</span>
              <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-500 text-[10px] font-bold uppercase">Live View</span>
            </div>
            <div className="flex bg-surface-0 rounded-lg p-1 border border-white/5">
              <button
                type="button"
                className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${previewLang === 'ar' ? 'bg-cyan-500 text-surface-0 shadow-[0_0_12px_rgba(6,182,212,0.3)]' : 'text-on-surface-muted hover:text-on-surface'}`}
                onClick={() => setPreviewLang('ar')}
              >
                Arabic
              </button>
              <button
                type="button"
                className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${previewLang === 'en' ? 'bg-cyan-500 text-surface-0 shadow-[0_0_12px_rgba(6,182,212,0.3)]' : 'text-on-surface-muted hover:text-on-surface'}`}
                onClick={() => setPreviewLang('en')}
              >
                English
              </button>
            </div>
          </div>

          <div className="p-8 min-h-[300px] flex flex-col items-center bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]">
            <div
              className="w-full max-w-2xl bg-surface-0 border border-white/5 rounded-xl shadow-2xl p-8 space-y-6"
              dir={previewLang === 'ar' ? 'rtl' : 'ltr'}
            >
              <div className="pb-4 border-b border-white/5">
                <span className="text-[10px] text-on-surface-muted uppercase tracking-widest mb-1 block">Subject</span>
                <p className="text-xl font-bold text-on-surface">{subject || '...'}</p>
              </div>
              <div>
                <span className="text-[10px] text-on-surface-muted uppercase tracking-widest mb-2 block">Message Body</span>
                <p className="text-on-surface-muted whitespace-pre-wrap leading-relaxed text-sm">
                  {body || 'Start typing to see preview...'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

}