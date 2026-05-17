'use client';

import { useEffect, useState } from 'react';
import { conflictStore, ConflictInfo } from '@/core/network/ConflictStore';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function ConflictDialog() {
  const t = useTranslations('common.conflict');
  const [conflict, setConflict] = useState<ConflictInfo | null>(null);

  useEffect(() => {
    const unsubscribe = conflictStore.subscribe((c) => setConflict(c));
    return () => { unsubscribe(); };
  }, []);

  const handleRefresh = () => {
    conflictStore.setConflict(null);
    window.location.reload();
  };

  return (
    <Dialog open={!!conflict} onOpenChange={(open) => !open && conflictStore.setConflict(null)}>
      <DialogContent className="sm:max-width-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-2 text-destructive mb-2">
            <AlertCircle className="h-6 w-6" />
            <DialogTitle className="text-xl font-bold">{t('title')}</DialogTitle>
          </div>
          <DialogDescription className="text-base text-foreground font-medium">
            {t('description')}
          </DialogDescription>
        </DialogHeader>
        
        {conflict && (
          <div className="bg-muted/50 p-4 rounded-lg text-sm space-y-3 border border-border mt-2">
            <p className="font-semibold text-foreground flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-muted-foreground" />
              {t('server_version')}
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <div className="text-muted-foreground">{t('updated_by')}:</div>
              <div className="text-foreground font-medium">{conflict.updatedBy || 'System'}</div>
              <div className="text-muted-foreground">{t('updated_at')}:</div>
              <div className="text-foreground font-medium">
                {conflict.updatedAt ? new Date(conflict.updatedAt).toLocaleString() : 'Recently'}
              </div>
            </div>
          </div>
        )}

        <div className="text-sm text-muted-foreground mt-4 italic">
          {t('stay_disable_hint')}
        </div>

        <DialogFooter className="mt-6 flex flex-col gap-2">
          <Button 
            variant="destructive" 
            className="w-full flex gap-2 items-center justify-center h-12 text-lg font-bold shadow-lg shadow-destructive/20"
            onClick={handleRefresh}
          >
            <RefreshCw className="h-5 w-5 animate-spin-slow" />
            {t('actions.reload')}
          </Button>
          <Button
            variant="ghost"
            className="w-full h-10 text-muted-foreground"
            onClick={() => conflictStore.setConflict(null)}
          >
            {t('actions.cancel')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
