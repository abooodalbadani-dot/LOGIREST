'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

export default function PermissionDenied() {
  const t = useTranslations('common');
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh]">
      <div className="bg-surface-container-lowest border border-transparent p-8 rounded-xl flex flex-col items-center max-w-md w-full text-center">
        <div className="w-16 h-16 bg-status-error/10 rounded-full flex items-center justify-center mb-6">
          <svg className="w-8 h-8 text-status-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">{t('permission_denied')}</h2>
        <p className="text-muted-foreground mb-8">{t('permission_denied_body')}</p>
        <button
          onClick={() => router.back()}
          className="bg-surface-container-highest hover:bg-surface-container-high text-foreground px-6 py-2 rounded-xl transition-colors flex items-center gap-2 border border-transparent focus:border-operational-cyan outline-none"
        >
          <ArrowLeft className="w-4 h-4 rtl:rotate-180" /> {t('back')}
        </button>
      </div>
    </div>
  );
}
