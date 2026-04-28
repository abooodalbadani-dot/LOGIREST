'use client';
import { useTranslations } from 'next-intl';
import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';


interface PostConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  warningText: string;
  requiresTextConfirmation?: boolean;
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
  children?: React.ReactNode;
}

export function PostConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  warningText,
  requiresTextConfirmation,
  isLoading,
  onConfirm,
  children
}: PostConfirmDialogProps) {
  const t = useTranslations('common');
  const [confirmText, setConfirmText] = useState('');
  const [isRtl, setIsRtl] = useState(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.dir === 'rtl';
    }
    return true;
  });


  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) {
        onOpenChange(false);
      }
    };
    if (open) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, isLoading, onOpenChange]);

  const requiredWord = isRtl ? 'تأكيد' : 'CONFIRM';
  const isConfirmDisabled = isLoading || (requiresTextConfirmation && confirmText !== requiredWord);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-surface-container-low rounded-2xl border border-outline-low w-full max-w-md p-6 shadow-2xl relative m-4 animate-in zoom-in-95 duration-200">
        {!isLoading && (
          <button 
            className="absolute top-4 text-muted-foreground/60 hover:text-muted-foreground transition-colors"
            onClick={() => onOpenChange(false)}
            style={{ [isRtl ? 'left' : 'right']: '1rem' }}
          >
            ✕
          </button>
        )}
        
        <h2 className="text-xl font-bold text-foreground mb-2">{title}</h2>
        <p className="text-sm text-muted-foreground mb-4">{description}</p>
        
        <div className="bg-status-warning/10 border border-status-warning/20 rounded-xl p-4 text-status-warning text-sm mb-4">
          <div className="font-bold flex items-center gap-2 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-status-warning animate-pulse" />
            {warningText}
          </div>
          <div className="opacity-80">{t('posting_irreversible')}</div>
        </div>

        {children && <div className="mb-4">{children}</div>}

        {requiresTextConfirmation && (
          <div className="mb-4">
            <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1.5 ms-1">
              {isRtl ? `اكتب "${requiredWord}" للتأكيد:` : `Type "${requiredWord}" to confirm:`}
            </label>
            <input 
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              disabled={isLoading}
              className="w-full bg-surface-container border border-outline-low rounded-xl px-4 py-2.5 text-foreground outline-none focus:border-operational-cyan focus:ring-1 focus:ring-operational-cyan/50 transition-all shadow-inner"
            />
          </div>
        )}

        <div className="flex justify-end gap-3 mt-8">
          {!isLoading && (
            <button 
              onClick={() => onOpenChange(false)}
              className="px-5 py-2.5 bg-surface-container-high text-foreground rounded-xl font-bold hover:bg-surface-container-highest transition-all active:scale-[0.98]"
            >
              {t('cancel')}
            </button>
          )}
          <button 
            onClick={onConfirm}
            disabled={isConfirmDisabled}
            className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 hover:shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)] hover:brightness-110 active:scale-[0.98]"
          >
            {isLoading && (
              <Loader2 className="animate-spin h-4 w-4" />
            )}
            {t('confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}
