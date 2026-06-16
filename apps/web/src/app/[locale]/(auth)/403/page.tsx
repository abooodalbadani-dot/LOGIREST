import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { ShieldAlert, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ForbiddenPage() {
  const t = useTranslations('forbidden');

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background p-6 relative overflow-hidden">
      {/* Subtle Background Hint */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[300px] font-black text-muted/10 select-none pointer-events-none z-0">
        403
      </div>

      {/* Security Centered Card */}
      <div className="w-full max-w-md flex flex-col items-center text-center gap-6 z-10">
        <div className="w-20 h-20 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mb-4">
          <ShieldAlert className="w-10 h-10" />
        </div>

        <h1 className="text-3xl font-bold text-foreground tracking-tight">
          {t('title')}
        </h1>

        <p className="text-base text-muted-foreground leading-relaxed max-w-sm">
          {t('description')}
        </p>

        <Button size="lg" className="mt-4 px-8 bg-brand-gold hover:bg-brand-gold-hover text-white shadow-md font-bold transition-all" asChild>
          <Link href="/dashboard">
            <ArrowRight className="w-4 h-4 me-2 rtl:rotate-180" />
            {t('go_home')}
          </Link>
        </Button>
      </div>
    </div>
  );
}

