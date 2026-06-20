import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { Lock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ForbiddenPage() {
  const t = useTranslations('forbidden');
  const tc = useTranslations('common');

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background p-6 relative overflow-hidden selection:bg-brand-gold/30">

      {/* Dynamic Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-destructive/5 rounded-full blur-[120px] pointer-events-none -z-10 animate-pulse-slow"></div>

      {/* Subtle Background Hint */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[25vw] md:text-[300px] font-black text-foreground/[0.02] select-none pointer-events-none -z-10">
        403
      </div>

      {/* Security Centered Card */}
      <div className="w-full flex flex-col items-center justify-center max-w-md mx-auto p-8 z-10 relative gap-6">

        {/* Icon Wrapper */}
        <div className="relative group">
          <div className="absolute inset-0 bg-destructive/20 rounded-full blur-xl group-hover:bg-destructive/30 transition-colors duration-500"></div>
          <div className="w-24 h-24 bg-surface-container-high border border-destructive/20 text-destructive rounded-full flex items-center justify-center relative shadow-inner">
            <Lock className="w-10 h-10 stroke-[1.5px]" />
          </div>
        </div>

        {/* 🔴 الحل النووي: حاوية Block صلبة بعرض أدنى إجباري تحمي النصوص من الانهيار.
          إزالة text-balance واستخدام whitespace-normal لفرض السلوك الطبيعي للنص.
        */}
        <div className="block w-full min-w-[280px] sm:min-w-[380px] text-center space-y-3">
          <h1 className="text-3xl md:text-4xl font-extrabold text-foreground tracking-tight whitespace-normal break-words">
            {t('title')}
          </h1>

          <p className="text-base md:text-lg text-muted-foreground whitespace-normal break-words leading-relaxed">
            {t('description')}
          </p>
        </div>

        <Button variant="outline" className="border-border/50 hover:bg-muted shrink-0 w-full sm:w-auto" asChild>
          <Link href="/dashboard" className="flex items-center justify-center gap-2">
            <ArrowRight className="w-4 h-4 rtl:rotate-180" />
            <span>{tc('actions.go_back')}</span>
          </Link>
        </Button>
      </div>
    </div>
  );
}
