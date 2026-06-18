'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useUnsavedChanges } from './UnsavedChangesProvider';

interface UnsavedChangesDialogProps {
  open: boolean;
  onClose: () => void;
  pendingNavigation: { href: string; options?: unknown } | null;
}

export const UnsavedChangesDialog: React.FC<UnsavedChangesDialogProps> = ({
  open,
  onClose,
  pendingNavigation,
}) => {
  const t = useTranslations('common.unsaved_changes');
  const { confirmNavigation } = useUnsavedChanges();
  const router = useRouter();

  const handleLeave = () => {
    if (!pendingNavigation) {
      confirmNavigation();
      return;
    }

    if (pendingNavigation.href === 'BACK') {
      confirmNavigation();
      window.history.back();
    } else {
      confirmNavigation();
      router.push(pendingNavigation.href, pendingNavigation.options as Parameters<typeof router.push>[1]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="w-[95vw] sm:w-[500px] sm:max-w-[500px] p-6 bg-card text-card-foreground rounded-lg border border-border shadow-xl">
        <DialogHeader className="flex flex-col gap-2 text-start">
          <DialogTitle className="text-lg font-bold text-foreground">{t('title')}</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground text-balance">{t('description')}</DialogDescription>
        </DialogHeader>

        {/* حاوية الأزرار المحصنة ضد الـ RTL Bug */}
        {/* استخدام sm:space-x-0 لتعطيل مسافات Shadcn الافتراضية والاعتماد على gap-3 */}
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 w-full mt-8 sm:space-x-0">
          <Button variant="outline" className="w-full sm:w-auto shrink-0" onClick={onClose}>
            {t('stay')}
          </Button>
          <Button variant="destructive" className="w-full sm:w-auto shrink-0" onClick={handleLeave}>
            {t('leave')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
