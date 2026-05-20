'use client';

import { useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { 
  CheckCircle2, 
  Mail, 
  Zap, 
  ArrowRight, 
  Activity, 
  Globe2, 
  Sparkles, 
  MessageSquareDot, 
  Plus, 
  Trash2
} from 'lucide-react';
import { Pagination } from '@/components/shared/DataTable/Pagination';
import { useNotificationTemplates } from '@/features/notifications/hooks/useNotificationTemplates';
import { motion } from 'framer-motion';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { useAudioFeedback } from '@/hooks/useAudioFeedback';
import { z } from 'zod';

const PREDEFINED_PARAMETERS: Record<string, Array<{ name: string; label_ar: string; label_en: string; sample_value: string }>> = {
  LOW_STOCK: [
    { name: 'item_name', label_ar: 'اسم الصنف', label_en: 'Item Name', sample_value: 'Tomato Paste' },
    { name: 'qty', label_ar: 'الكمية الحالية', label_en: 'Current Quantity', sample_value: '5' },
    { name: 'min_qty', label_ar: 'الحد الأدنى', label_en: 'Minimum Threshold', sample_value: '10' }
  ],
  EXPIRY_WARNING: [
    { name: 'item_name', label_ar: 'اسم الصنف', label_en: 'Item Name', sample_value: 'Frozen Beef Breasts' },
    { name: 'days', label_ar: 'الأيام المتبقية', label_en: 'Days Remaining', sample_value: '3' },
    { name: 'lot_number', label_ar: 'رقم الدفعة', label_en: 'Lot Number', sample_value: 'LOT-2026-05A' }
  ],
  ROLE_UPDATE: [
    { name: 'user_name', label_ar: 'اسم المستخدم', label_en: 'User Name', sample_value: 'Khalid Nasser' },
    { name: 'new_role', label_ar: 'الدور الجديد', label_en: 'New Role', sample_value: 'Kitchen Manager' }
  ],
  SCHEDULED_REPORT: [
    { name: 'date', label_ar: 'التاريخ', label_en: 'Date', sample_value: '2026-05-20' },
    { name: 'branch_name', label_ar: 'اسم الفرع', label_en: 'Branch Name', sample_value: 'Riyadh Main Kitchen' }
  ],
  CUSTOM: []
};

export function TemplateListClient({ locale }: { locale: string }) {
  const t = useTranslations('notifications');
  const t_common = useTranslations('common');
  const qc = useQueryClient();
  const router = useRouter();
  const { playSound } = useAudioFeedback();

  const [page, setPage] = useState(1);
  const { data, isLoading } = useNotificationTemplates({ page });

  // DELETE mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.del(`/notifications/templates/${id}`, z.unknown()),
    onSuccess: () => {
      playSound('success');
      qc.invalidateQueries({ queryKey: ['notifications/templates'] });
    },
    onError: () => {
      playSound('error');
    }
  });

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.06
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 25 },
    show: { 
      opacity: 1, 
      y: 0,
      transition: {
        type: "spring" as const,
        stiffness: 260,
        damping: 26
      }
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-14 w-80 bg-white/5 rounded-2xl animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-surface-container-low/70 backdrop-blur-xl border border-white/5 rounded-[2.5rem] p-6 space-y-4 animate-pulse">
              <div className="flex justify-between items-center">
                <div className="h-6 w-24 bg-white/5 rounded-lg" />
                <div className="h-4 w-4 bg-white/5 rounded-full" />
              </div>
              <div className="space-y-2 pt-4">
                <div className="h-4 w-3/4 bg-white/5 rounded" />
                <div className="h-4 w-1/2 bg-white/5 rounded" />
              </div>
              <div className="h-8 w-full bg-white/5 rounded-lg pt-2 mt-4" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-500 relative">
      <div className="absolute top-0 right-1/3 w-80 h-80 bg-operational-cyan/5 rounded-full blur-[100px] pointer-events-none -z-10" />

      {/* Page Header with Action Button */}
      <PageHeader
        title={t('title') || 'Notification Templates'}
        description={t('templates_desc') || 'Manage notification system triggers and dynamic templates.'}
        actions={
          <Button
            onClick={() => {
              playSound('click');
              router.push('/communications/notifications/templates/new');
            }}
            className="h-12 px-6 bg-gradient-to-r from-operational-cyan to-cyan-400 text-black hover:brightness-110 font-bold text-xs uppercase tracking-widest gap-2 rounded-xl shadow-[0_4px_20px_rgba(var(--operational-cyan-rgb),0.2)] transition-all duration-300"
          >
            <Plus className="w-4.5 h-4.5 stroke-[3px]" />
            {t('actions.create') || 'Create Template'}
          </Button>
        }
      />

      {/* Visual Header Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Stat Card 1: Total templates */}
        <div className="bg-surface-container-low/60 backdrop-blur-lg border border-white/10 rounded-[2.5rem] p-6 relative overflow-hidden group shadow-xl">
          <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/[0.02] via-transparent to-transparent pointer-events-none" />
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black text-muted-foreground/45 uppercase tracking-widest block mb-1">
                {t('stats_templates.total_templates')}
              </span>
              <span className="text-3xl font-extrabold text-foreground">
                {data?.data?.length ?? 0}
              </span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-operational-cyan/10 border border-operational-cyan/20 flex items-center justify-center text-operational-cyan shadow-[0_0_15px_rgba(var(--operational-cyan-rgb),0.1)] group-hover:scale-110 transition-transform duration-300">
              <Mail className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Stat Card 2: Active templates */}
        <div className="bg-surface-container-low/60 backdrop-blur-lg border border-white/10 rounded-[2.5rem] p-6 relative overflow-hidden group shadow-xl">
          <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/[0.02] via-transparent to-transparent pointer-events-none" />
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black text-muted-foreground/45 uppercase tracking-widest block mb-1">
                {t('stats_templates.active_templates')}
              </span>
              <span className="text-3xl font-extrabold text-emerald-400">
                {data?.data?.filter(item => item.is_active).length ?? 0}
              </span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)] group-hover:scale-110 transition-transform duration-300">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Stat Card 3: Trigger events */}
        <div className="bg-surface-container-low/60 backdrop-blur-lg border border-white/10 rounded-[2.5rem] p-6 relative overflow-hidden group sm:col-span-2 lg:col-span-1 shadow-xl">
          <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/[0.02] via-transparent to-transparent pointer-events-none" />
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black text-muted-foreground/45 uppercase tracking-widest block mb-1">
                {t('trigger_events') || 'Trigger Events'}
              </span>
              <span className="text-3xl font-extrabold text-operational-cyan">
                {new Set(data?.data?.map(item => item.trigger_event)).size}
              </span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-operational-cyan/10 border border-operational-cyan/20 flex items-center justify-center text-operational-cyan shadow-[0_0_15px_rgba(var(--operational-cyan-rgb),0.1)] group-hover:scale-110 transition-transform duration-300">
              <Zap className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Grid of Templates */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {data?.data?.map((template) => {
          const isSms = template.code.toLowerCase().includes('sms');
          const isPush = template.code.toLowerCase().includes('push') || template.code.toLowerCase().includes('app');
          const isSystem = ['tmpl-1', 'tmpl-2', 'tmpl-3', 'tmpl-4'].includes(template.id);
          
          return (
            <motion.div
              key={template.id}
              variants={itemVariants}
              whileHover={{ y: -8, scale: 1.015 }}
              onClick={() => router.push(`/communications/notifications/templates/${template.id}`)}
              className="bg-surface-container-low/60 backdrop-blur-lg border border-white/10 rounded-[2.5rem] p-6 shadow-2xl relative overflow-hidden group cursor-pointer hover:border-operational-cyan/35 transition-all duration-300 flex flex-col justify-between min-h-[360px]"
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-operational-cyan/[0.02] via-transparent to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              <div>
                {/* Header Info */}
                <div className="flex justify-between items-start gap-4 mb-5">
                  <div className="flex flex-col gap-1.5">
                    <span className="font-mono text-[9px] font-black text-operational-cyan bg-operational-cyan/10 px-2.5 py-1 rounded-xl border border-operational-cyan/25 tracking-wider self-start shadow-[0_0_12px_rgba(var(--operational-cyan-rgb),0.05)]">
                      {template.code}
                    </span>
                    
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-surface-container-lowest/80 border border-white/5 w-fit">
                      {isSms ? (
                        <>
                          <MessageSquareDot className="w-3 h-3 text-amber-400" />
                          <span className="text-[8px] font-bold text-amber-400/90 uppercase tracking-widest">SMS Gateway</span>
                        </>
                      ) : isPush ? (
                        <>
                          <Sparkles className="w-3 h-3 text-emerald-400 animate-pulse" />
                          <span className="text-[8px] font-bold text-emerald-400/90 uppercase tracking-widest">In-App Hub</span>
                        </>
                      ) : (
                        <>
                          <Mail className="w-3 h-3 text-operational-cyan" />
                          <span className="text-[8px] font-bold text-operational-cyan/95 uppercase tracking-widest">Email System</span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {/* Glowing Active Ring and Delete action */}
                  <div className="flex items-center gap-2 mt-1" onClick={(e) => e.stopPropagation()}>
                    {!isSystem && (
                      <button
                        onClick={() => deleteMutation.mutate(template.id)}
                        className="p-2 bg-white/5 border border-white/5 rounded-xl text-status-error/60 hover:text-status-error hover:bg-status-error/10 hover:border-status-error/20 transition-all duration-200"
                        title="Delete custom template"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <span className="w-2.5 h-2.5 rounded-full relative flex ml-1">
                      {template.is_active && (
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      )}
                      <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${template.is_active ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.7)]' : 'bg-white/10'}`}></span>
                    </span>
                    <span className={`text-[9px] font-black uppercase tracking-widest ${template.is_active ? 'text-emerald-400' : 'text-muted-foreground/35'}`}>
                      {template.is_active ? t('active') || 'Active' : t('inactive') || 'Inactive'}
                    </span>
                  </div>
                </div>

                {/* Miniature Live Email Mockup Frame */}
                <div className="bg-surface-container-lowest/40 border border-white/5 rounded-2xl p-4.5 space-y-4 mb-4 relative overflow-hidden group-hover:bg-surface-container-lowest/70 group-hover:border-operational-cyan/15 transition-all duration-300 shadow-inner">
                  <div className="flex items-center gap-1.5 pb-2.5 border-b border-white/[0.04] justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-white/10" />
                      <span className="w-1.5 h-1.5 rounded-full bg-white/10" />
                      <span className="w-1.5 h-1.5 rounded-full bg-white/10" />
                      <span className="text-[8px] font-mono text-muted-foreground/30 ms-2 uppercase tracking-widest">
                        Mock Wireframe Preview
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-[8px] font-bold text-muted-foreground/40 bg-surface-container-low px-1.5 py-0.5 rounded border border-white/5 uppercase">
                      <Globe2 className="w-2.5 h-2.5" />
                      Dual
                    </div>
                  </div>
                  
                  {template.subject_ar && (
                    <div className="space-y-1" dir="rtl">
                      <span className="text-[8px] text-muted-foreground/30 font-black tracking-widest block uppercase">الموضوع</span>
                      <p className="text-[11px] font-bold text-foreground/80 line-clamp-1 leading-tight">{template.subject_ar}</p>
                    </div>
                  )}

                  {template.subject_en && (
                    <div className="space-y-1 pt-1 border-t border-white/[0.02]" dir="ltr">
                      <span className="text-[8px] text-muted-foreground/30 font-black tracking-widest block uppercase font-sans">Subject</span>
                      <p className="text-[11px] font-bold text-foreground/80 line-clamp-1 leading-tight">{template.subject_en}</p>
                    </div>
                  )}
                  
                  <div className="space-y-2 pt-2 border-t border-white/[0.02]" dir={template.subject_en ? "ltr" : "rtl"}>
                    <p className="text-[10px] text-muted-foreground/45 line-clamp-2 leading-relaxed italic">
                      {template.subject_en ? template.body_en : template.body_ar}
                    </p>
                  </div>
                </div>
              </div>

              {/* Footer Event Trigger */}
              <div className="flex items-center justify-between pt-4 border-t border-white/[0.04]">
                <div className="flex items-center gap-2 max-w-[80%]">
                  <Activity className="w-3.5 h-3.5 text-operational-cyan/50 animate-pulse" />
                  <span className="text-[10px] font-bold text-muted-foreground/50 truncate uppercase tracking-wider font-mono">
                    {template.trigger_event}
                  </span>
                </div>
                <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-muted-foreground group-hover:bg-operational-cyan/10 group-hover:border-operational-cyan/20 group-hover:text-operational-cyan transition-all duration-300 shadow-md">
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Pagination component */}
      {data?.meta && data.meta.total_pages > 1 && (
        <div className="bg-surface-container-low/30 backdrop-blur-md rounded-[2.5rem] border border-white/5 p-4 flex justify-center animate-in fade-in duration-700 shadow-inner">
          <Pagination page={page} totalPages={data.meta.total_pages} onPageChange={setPage} />
        </div>
      )}

    </div>
  );
}