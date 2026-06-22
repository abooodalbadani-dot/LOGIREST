'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Loader2, AlertTriangle, Trash2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
 AlertDialog,
 AlertDialogCancel,
 AlertDialogContent,
 AlertDialogDescription,
 AlertDialogFooter,
 AlertDialogHeader,
 AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from '@/components/ui/button';

interface ConfirmationDialogProps {
 open: boolean;
 onOpenChange: (open: boolean) => void;
 title: string;
 description: string;
 onConfirm: () => void | Promise<void>;
 isLoading?: boolean;
 variant?: 'destructive' | 'warning' | 'default';
 confirmText?: string;
 cancelText?: string;
 icon?: 'delete' | 'reject' | 'warning';
}

/**
 * Standardized Confirmation Dialog for destructive mutations.
 * Follows LogiRest "Safety First" principle.
 */
export function ConfirmationDialog({
 open,
 onOpenChange,
 title,
 description,
 onConfirm,
 isLoading = false,
 variant = 'warning',
 confirmText,
 cancelText,
 icon = 'warning',
}: ConfirmationDialogProps) {
 const t = useTranslations('common');

 const handleConfirm = async (e: React.MouseEvent) => {
  e.preventDefault();
  await onConfirm();
  onOpenChange(false);
 };

 const Icon = icon === 'delete' ? Trash2 : icon === 'reject' ? XCircle : AlertTriangle;

 return (
  <AlertDialog open={open} onOpenChange={onOpenChange}>
   <AlertDialogContent className="sm:max-w-[600px] w-[calc(100vw_-_2rem)] border-none ambient-shadow p-10 bg-card border border-border shadow-sm rounded-[2rem]">
    <AlertDialogHeader className="space-y-4">
     <div className={cn(
      "w-12 h-12 rounded-2xl flex items-center justify-center mb-2",
      variant === 'destructive' ? "bg-status-error/10 text-status-error" : 
      variant === 'warning' ? "bg-status-warning/10 text-status-warning" : 
      "bg-operational-cyan/10 text-operational-cyan"
     )}>
      <Icon className="w-6 h-6" />
     </div>
     <div className="space-y-2">
      <AlertDialogTitle className="text-headline-sm font-bold uppercase tracking-tight">
       {title}
      </AlertDialogTitle>
      <AlertDialogDescription className="text-label-sm font-medium text-muted-foreground/60 leading-relaxed uppercase">
       {description}
      </AlertDialogDescription>
     </div>
    </AlertDialogHeader>

    <AlertDialogFooter className="gap-4 mt-8">
     <AlertDialogCancel 
      className="flex-1 h-12 rounded-xl border-none bg-surface-container-high hover:bg-surface-container-highest text-label-xs font-bold uppercase transition-all"
      disabled={isLoading}
     >
      {cancelText || t('actions.cancel')}
     </AlertDialogCancel>
     <Button
      onClick={handleConfirm}
      disabled={isLoading}
      className={cn(
       "flex-1 h-12 rounded-xl text-label-xs font-bold uppercase transition-all shadow-sm active:scale-95",
       variant === 'destructive' ? "bg-status-error hover:bg-status-error/90 text-white shadow-status-error/20" : 
       variant === 'warning' ? "bg-status-warning hover:bg-status-warning/90 text-white shadow-status-warning/20" : 
       "bg-operational-cyan hover:bg-operational-cyan/90 text-white shadow-operational-cyan/20"
      )}
     >
      {isLoading ? (
       <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
       confirmText || t('actions.confirm')
      )}
     </Button>
    </AlertDialogFooter>
   </AlertDialogContent>
  </AlertDialog>
 );
}
