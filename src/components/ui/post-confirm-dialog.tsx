"use client"

import * as React from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { AlertTriangle } from "lucide-react"

export interface PostConfirmDialogProps {
  title?: string;
  description?: string;
  trigger?: React.ReactNode;
  onConfirm: () => void;
  confirmText?: string;
  cancelText?: string;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  isDestructive?: boolean;
}

export function PostConfirmDialog({
  title = "Confirm Action",
  description = "This action is irreversible. The document will be locked and posted to the ledger permanently.",
  trigger,
  onConfirm,
  confirmText = "Post Document",
  cancelText = "Cancel",
  isOpen,
  onOpenChange,
  isDestructive = false,
}: PostConfirmDialogProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      {trigger && <AlertDialogTrigger>{trigger}</AlertDialogTrigger>}
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader className="flex flex-col items-center text-center">
          <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-full ${isDestructive ? 'bg-neon-error/20' : 'bg-neon-amber/20'}`}>
            <AlertTriangle className={`h-6 w-6 ${isDestructive ? 'text-neon-error' : 'text-neon-amber'}`} />
          </div>
          <AlertDialogTitle className="text-xl font-bold">{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-center text-muted-foreground pt-2">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-4 sm:justify-center flex-col sm:flex-row gap-3">
          <AlertDialogCancel className="w-full sm:w-auto h-11 bg-surface-3 hover:bg-surface-4 border-transparent text-foreground">
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={onConfirm} 
            className={`w-full sm:w-auto h-11 ${
              isDestructive 
                ? 'bg-neon-error text-black hover:bg-neon-error/90 shadow-[0_0_15px_rgba(255,180,171,0.5)]' 
                : 'bg-brand-primary text-black hover:bg-brand-primary/90 shadow-[0_0_15px_rgba(58,190,255,0.5)]'
            }`}
          >
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
