import React, { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { ArrowLeft } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';

export function FormContainer({ children, className }: { children: ReactNode; className?: string }) {
 return (
  <div className={cn("w-full max-w-full flex flex-col gap-6", className)}>
   {children}
  </div>
 );
}

export function FormCard({ children, className }: { children: ReactNode; className?: string }) {
 return (
  <div className={cn("w-full bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col", className)}>
   {children}
  </div>
 );
}

export function FormHeader({ 
 title, 
 subtitle, 
 icon: Icon, 
 backHref, 
 actions,
 className 
}: { 
 title: string; 
 subtitle?: string; 
 icon?: React.ElementType; 
 backHref?: string;
 actions?: ReactNode;
 className?: string;
}) {
 return (
  <div className={cn("w-full flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-6 py-5 border-b border-border bg-card/50", className)}>
   <div className="flex items-center gap-4">
    {backHref && (
     <Link 
      href={backHref}
      className="p-2 -ms-2 hover:bg-surface-container-high rounded-full transition-colors text-muted-foreground hover:text-foreground shrink-0"
     >
      <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
     </Link>
    )}
    <div className="flex items-center gap-3">
     {Icon && <Icon className="w-5 h-5 text-muted-foreground/60" />}
     <div className="flex flex-col gap-0.5 min-w-0">
      <h2 className="text-label-lg font-bold uppercase text-foreground">{title}</h2>
      {subtitle && <p className="text-label-xs font-semibold uppercase text-muted-foreground/50">{subtitle}</p>}
     </div>
    </div>
   </div>
   {actions && (
    <div className="shrink-0 flex items-center gap-3">
     {actions}
    </div>
   )}
  </div>
 );
}

export function FormGridArea({ children, className }: { children: ReactNode; className?: string }) {
 return (
  <div className={cn("w-full grid grid-cols-1 md:grid-cols-12 gap-6 p-6", className)}>
   {children}
  </div>
 );
}

export function FormFooter({ 
 children, 
 className,
 onCancel,
 onSubmit,
 isSaving,
 isPending, // Alias for isSaving
 isLocked,
 isDirty = true,
 isValid = true,
 canSubmit = true,
 saveLabel,
 submitLabel, // Alias for saveLabel
 cancelLabel,
 actions
}: { 
 children?: ReactNode; 
 className?: string;
 onCancel?: () => void;
 onSubmit?: () => void;
 isSaving?: boolean;
 isPending?: boolean;
 isLocked?: boolean;
 isDirty?: boolean;
 isValid?: boolean;
 canSubmit?: boolean;
 saveLabel?: string;
 submitLabel?: string;
 cancelLabel?: string;
 actions?: ReactNode;
}) {
 const saving = isSaving || isPending;
 const btnLabel = saveLabel || submitLabel || 'Save';

 return (
  <div className={cn(
   "w-full flex flex-col-reverse md:flex-row items-stretch md:items-center justify-end gap-3 md:gap-4 px-4 sm:px-6 py-4 sm:pb-4 pb-8 bg-muted/30 border-t border-border mt-auto", 
   className
  )}>
   {actions}
   {onCancel && (
    <button
     type="button"
     onClick={onCancel}
     disabled={saving}
     className="w-full md:w-auto px-6 py-3 md:py-2 bg-transparent border border-gray-300 text-gray-600 font-bold rounded-md hover:bg-gray-100 hover:text-[#0B1220] transition-colors uppercase text-sm tracking-wider"
    >
     {cancelLabel ?? 'CANCEL'}
    </button>
   )}
   {onSubmit && !isLocked && (
    <Button
     type="button"
     onClick={onSubmit}
     disabled={!isDirty || !isValid || !canSubmit || saving}
     isLoading={saving}
     className="w-full md:w-auto h-12 md:h-10 bg-none bg-operational-cyan hover:bg-operational-cyan/90 shadow-sm shadow-operational-cyan/20 px-8"
    >
     {btnLabel}
    </Button>
   )}
   {children}
  </div>
 );
}
