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
  pendingNavigation: { href: string; options?: any } | null;
}

export const UnsavedChangesDialog: React.FC<UnsavedChangesDialogProps> = ({
  open,
  onClose,
  pendingNavigation,
}) => {
  const t = useTranslations('common.unsavedChanges');
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
      router.push(pendingNavigation.href, pendingNavigation.options);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="secondary" onClick={onClose}>
            {t('stay')}
          </Button>
          <Button variant="destructive" onClick={handleLeave}>
            {t('leave')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
