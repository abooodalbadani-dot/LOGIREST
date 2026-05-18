'use client';

import { useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { CheckCircle2, Mail, Zap, ArrowRight, Activity, Globe2, Sparkles, MessageSquareDot } from 'lucide-react';
import { Pagination } from '@/components/shared/DataTable/Pagination';
import { useNotificationTemplates } from '@/features/notifications/hooks/useNotificationTemplates';
import { motion } from 'framer-motion';

export function TemplateListClient({ locale: _locale }: { locale: string }) {
  const t = useTranslations('notifications');
  const [page, setPage] = useState(1);
  const { data, isLoading } = useNotificationTemplates({ page });
  const router = useRouter();

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    show: { 
      opacity: 1, 
      y: 0,
      transition: {
        type: "spring" as const,
        stiffness: 240,
        damping: 24
      }
    }
  };

  if (isLoading) {
    return (
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
            <div className="space-y-2 pt-4">
              <div className="h-2.5 w-full bg-white/5 rounded" />
              <div className="h-2.5 w-full bg-white/5 rounded" />
              <div className="h-2.5 w-2/3 bg-white/5 rounded" />
            </div>
            <div className="h-8 w-full bg-white/5 rounded-lg pt-2 mt-4" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-500 relative">
      <div className="absolute top-0 right-1/3 w-80 h-80 bg-operational-cyan/5 rounded-full blur-[100px] pointer-events-none -z-10" />

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
                {t('trigger_events')}
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
        {data?.data?.map((template, index) => {
          // Infer channel representation for beautiful UI badges
          const isSms = template.code.toLowerCase().includes('sms');
          const isPush = template.code.toLowerCase().includes('push') || template.code.toLowerCase().includes('app');
          
          return (
            <motion.div
              key={template.id}
              variants={itemVariants}
              whileHover={{ y: -8, scale: 1.015 }}
              onClick={() => router.push(`/communications/notifications/templates/${template.id}`)}
              className="bg-surface-container-low/60 backdrop-blur-lg border border-white/10 rounded-[2.5rem] p-6 shadow-2xl relative overflow-hidden group cursor-pointer hover:border-operational-cyan/35 transition-all duration-300 flex flex-col justify-between min-h-[360px]"
            >
              {/* Background Glow Overlay */}
              <div className="absolute inset-0 bg-gradient-to-tr from-operational-cyan/[0.02] via-transparent to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="absolute -top-24 -end-24 w-48 h-48 rounded-full bg-operational-cyan/[0.02] blur-3xl pointer-events-none group-hover:bg-operational-cyan/[0.05] transition-all duration-500" />
              
              <div>
                {/* Header Info (Code, Channel Badges, and Active State) */}
                <div className="flex justify-between items-start gap-4 mb-5">
                  <div className="flex flex-col gap-1.5">
                    <span className="font-mono text-[9px] font-black text-operational-cyan bg-operational-cyan/10 px-2.5 py-1 rounded-xl border border-operational-cyan/25 tracking-wider self-start shadow-[0_0_12px_rgba(var(--operational-cyan-rgb),0.05)]">
                      {template.code}
                    </span>
                    
                    {/* Channel badge with glowing ring */}
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
                  
                  {/* Glowing Active Ring */}
                  <div className="flex items-center gap-2 mt-1">
                    <span className="w-2.5 h-2.5 rounded-full relative flex">
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
                  {/* Mock Window Top bar */}
                  <div className="flex items-center gap-1.5 pb-2.5 border-b border-white/[0.04] justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-white/10" />
                      <span className="w-1.5 h-1.5 rounded-full bg-white/10" />
                      <span className="w-1.5 h-1.5 rounded-full bg-white/10" />
                      <span className="text-[8px] font-mono text-muted-foreground/30 ms-2 uppercase tracking-widest">
                        Mock Wireframe Preview
                      </span>
                    </div>
                    {/* Localization Indicator */}
                    <div className="flex items-center gap-1 text-[8px] font-bold text-muted-foreground/40 bg-surface-container-low px-1.5 py-0.5 rounded border border-white/5 uppercase">
                      <Globe2 className="w-2.5 h-2.5" />
                      Dual
                    </div>
                  </div>
                  
                  {/* Mock Arabic Preview */}
                  {template.subject_ar && (
                    <div className="space-y-1" dir="rtl">
                      <span className="text-[8px] text-muted-foreground/30 font-black tracking-widest block uppercase">الموضوع</span>
                      <p className="text-[11px] font-bold text-foreground/80 line-clamp-1 leading-tight">{template.subject_ar}</p>
                    </div>
                  )}

                  {/* Mock English Preview */}
                  {template.subject_en && (
                    <div className="space-y-1 pt-1 border-t border-white/[0.02]" dir="ltr">
                      <span className="text-[8px] text-muted-foreground/30 font-black tracking-widest block uppercase font-sans">Subject</span>
                      <p className="text-[11px] font-bold text-foreground/80 line-clamp-1 leading-tight">{template.subject_en}</p>
                    </div>
                  )}
                  
                  {/* Visual Muted Wireframe Paragraph Body */}
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