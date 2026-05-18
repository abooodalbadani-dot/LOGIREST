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
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { Link } from '@/i18n/navigation';
import { motion } from 'framer-motion';
import { 
  Save, 
  ArrowLeft, 
  Loader2, 
  Globe, 
  Mail, 
  Languages, 
  Info
} from 'lucide-react';

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

export function TemplateEditorClient({ id, title, locale: _locale }: Props) {
  const t = useTranslations('notifications');
  const t_common = useTranslations('common');
  const tc = useTranslations('communications.templates.editor');
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
    return (
      <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8 animate-pulse">
        <div className="h-10 w-48 bg-surface-container-highest rounded-2xl" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 space-y-6">
            <div className="h-64 bg-surface-container-highest rounded-[2rem]" />
            <div className="h-64 bg-surface-container-highest rounded-[2rem]" />
            <div className="h-20 bg-surface-container-highest rounded-2xl" />
          </div>
          <div className="lg:col-span-5 h-[500px] bg-surface-container-highest rounded-[2.5rem]" />
        </div>
      </div>
    );
  }

  const subject = previewLang === 'ar' ? subjectAr : subjectEn;
  const body = previewLang === 'ar' ? bodyAr : bodyEn;

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8 relative">
      {/* Decorative background glows */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-operational-cyan/5 rounded-full blur-[120px] pointer-events-none -z-10" />
      <div className="absolute bottom-1/4 left-10 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[160px] pointer-events-none -z-10" />

      {/* Breadcrumb return link & page headers */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
        <div className="space-y-4">
          <Link 
            href="/communications/notifications/templates"
            data-skip-guard="true"
            className="group inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground hover:text-operational-cyan transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform rtl:rotate-180" />
            {t_common('actions.back') || 'Back to templates'}
          </Link>
          <div className="space-y-1">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-operational-cyan/10 rounded-2xl border border-operational-cyan/20 shadow-[0_0_25px_rgba(var(--operational-cyan-rgb),0.1)]">
                <Mail className="w-7 h-7 text-operational-cyan" />
              </div>
              <div>
                <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground via-foreground/90 to-foreground/75">
                  {title}
                </h1>
                <p className="text-[10px] text-muted-foreground/60 uppercase font-bold tracking-[0.2em] mt-1.5 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-operational-cyan animate-pulse" />
                  Live Preview Workspace & Interactive Canvas
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT SIDE COLUMN: Editing Forms */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Arabic inputs panel */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 md:p-8 rounded-[2rem] bg-surface-container-low/60 backdrop-blur-lg border border-white/10 shadow-2xl space-y-6 relative overflow-hidden group hover:border-operational-cyan/20 transition-all duration-300"
            >
              <div className="absolute top-0 start-0 w-full h-[2px] bg-gradient-to-r from-transparent via-operational-cyan/40 to-transparent opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
              
              <div className="flex items-center justify-between pb-2">
                <div className="flex items-center gap-2 text-operational-cyan/80 font-bold text-xs uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-operational-cyan shadow-[0_0_12px_rgba(var(--operational-cyan-rgb),0.4)] animate-pulse" />
                  {t_common('languages.arabic')} (RTL)
                </div>
                <Languages className="w-4.5 h-4.5 text-muted-foreground/40 group-focus-within:text-operational-cyan transition-colors" />
              </div>

              <div className="grid gap-3">
                <Label htmlFor="subject-ar" className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/80 ml-1">
                  {t('subject_ar')}
                </Label>
                <div className="relative">
                  <Textarea
                    id="subject-ar"
                    dir="rtl"
                    {...register('subject_ar')}
                    className="min-h-[60px] py-3.5 bg-surface-container-lowest/80 border border-outline-low rounded-2xl px-5 focus-visible:ring-operational-cyan focus-visible:border-operational-cyan transition-all text-sm shadow-inner group-hover:border-white/20 focus:shadow-[0_0_20px_rgba(var(--operational-cyan-rgb),0.1)]"
                  />
                </div>
              </div>

              <div className="grid gap-3">
                <Label htmlFor="body-ar" className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/80 ml-1">
                  {t('body_ar')}
                </Label>
                <div className="relative">
                  <Textarea
                    id="body-ar"
                    dir="rtl"
                    {...register('body_ar')}
                    className="min-h-[220px] py-4 bg-surface-container-lowest/80 border border-outline-low rounded-2xl px-5 focus-visible:ring-operational-cyan focus-visible:border-operational-cyan transition-all text-sm leading-relaxed shadow-inner group-hover:border-white/20 focus:shadow-[0_0_20px_rgba(var(--operational-cyan-rgb),0.1)]"
                  />
                </div>
              </div>
            </motion.div>

            {/* English inputs panel */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="p-6 md:p-8 rounded-[2rem] bg-surface-container-low/60 backdrop-blur-lg border border-white/10 shadow-2xl space-y-6 relative overflow-hidden group hover:border-operational-cyan/20 transition-all duration-300"
            >
              <div className="absolute top-0 start-0 w-full h-[2px] bg-gradient-to-r from-transparent via-operational-cyan/40 to-transparent opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
              
              <div className="flex items-center justify-between pb-2">
                <div className="flex items-center gap-2 text-operational-cyan/80 font-bold text-xs uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-operational-cyan shadow-[0_0_12px_rgba(var(--operational-cyan-rgb),0.4)] animate-pulse" />
                  {t_common('languages.english')} (LTR)
                </div>
                <Globe className="w-4.5 h-4.5 text-muted-foreground/40 group-focus-within:text-operational-cyan transition-colors" />
              </div>

              <div className="grid gap-3">
                <Label htmlFor="subject-en" className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/80 ml-1">
                  {t('subject_en')}
                </Label>
                <div className="relative">
                  <Input
                    id="subject-en"
                    dir="ltr"
                    {...register('subject_en')}
                    className="h-14 font-semibold bg-surface-container-lowest/80 border border-outline-low rounded-2xl px-5 focus-visible:ring-operational-cyan focus-visible:border-operational-cyan transition-all text-sm shadow-inner group-hover:border-white/20 focus:shadow-[0_0_20px_rgba(var(--operational-cyan-rgb),0.1)]"
                  />
                </div>
              </div>

              <div className="grid gap-3">
                <Label htmlFor="body-en" className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/80 ml-1">
                  {t('body_en')}
                </Label>
                <div className="relative">
                  <Textarea
                    id="body-en"
                    dir="ltr"
                    {...register('body_en')}
                    className="min-h-[220px] py-4 bg-surface-container-lowest/80 border border-outline-low rounded-2xl px-5 focus-visible:ring-operational-cyan focus-visible:border-operational-cyan transition-all text-sm leading-relaxed shadow-inner group-hover:border-white/20 focus:shadow-[0_0_20px_rgba(var(--operational-cyan-rgb),0.1)]"
                  />
                </div>
              </div>
            </motion.div>

            {/* Actions Form Bar */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-[2rem] bg-surface-container-low/40 backdrop-blur-md border border-white/5 shadow-xl"
            >
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => guardedRouter.push('/communications/notifications/templates', { skipGuard: true })}
                  className="h-14 px-8 border border-white/10 hover:bg-surface-container-high rounded-2xl transition-all font-bold uppercase text-[10px] tracking-widest text-muted-foreground hover:text-foreground"
                >
                  {t_common('actions.cancel')}
                </Button>
                <PermissionGate action="edit" resource="email_settings">
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button
                      type="submit"
                      disabled={updateMutation.isPending}
                      className="h-14 px-10 bg-gradient-to-r from-operational-cyan to-cyan-400 text-black hover:brightness-110 transition-all font-extrabold uppercase text-[10px] tracking-widest gap-3 rounded-2xl shadow-[0_10px_30px_rgba(var(--operational-cyan-rgb),0.25)]"
                    >
                      {updateMutation.isPending ? (
                        <Loader2 className="w-4.5 h-4.5 animate-spin" />
                      ) : (
                        <Save className="w-4.5 h-4.5" />
                      )}
                      {t_common('actions.save')}
                    </Button>
                  </motion.div>
                </PermissionGate>
              </div>

              <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 pr-2">
                <span className="w-1.5 h-1.5 rounded-full bg-operational-cyan/50 animate-pulse" />
                {t_common('fields.code')}: <span className="font-mono text-operational-cyan font-bold">{data?.code}</span>
              </div>
            </motion.div>

          </div>

          {/* RIGHT SIDE COLUMN: Live browser window mockup */}
          <div className="lg:col-span-5 lg:sticky lg:top-8 space-y-6">
            
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.12 }}
              className="rounded-[2.5rem] bg-surface-container-low/60 backdrop-blur-lg border border-white/10 shadow-2xl overflow-hidden"
            >
              {/* Window chrome topbar */}
              <div className="px-6 py-4 bg-surface-container/60 border-b border-white/10 flex items-center justify-between gap-4">
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="w-3 h-3 rounded-full bg-status-error/30" />
                  <span className="w-3 h-3 rounded-full bg-status-warning/30" />
                  <span className="w-3 h-3 rounded-full bg-emerald-500/30" />
                </div>
                
                <div className="flex-1 max-w-xs bg-surface-container-lowest/50 rounded-xl py-1 px-4 border border-outline-low text-[9px] font-mono text-muted-foreground/60 select-none overflow-hidden text-ellipsis whitespace-nowrap text-center">
                  /communications/notifications/preview/{data?.code?.toLowerCase() || 'mail'}
                </div>

                <div className="flex bg-surface-container-lowest/50 rounded-lg p-0.5 border border-outline-low backdrop-blur-sm scale-90">
                  <button
                    type="button"
                    className={`px-3 py-1 rounded text-[9px] font-bold uppercase transition-all ${previewLang === 'ar' ? 'bg-operational-cyan text-black shadow-md font-extrabold' : 'text-muted-foreground/60 hover:text-foreground hover:bg-surface-container-high'}`}
                    onClick={() => setPreviewLang('ar')}
                  >
                    AR
                  </button>
                  <button
                    type="button"
                    className={`px-3 py-1 rounded text-[9px] font-bold uppercase transition-all ${previewLang === 'en' ? 'bg-operational-cyan text-black shadow-md font-extrabold' : 'text-muted-foreground/60 hover:text-foreground hover:bg-surface-container-high'}`}
                    onClick={() => setPreviewLang('en')}
                  >
                    EN
                  </button>
                </div>
              </div>

              {/* The Live Email Mockup Context */}
              <div className="p-6 bg-[url('/grid.svg')] bg-center bg-fixed opacity-95 min-h-[460px] flex flex-col justify-between">
                
                <div
                  className="w-full bg-surface-container-lowest/95 border border-white/5 rounded-2xl shadow-[0_20px_40px_-10px_rgba(0,0,0,0.5)] p-6 space-y-6 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2 duration-500 flex-1 flex flex-col justify-between"
                  dir={previewLang === 'ar' ? 'rtl' : 'ltr'}
                >
                  <div className="space-y-4">
                    <div className="space-y-2 pb-4 border-b border-white/5 text-[10px] uppercase font-bold text-muted-foreground/50 tracking-wider">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground/30 min-w-[50px] inline-block">From:</span>
                        <span className="text-foreground/80 font-mono text-[9px]">relay@kitchenstore.io</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground/30 min-w-[50px] inline-block">To:</span>
                        <span className="text-foreground/80 font-mono text-[9px]">recipient@kitchenstore.com</span>
                      </div>
                    </div>

                    <div className="pb-4 border-b border-white/5 relative">
                      <span className="text-[8px] text-operational-cyan font-bold uppercase tracking-widest mb-1.5 block">
                        {tc('subject_header') || 'Subject'}
                      </span>
                      <p className="text-base font-extrabold text-foreground leading-tight">
                        {subject || '...'}
                      </p>
                    </div>

                    <div className="relative pt-2">
                      <span className="text-[8px] text-operational-cyan font-bold uppercase tracking-widest mb-2 block">
                        {tc('message_body') || 'Message Body'}
                      </span>
                      <p className="text-foreground/85 whitespace-pre-wrap leading-[1.8] text-xs font-semibold">
                        {body || t_common('placeholders.typing_preview') || 'Waiting for input values...'}
                      </p>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-white/5 flex items-center justify-between text-[8px] uppercase font-bold tracking-wider text-muted-foreground/30">
                    <span>Kitchen-Store Relay</span>
                    <span>Confidential Notification</span>
                  </div>
                </div>

                {/* Instructions helper box */}
                <div className="mt-4 p-4 rounded-2xl bg-surface-container-low/80 border border-white/5 flex items-start gap-3 shadow-md">
                  <Info className="w-4 h-4 text-operational-cyan shrink-0 mt-0.5 animate-pulse" />
                  <div className="space-y-0.5">
                    <h4 className="text-[9px] font-bold text-foreground uppercase tracking-widest">
                      Live Mockup Renderer
                    </h4>
                    <p className="text-[8px] text-muted-foreground/60 uppercase font-semibold leading-relaxed tracking-wider">
                      Subject tags and body placeholders will resolve dynamically based on trigger actions at runtime.
                    </p>
                  </div>
                </div>

              </div>

            </motion.div>

          </div>

        </div>
      </form>
    </div>
  );
}