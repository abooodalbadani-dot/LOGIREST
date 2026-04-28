'use client';

import { type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save, X } from 'lucide-react';
import { PermissionGate } from '@/components/shared/PermissionGate';

interface Props {
  title: string;
  backHref: string;
  children: ReactNode;
  isSaving: boolean;
  onSubmit: () => void;
}

export function MasterDataFormLayout({ title, backHref, children, isSaving, onSubmit }: Props) {
  const t = useTranslations('masterData.common');
  return (
    <div className="p-8 max-w-[1000px] mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b border-outline-low">
        <div className="flex items-center gap-6">
          <Link href={backHref}>
            <Button 
              variant="ghost" 
              size="icon" 
              className="w-12 h-12 rounded-xl bg-surface-container-low border border-outline-low hover:border-operational-cyan/50 hover:bg-operational-cyan/10 text-muted-foreground hover:text-operational-cyan transition-all group"
            >
              <ArrowLeft className="w-5 h-5 rtl:rotate-180 group-hover:-translate-x-1 rtl:group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
          <div className="space-y-1">
            <h1 className="text-3xl font-display font-black tracking-tight text-foreground uppercase">{title}</h1>
            <p className="text-xs text-muted-foreground/60 uppercase tracking-[0.2em] font-bold">Asset Configuration & Metadata</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <PermissionGate action="view" resource="master_data">
            <Link href={backHref}>
              <Button 
                variant="outline" 
                type="button" 
                className="h-11 px-6 text-[10px] font-black uppercase tracking-widest rounded-sm border-surface-variant/20 hover:bg-surface-variant/10"
              >
                <X className="w-3.5 h-3.5 me-2 opacity-60" />
                {t('cancel')}
              </Button>
            </Link>
          </PermissionGate>
          <PermissionGate action="create" resource="master_data">
            <Button 
              onClick={onSubmit} 
              disabled={isSaving}
              className="h-11 px-8 bg-primary hover:bg-primary/90 text-primary-foreground text-[10px] font-black uppercase tracking-widest rounded-sm transition-all shadow-[0_15px_35px_rgba(var(--primary-rgb),0.25)]"
            >
              <Save className="w-3.5 h-3.5 me-2" />
              {isSaving ? t('saving') : t('save')}
            </Button>
          </PermissionGate>
        </div>
      </div>

      <div className="bg-surface-container-low border border-outline-low rounded-sm p-10 relative overflow-hidden">
        {/* Subtle grid pattern background */}
        <div className="absolute inset-0 opacity-[0.02] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
        
        <div className="relative z-10 max-w-5xl mx-auto space-y-8">
          {children}
        </div>
      </div>

      <div className="flex items-center justify-between pt-6 px-6 py-4 bg-surface-container-low/30 border border-outline-low rounded-sm">
        <span className="text-[10px] text-muted-foreground/40 uppercase tracking-widest font-bold">Confidential Operational Data</span>
        <div className="flex gap-4 items-center">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-operational-cyan animate-pulse shadow-[0_0_8px_rgba(var(--primary-rgb),0.6)]" />
            <span className="text-[9px] text-operational-cyan/60 font-black uppercase tracking-tighter">Secure Connection</span>
          </div>
        </div>
      </div>
    </div>
  );
}

