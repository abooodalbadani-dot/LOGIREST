'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

export default function PermissionDenied() {
  const t = useTranslations('common');
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh]">
      <div className="bg-surface-1 border border-surface-3 p-8 rounded-lg shadow-lg flex flex-col items-center max-w-md w-full text-center">
        <div className="w-16 h-16 bg-neon-red/10 rounded-full flex items-center justify-center mb-6">
          <svg className="w-8 h-8 text-neon-red" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-on-surface mb-2">{t('permission_denied')}</h2>
        <p className="text-on-surface-muted mb-8">{t('permission_denied_body')}</p>
        <button
          onClick={() => router.back()}
          className="bg-surface-3 hover:bg-surface-2 text-on-surface px-6 py-2 rounded transition-colors"
        >
          &larr; {t('back')}
        </button>
      </div>
    </div>
  );
}
