'use client';

import { useTranslations } from 'next-intl';
import { Layers, Warehouse, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useRouter, usePathname } from '@/i18n/navigation';

interface EmptyScopeStateProps {
 context: 'branch' | 'warehouse' | 'department';
 title?: string;
 description?: string;
 buttonText?: string;
 className?: string;
}

export function EmptyScopeState({ context, title, description, buttonText, className }: EmptyScopeStateProps) {
 const t = useTranslations('scope_guard');
 const router = useRouter();
 const pathname = usePathname();

 const icons = {
  branch: Building2,
  warehouse: Warehouse,
  department: Layers
 };

 const Icon = icons[context];

 const triggerContextSelector = () => {
  // Attempt to open Topbar's selector overlay
  const event = new CustomEvent('open-context-selector', { cancelable: true });
  const wasHandled = !window.dispatchEvent(event);
  
  if (!wasHandled) {
   // Fallback: navigate to context selector page with current path as redirect query param
   router.push(`/context-selector?redirect=${encodeURIComponent(pathname)}`);
  }
 };

  return (
   // 1. أضفنا shrink-0 و min-w-[280px] ليكون درعاً صُلباً ضد أي عصر من الحاويات الخارجية
   <div className={cn("w-full min-w-[280px] max-w-md mx-auto flex flex-col items-center justify-center text-center gap-6 p-8 min-h-[50vh] shrink-0 animate-in fade-in duration-500", className)}>
    
    <div className="relative flex items-center justify-center w-20 h-20 mb-2 shrink-0">
     {/* 2. تحويل التوهج ليستخدم لون brand-gold ليتماشى مع الهوية الفخمة */}
     <div className="absolute inset-0 bg-brand-gold/20 blur-xl rounded-full animate-pulse" />
     <div className="p-5 bg-brand-gold/10 text-brand-gold rounded-2xl relative z-10 border border-brand-gold/20 shadow-sm flex items-center justify-center">
      <Icon className="w-10 h-10" />
     </div>
    </div>
    
    {/* 3. إزالة self-stretch الخبيثة التي قد تكسر التوسيط، واستخدام flex-col صريح */}
    <div className="w-full flex flex-col items-center gap-3 px-4 shrink-0">
     <h2 className="text-xl md:text-2xl font-bold text-foreground tracking-tight text-center w-full break-words">
      {title ?? t(`${context}_title`)}
     </h2>
     <p className="text-sm md:text-base text-muted-foreground leading-relaxed text-center max-w-sm mx-auto break-words">
      {description ?? t(`${context}_desc`)}
     </p>
    </div>

    <Button 
     size="lg"
     className="mt-4 bg-brand-gold hover:bg-brand-gold-hover text-white font-bold px-8 shadow-lg shadow-brand-gold/20 transition-all shrink-0" 
     onClick={triggerContextSelector}
    >
     {buttonText ?? (context === 'warehouse' ? 'اختيار المستودع الآن' : t('action_hint'))}
    </Button>
   </div>
  );
}

