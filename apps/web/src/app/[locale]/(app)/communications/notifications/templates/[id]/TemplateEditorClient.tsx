'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useForm, useWatch } from 'react-hook-form';
import { useUnsavedChangesGuard } from '@/lib/unsaved-changes/useUnsavedChangesGuard';
import { useNotificationTemplate } from '@/features/notifications/hooks/useNotificationTemplates';
import { apiClient } from '@/lib/api/client';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/PageHeader';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { PermissionGate } from '@/components/shared/PermissionGate';

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
  const qc = useQueryClient();
  const { register, handleSubmit, reset, control, formState: { isDirty } } = useForm({
    defaultValues: {
      subject_ar: '',
      subject_en: '',
      body_ar: '',
      body_en: '',
    },
  });

  const { router: guardedRouter } = useUnsavedChangesGuard(isDirty);
  const { data, isLoading } = useNotificationTemplate(id);
  const [previewLang, setPreviewLang] = useState<'ar' | 'en'>('ar');

  const [subjectAr, subjectEn, bodyAr, bodyEn] = useWatch({
    control,
    name: ['subject_ar', 'subject_en', 'body_ar', 'body_en']
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
      guardedRouter.push('/communications/notifications/templates', { skipGuard: true });
    },
  });

 const onSubmit = handleSubmit((values) => {
 updateMutation.mutate({ ...data, ...values });
 });

 if (isLoading) {
 return <div className="flex items-center justify-center h-48"><div className="w-8 h-8 border-4 border-operational-cyan border-t-transparent rounded-full animate-spin" /></div>;
 }

 const subject = previewLang === 'ar' ? subjectAr : subjectEn;
 const body = previewLang === 'ar' ? bodyAr : bodyEn;

 return (
 <div className="space-y-6">
 <PageHeader title={`${title} - ${data?.code ?? id}`} />

 <form onSubmit={onSubmit} className="space-y-8">
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
 {/* Arabic Template Section */}
 <div className="space-y-4 p-6 rounded-xl border border-border-muted/30 bg-surface-container-low/50 backdrop-blur-sm relative overflow-hidden group">
 <div className="absolute top-0 start-0 w-full h-[1px] bg-gradient-to-r from-transparent via-operational-cyan/30 to-transparent opacity-0 group-focus-within:opacity-100 transition-opacity" />
 <div className="flex items-center gap-2 mb-2 text-operational-cyan/70 font-semibold text-label-sm uppercase">
 <span className="w-2 h-2 rounded-full bg-operational-cyan shadow-[0_0_12px_rgba(var(--operational-cyan-rgb),0.3)]" />
 العربية (RTL)
 </div>

 <div className="grid gap-2">
 <Label htmlFor="subject-ar" className="text-muted-foreground/40 text-label-xs uppercase font-bold">{t('subject_ar')}</Label>
 <Textarea
 id="subject-ar"
 dir="rtl"
 {...register('subject_ar')}
 className="min-h-[60px] bg-surface-container-lowest border-border-muted/30 focus-visible:ring-operational-cyan/50 focus-visible:border-operational-cyan/50 transition-all duration-300"
 />
 </div>
 <div className="grid gap-2">
 <Label htmlFor="body-ar" className="text-muted-foreground/40 text-label-xs uppercase font-bold">{t('body_ar')}</Label>
 <Textarea
 id="body-ar"
 dir="rtl"
 {...register('body_ar')}
 className="min-h-[200px] bg-surface-container-lowest border-border-muted/30 focus-visible:ring-operational-cyan/50 focus-visible:border-operational-cyan/50 transition-all duration-300 leading-relaxed"
 />
 </div>
 </div>

 {/* English Template Section */}
 <div className="space-y-4 p-6 rounded-xl border border-border-muted/20 bg-surface-container-low/50 backdrop-blur-sm relative overflow-hidden group">
 <div className="absolute top-0 start-0 w-full h-[1px] bg-gradient-to-r from-transparent via-operational-cyan/40 to-transparent opacity-0 group-focus-within:opacity-100 transition-opacity" />
 <div className="flex items-center gap-2 mb-2 text-operational-cyan/80 font-bold text-label-xs uppercase">
 <span className="w-1.5 h-1.5 rounded-full bg-operational-cyan shadow-[0_0_12px_rgba(var(--operational-cyan-rgb),0.4)] animate-pulse" />
 English (LTR)
 </div>

 <div className="grid gap-2">
 <Label htmlFor="subject-en" className="text-muted-foreground/40 text-label-xs uppercase font-bold">{t('subject_en')}</Label>
 <Input
 id="subject-en"
 dir="ltr"
 {...register('subject_en')}
 className="h-10 bg-surface-container-lowest border-border-muted/30 focus-visible:ring-operational-cyan/50 focus-visible:border-operational-cyan/50 transition-all duration-300"
 />
 </div>
 <div className="grid gap-2">
 <Label htmlFor="body-en" className="text-muted-foreground/40 text-label-xs uppercase font-bold">{t('body_en')}</Label>
 <Textarea
 id="body-en"
 dir="ltr"
 {...register('body_en')}
 className="min-h-[200px] bg-surface-container-lowest border-border-muted/30 focus-visible:ring-operational-cyan/50 focus-visible:border-operational-cyan/50 transition-all duration-300 leading-relaxed"
 />
 </div>
 </div>
 </div>

 <div className="flex items-center justify-between pt-6 border-t border-border-muted/20">
 <div className="flex gap-4">
 <PermissionGate action="edit" resource="email_settings">
 <Button
 type="submit"
 disabled={updateMutation.isPending}
 className="bg-operational-cyan text-white hover:brightness-110 min-w-[140px] h-11 font-bold uppercase text-label-xs shadow-[0_12px_24px_-8px_rgba(var(--operational-cyan-rgb),0.4)] active:scale-[0.98] transition-all"
 >
 {updateMutation.isPending ? '...' : t('subject_ar').includes('عربي') ? 'حفظ التغييرات' : 'Save Changes'}
 </Button>
 </PermissionGate>
    <Button
      type="button"
      variant="ghost"
      onClick={() => guardedRouter.push('/communications/notifications/templates', { skipGuard: true })}
      className="text-muted-foreground hover:text-foreground hover:bg-surface-container-high h-11 px-6 font-bold uppercase text-label-xs"
    >
      {t('retry') === 'إعادة المحاولة' ? 'إلغاء' : 'Cancel'}
    </Button>
 </div>

 <div className="flex items-center gap-3 text-label-xs font-bold uppercase text-muted-foreground/60">
 <span className="w-1.5 h-1.5 rounded-full bg-operational-cyan/50" />
 {t('code')}: <span className="font-mono text-foreground">{data?.code}</span>
 </div>
 </div>
 </form>

 {/* Modernized Preview Section */}
 <div className="p-1 rounded-2xl bg-gradient-to-b from-border-muted/20 to-transparent">
 <div className="rounded-[15px] border border-border-muted/20 bg-surface-container-low overflow-hidden shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)]">
 <div className="flex items-center justify-between px-6 py-4 border-b border-border-muted/20 bg-surface-container/30 backdrop-blur-md">
 <div className="flex items-center gap-3">
 <span className="text-label-xs font-semibold uppercase text-foreground/80">{t('preview')}</span>
 <span className="px-2 py-0.5 rounded bg-operational-cyan/10 text-operational-cyan text-label-xxs font-semibold uppercase border border-operational-cyan/20">Live View</span>
 </div>
 <div className="flex bg-surface-container-lowest/50 rounded-lg p-1 border border-border-muted/20 backdrop-blur-sm">
 <button
 type="button"
 className={`px-5 py-1.5 rounded-md text-label-xs font-semibold uppercase transition-all ${previewLang === 'ar' ? 'bg-operational-cyan text-white shadow-[0_8px_16px_-4px_rgba(var(--operational-cyan-rgb),0.4)]' : 'text-muted-foreground/60 hover:text-foreground hover:bg-surface-container-high'}`}
 onClick={() => setPreviewLang('ar')}
 >
 Arabic
 </button>
 <button
 type="button"
 className={`px-5 py-1.5 rounded-md text-label-xs font-semibold uppercase transition-all ${previewLang === 'en' ? 'bg-operational-cyan text-white shadow-[0_8px_16px_-4px_rgba(var(--operational-cyan-rgb),0.4)]' : 'text-muted-foreground/60 hover:text-foreground hover:bg-surface-container-high'}`}
 onClick={() => setPreviewLang('en')}
 >
 English
 </button>
 </div>
 </div>

 <div className="p-8 min-h-[300px] flex flex-col items-center bg-[url('/grid.svg')] bg-center bg-fixed opacity-90">
 <div
 className="w-full max-w-2xl bg-surface-container-lowest/90 border border-border-muted/20 rounded-xl shadow-[0_40px_80px_-20px_rgba(0,0,0,0.6)] p-10 space-y-8 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4 duration-700"
 dir={previewLang === 'ar' ? 'rtl' : 'ltr'}
 >
 <div className="pb-6 border-b border-border-muted/10 relative">
 <span className="text-label-xxs text-muted-foreground/40 uppercase font-semibold mb-2 block">Subject Header</span>
 <p className="text-headline-lg font-bold text-foreground leading-tight">{subject || '...'}</p>
 <div className="absolute bottom-0 start-0 w-12 h-1 bg-operational-cyan/20" />
 </div>
 <div className="relative">
 <span className="text-label-xxs text-muted-foreground/40 uppercase font-semibold mb-3 block">Message Body</span>
 <p className="text-foreground/80 whitespace-pre-wrap leading-[1.8] text-body-md font-medium">
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