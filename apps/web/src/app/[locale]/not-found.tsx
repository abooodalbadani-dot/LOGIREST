import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';

export default function NotFound() {
 const t = useTranslations('not_found');

 return (
  <div className="flex flex-col items-center justify-center min-h-screen bg-card border border-border shadow-sm text-foreground p-8 overflow-hidden relative">
   {/* Background Orbs */}
   <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-operational-cyan/5 rounded-full blur-[120px] animate-pulse" />
    <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-status-info/5 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
   </div>

   <div className="relative z-10 max-w-2xl w-full text-center space-y-12">
    <div className="relative inline-block">
     <h1 className="text-[15rem] font-bold leading-none opacity-[0.03] select-none tracking-tighter">404</h1>
     <div className="absolute inset-0 flex flex-col items-center justify-center translate-y-4">
      <h2 className="text-display-md font-bold tracking-tight mb-2 uppercase">{t('title')}</h2>
      <div className="h-1 w-20 bg-operational-cyan rounded-full mb-6" />
     </div>
    </div>

    <div className="space-y-8">
     <p className="text-body-lg text-muted-foreground/80 max-w-prose mx-auto leading-relaxed">
      {t('description')}
     </p>
     
     <div className="flex flex-col items-center gap-8">
      <Link 
       href="/"
       className="min-h-[56px] px-12 py-4 bg-operational-cyan text-primary-foreground hover:brightness-110 hover:shadow-2xl hover:shadow-operational-cyan/30 transition-all rounded-2xl font-bold text-label-md uppercase tracking-widest shadow-xl shadow-operational-cyan/20 active:scale-95 flex items-center justify-center"
      >
       {t('go_home')}
      </Link>

      <div className="pt-16 space-y-10">
       <div className="space-y-4 p-8 rounded-[2rem] bg-card border border-border shadow-sm/30 border border-surface-variant/5 backdrop-blur-sm shadow-inner">
        <h3 className="text-label-xs font-bold uppercase tracking-[0.3em] text-muted-foreground/40">{t('mission_title')}</h3>
        <p className="text-label-sm font-medium text-muted-foreground/60 max-w-[65ch] mx-auto italic leading-loose">
         {t('mission_description')}
        </p>
       </div>

       <div className="space-y-6">
        <h3 className="text-label-xs font-bold uppercase tracking-[0.3em] text-muted-foreground/40">{t('trusted_by')}</h3>
        <div className="flex flex-wrap justify-center gap-10 grayscale opacity-20 hover:opacity-40 transition-opacity">
         <span className="text-headline-xs font-black tracking-tighter">{t('partners.global_kitchen')}</span>
         <span className="text-headline-xs font-black tracking-tighter">{t('partners.resto_pro')}</span>
         <span className="text-headline-xs font-black tracking-tighter">{t('partners.food_logistics')}</span>
        </div>
       </div>
      </div>
     </div>
    </div>
   </div>
  </div>
 );
}
