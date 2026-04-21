import { setRequestLocale, getTranslations } from 'next-intl/server';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { EmailOutboxClient } from './EmailOutboxClient';

export default async function EmailOutboxPage(props: { params: Promise<{ locale: string }> }) {
  const { locale } = await props.params;
  setRequestLocale(locale);
  const t = await getTranslations('notifications');

  return (
    <ProtectedRoute requiredAction="view" requiredResource="admin">
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold text-on-surface">{t('outbox')}</h1>
        <EmailOutboxClient />
      </div>
    </ProtectedRoute>
  );
}