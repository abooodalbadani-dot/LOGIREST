'use client';
import { useTranslations } from 'next-intl';
import { useState, useEffect } from 'react';

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
  const [isRtl, setIsRtl] = useState(true);

  useEffect(() => {
    setIsRtl(document.documentElement.dir === 'rtl');
  }, []);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="bg-surface-1 rounded-lg border border-surface-3 w-full max-w-md p-6 shadow-xl relative m-4">
        {!isLoading && (
          <button 
            className="absolute top-4 text-on-surface-muted hover:text-on-surface"
            onClick={() => onOpenChange(false)}
            style={{ [isRtl ? 'left' : 'right']: '1rem' }}
          >
            ✕
          </button>
        )}
        
        <h2 className="text-xl font-bold text-on-surface mb-2">{title}</h2>
        <p className="text-sm text-on-surface-muted mb-4">{description}</p>
        
        <div className="bg-neon-amber/10 border border-neon-amber/30 rounded p-3 text-neon-amber text-sm mb-4">
          {warningText}
          <div className="mt-1 font-medium">{t('posting_irreversible')}</div>
        </div>

        {children && <div className="mb-4">{children}</div>}

        {requiresTextConfirmation && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-on-surface mb-1">
              {isRtl ? `اكتب "${requiredWord}" للتأكيد:` : `Type "${requiredWord}" to confirm:`}
            </label>
            <input 
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              disabled={isLoading}
              className="w-full bg-surface-2 border border-surface-3 rounded px-3 py-2 text-on-surface outline-none focus:border-neon-cyan"
            />
          </div>
        )}

        <div className="flex justify-end gap-2 mt-6">
          {!isLoading && (
            <button 
              onClick={() => onOpenChange(false)}
              className="px-4 py-2 bg-surface-3 text-on-surface rounded font-medium hover:bg-surface-4 transition-colors"
            >
              {t('cancel')}
            </button>
          )}
          <button 
            onClick={onConfirm}
            disabled={isConfirmDisabled}
            className="px-4 py-2 bg-neon-cyan text-surface-0 rounded font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 hover:bg-neon-cyan/80"
          >
            {isLoading && (
              <svg className="animate-spin h-4 w-4 text-surface-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            {t('confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}
