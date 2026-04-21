'use client';

import { type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

interface Props {
  title: string;
  backHref: string;
  children: ReactNode;
  isSaving: boolean;
  onSubmit: () => void;
}

export function MasterDataFormLayout({ title, backHref, children, isSaving, onSubmit }: Props) {
  const t = useTranslations('masterData.common');
  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <Link href={backHref}>
          <Button variant="ghost" size="icon" aria-label={t('cancel')}>
            <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">{title}</h1>
      </div>

      <div className="bg-surface-1 border border-surface-2 rounded-xl p-6 flex flex-col gap-4">
        {children}
      </div>

      <div className="flex gap-3 justify-end">
        <Link href={backHref}>
          <Button variant="outline" type="button">{t('cancel')}</Button>
        </Link>
        <Button onClick={onSubmit} disabled={isSaving}>
          {isSaving ? t('saving') : t('save')}
        </Button>
      </div>
    </div>
  );
}
