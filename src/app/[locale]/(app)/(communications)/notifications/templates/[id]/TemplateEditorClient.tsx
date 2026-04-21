'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { useNotificationTemplate } from '@/features/notifications/hooks/useNotificationTemplates';
import { apiClient } from '@/lib/api/client';
import { z } from 'zod';
import { paginatedSchema } from '@/types/api';
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
}

export function TemplateEditorClient({ id, title }: Props) {
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
      router.push('../templates');
    },
  });

  const onSubmit = handleSubmit((values) => {
    updateMutation.mutate({ ...data, ...values });
  });

  if (isLoading) {
    return <div className="flex items-center justify-center h-48"><div className="w-8 h-8 border-4 border-neon-cyan border-t-transparent rounded-full animate-spin" /></div>;
  }

  const subject = previewLang === 'ar' ? watch('subject_ar') : watch('subject_en');
  const body = previewLang === 'ar' ? watch('body_ar') : watch('body_en');

  return (
    <div className="space-y-6">
      <PageHeader title={`${title} - ${data?.code ?? id}`} />

      <form onSubmit={onSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="grid gap-2">
            <Label htmlFor="subject-ar">{t('subject_ar')}</Label>
            <Textarea id="subject-ar" dir="rtl" {...register('subject_ar')} className="min-h-[60px]" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="subject-en">{t('subject_en')}</Label>
            <Input id="subject-en" dir="ltr" {...register('subject_en')} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="grid gap-2">
            <Label htmlFor="body-ar">{t('body_ar')}</Label>
            <Textarea id="body-ar" dir="rtl" {...register('body_ar')} className="min-h-[120px]" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="body-en">{t('body_en')}</Label>
            <Textarea id="body-en" dir="ltr" {...register('body_en')} className="min-h-[120px]" />
          </div>
        </div>

        <div className="flex gap-2">
          <Button type="submit" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? '...' : t('subject_ar').includes('عربي') ? 'حفظ' : 'Save'}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push('../templates')}>
            {t('retry') === 'إعادة المحاولة' ? 'إلغاء' : 'Cancel'}
          </Button>
        </div>
      </form>

      <div className="border border-surface-3 rounded bg-surface-1 p-4 space-y-3">
        <div className="flex gap-2">
          <button
            type="button"
            className={`px-3 py-1 rounded text-sm ${previewLang === 'ar' ? 'bg-neon-cyan text-surface-0' : 'bg-surface-3 text-on-surface-muted'}`}
            onClick={() => setPreviewLang('ar')}
          >
            Preview AR
          </button>
          <button
            type="button"
            className={`px-3 py-1 rounded text-sm ${previewLang === 'en' ? 'bg-neon-cyan text-surface-0' : 'bg-surface-3 text-on-surface-muted'}`}
            onClick={() => setPreviewLang('en')}
          >
            Preview EN
          </button>
        </div>
        <div className="border border-surface-3 rounded bg-surface-0 p-4" dir={previewLang === 'ar' ? 'rtl' : 'ltr'}>
          <p className="font-semibold mb-2">{subject}</p>
          <p className="whitespace-pre-wrap text-sm">{body}</p>
        </div>
      </div>
    </div>
  );
}