'use client';

import { type ReactNode } from 'react';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { FormFooter } from '@/components/shared/FormFooter';
import { useRouter } from 'next/navigation';

import { type ResourceType, type ActionType } from '@/types/rbac';

interface Props {
  title: string;
  backHref: string;
  children: ReactNode;
  isSaving?: boolean;
  onSubmit?: () => void;
  resource?: ResourceType;
  saveAction?: ActionType;
  hideSave?: boolean;
  saveDisabled?: boolean;
  isDirty?: boolean;
  isValid?: boolean;
}

export function MasterDataFormLayout({ 
  title, 
  backHref, 
  children, 
  isSaving = false, 
  onSubmit = () => {},
  resource = 'master_data',
  saveAction = 'create',
  hideSave = false,
  saveDisabled = false,
  isDirty = true,
  isValid = true
}: Props) {
  const router = useRouter();

  return (
    <div className="p-8 max-w-[1000px] mx-auto pb-32 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-12">
        <div className="flex items-center gap-6">
          <Link href={backHref}>
            <Button 
              variant="ghost" 
              size="icon" 
              className="w-12 h-12 rounded-xl bg-surface-container-low hover:bg-operational-cyan/10 text-muted-foreground hover:text-operational-cyan transition-all group border-none"
            >
              <ArrowLeft className="w-5 h-5 rtl:rotate-180 group-hover:-translate-x-1 rtl:group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
          <div className="space-y-1">
            <h1 className="text-headline-lg font-semibold text-foreground uppercase">{title}</h1>
            <p className="text-label-xs text-muted-foreground/40 uppercase font-semibold">Asset Configuration & Metadata</p>
          </div>
        </div>

        {/* Top buttons removed for FormFooter standardization */}
      </div>

      <div className="bg-surface-container-lowest rounded-[2rem] p-10 relative overflow-hidden">
        {/* Subtle grid pattern background */}
        <div className="absolute inset-0 opacity-[0.01] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
        
        <div className="relative z-10 max-w-5xl mx-auto space-y-8">
          {children}
        </div>
      </div>

      <div className="flex items-center justify-between px-10 py-6 bg-surface-container-low/40 rounded-[2rem]">
        <span className="text-label-xs text-muted-foreground/40 uppercase font-semibold">Confidential Operational Data</span>
        <div className="flex gap-4 items-center">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-operational-cyan animate-pulse" />
            <span className="text-label-xxs text-operational-cyan/60 font-semibold uppercase">Secure Connection</span>
          </div>
        </div>
      </div>

      {!hideSave && (
        <PermissionGate action={saveAction} resource={resource}>
          <FormFooter 
            onCancel={() => router.push(backHref)}
            onSubmit={onSubmit}
            isSaving={isSaving}
            isDirty={isDirty}
            isValid={isValid && !saveDisabled}
          />
        </PermissionGate>
      )}
    </div>
  );
}
