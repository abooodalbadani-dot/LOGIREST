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
 <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-full ${isDestructive ? 'bg-status-error/20' : 'bg-status-warning/20'}`}>
 <AlertTriangle className={`h-6 w-6 ${isDestructive ? 'text-status-error' : 'text-status-warning'}`} />
 </div>
 <AlertDialogTitle className="text-title-lg font-bold">{title}</AlertDialogTitle>
 <AlertDialogDescription className="text-center text-muted-foreground pt-2">
 {description}
 </AlertDialogDescription>
 </AlertDialogHeader>
 <AlertDialogFooter className="mt-4 sm:justify-center flex-col sm:flex-row gap-3">
 <AlertDialogCancel className="w-full sm:w-auto h-11 bg-surface-container-highest hover:bg-surface-container-high border-transparent text-foreground rounded-sm">
 {cancelText}
 </AlertDialogCancel>
 <AlertDialogAction 
 onClick={onConfirm} 
 className={`w-full sm:w-auto h-11 rounded-sm transition-all ${ isDestructive ? 'bg-status-error text-white hover:bg-status-error/90 shadow-[0_0_15px_rgba(var(--status-error-rgb),0.5)]' : 'bg-operational-cyan text-white hover:bg-operational-cyan/90 shadow-[0_0_15px_rgba(var(--operational-cyan-rgb),0.5)]' }`}
 >
 {confirmText}
 </AlertDialogAction>
 </AlertDialogFooter>
 </AlertDialogContent>
 </AlertDialog>
 )
}
