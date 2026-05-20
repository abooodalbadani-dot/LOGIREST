'use client';

import { useTranslations, useLocale } from 'next-intl';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { 
  History, 
  Package, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Calendar, 
  MapPin,
  Clock,
  Database,
  Construction
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function LotBalanceClient() {
  const t = useTranslations('operational.lots');

  if (process.env.NODE_ENV !== 'development') {
   return (
    <div className="min-h-screen bg-surface text-foreground p-4 lg:p-10 space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
     <div className="max-w-[1600px] mx-auto flex flex-col items-center justify-center py-32 bg-surface-container-low rounded-[3rem] border-2 border-dashed border-white/5">
      <div className="w-20 h-20 rounded-full bg-amber-500/5 flex items-center justify-center mb-6">
       <Construction className="w-10 h-10 text-amber-500/50" />
      </div>
      <p className="text-label-sm font-semibold text-muted-foreground/60 uppercase">{t('coming_soon')}</p>
     </div>
    </div>
   );
  }

  return (
   <div className="min-h-screen bg-surface text-foreground p-4 lg:p-10 space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
    <div className="max-w-[1600px] mx-auto flex flex-col items-center justify-center py-32 bg-surface-container-low rounded-[3rem] border-2 border-dashed border-white/5">
     <div className="w-20 h-20 rounded-full bg-amber-500/5 flex items-center justify-center mb-6">
      <Construction className="w-10 h-10 text-amber-500/50" />
     </div>
     <p className="text-label-sm font-semibold text-muted-foreground/60 uppercase">{t('coming_soon')}</p>
    </div>
   </div>
  );
}
