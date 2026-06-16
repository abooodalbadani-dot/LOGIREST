'use client';

import * as React from 'react';
import { 
 Dialog, 
 DialogContent, 
 DialogHeader, 
 DialogTitle, 
 DialogDescription,
 DialogFooter
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface GlassModalProps {
 isOpen: boolean;
 onClose: () => void;
 title?: React.ReactNode;
 description?: React.ReactNode;
 children: React.ReactNode;
 footer?: React.ReactNode;
 maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | 'full';
 className?: string;
}

const maxWidthMap = {
 sm: 'max-w-sm',
 md: 'max-w-md',
 lg: 'max-w-lg',
 xl: 'max-w-xl',
 '2xl': 'max-w-2xl',
 '3xl': 'max-w-3xl',
 '4xl': 'max-w-4xl',
 '5xl': 'max-w-5xl',
 full: 'max-w-full',
};

export function GlassModal({
 isOpen,
 onClose,
 title,
 description,
 children,
 footer,
 maxWidth = 'lg',
 className,
}: GlassModalProps) {
 return (
  <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
   <DialogContent 
    className={cn(
     "bg-card border border-border shadow-sm/80 backdrop-blur-[12px] border-none ambient-shadow p-0 gap-0 overflow-hidden",
     maxWidthMap[maxWidth],
     className
    )}
   >
    {(title || description) && (
     <DialogHeader className="p-6 pb-2">
      {title && <DialogTitle className="text-title-lg font-bold">{title}</DialogTitle>}
      {description && <DialogDescription className="text-body-md text-muted-foreground/70">{description}</DialogDescription>}
     </DialogHeader>
    )}
    
    <div className="p-6">
     {children}
    </div>

    {footer && (
     <DialogFooter className="bg-card border border-border shadow-sm/40 backdrop-blur-md p-6 border-t">
      {footer}
     </DialogFooter>
    )}
   </DialogContent>
  </Dialog>
 );
}
