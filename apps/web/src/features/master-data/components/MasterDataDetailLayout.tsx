'use client';

import { type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, X } from 'lucide-react';
import { PermissionGate } from '@/components/shared/PermissionGate';

interface Props {
 title: string;
 backHref: string;
 editHref?: string;
 children: ReactNode;
}

export function MasterDataDetailLayout({ title, backHref, editHref, children }: Props) {
 const t = useTranslations('master_data.common');
 
 return (
 <div className="p-8 max-w-[1000px] mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
 <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-12">
 <div className="flex items-center gap-6">
 <Link href={backHref}>
 <Button 
 variant="ghost" 
 size="icon" 
 className="w-12 h-12 rounded-md bg-surface-container-low hover:bg-status-active/10 text-muted-foreground hover:text-status-active transition-all group border-none"
 >
 <ArrowLeft className="w-5 h-5 rtl:rotate-180 group-hover:-translate-x-1 rtl:group-hover:translate-x-1 transition-transform" />
 </Button>
 </Link>
 <div className="space-y-1">
 <h1 className="text-headline-lg font-semibold text-foreground uppercase">{title}</h1>
 <p className="text-label-xs text-muted-foreground/40 uppercase font-medium">{t('read_only_intel')}</p>
 </div>
 </div>

 <div className="flex items-center gap-3">
 <Link href={backHref}>
 <Button 
 variant="outline" 
 type="button" 
 className="h-11 px-6 text-label-xs font-semibold uppercase rounded-md border-none bg-surface-container-high/20 hover:bg-surface-variant/10 transition-all"
 >
 <X className="w-3.5 h-3.5 me-2 opacity-60" />
 {t('cancel')}
 </Button>
 </Link>
 
 {editHref && (
 <PermissionGate action="update" resource="master_data">
 <Link href={editHref}>
 <Button 
 className="h-11 px-8 bg-status-active text-status-active-foreground text-label-xs font-semibold uppercase rounded-md transition-all hover:brightness-110 active:scale-95 border-none"
 >
 <Edit className="w-3.5 h-3.5 me-2" />
 {t('edit')}
 </Button>
 </Link>
 </PermissionGate>
 )}
 </div>
 </div>

 <div className="bg-surface-container-lowest rounded-lg p-10 relative overflow-hidden">
 <div className="absolute inset-0 opacity-[0.01] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
 
 <div className="relative z-10 max-w-5xl mx-auto space-y-8">
 {children}
 </div>
 </div>

 <div className="flex items-center justify-between pt-6 px-8 py-6 bg-surface-container-low/30 rounded-lg">
 <span className="text-label-xs text-muted-foreground/40 uppercase font-medium">{t('operational_snapshot')}</span>
 <div className="flex gap-4 items-center">
 <div className="flex items-center gap-2">
 <div className="w-1.5 h-1.5 rounded-full bg-status-active" />
 <span className="text-label-xxs text-status-active/60 font-semibold uppercase">{t('verified_static_data')}</span>
 </div>
 </div>
 </div>
 </div>
 );
}
