import { EmailOutboxClient } from './EmailOutboxClient';
import { PageHeader } from '@/components/shared/PageHeader';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import ProtectedRoute from '@/components/shared/ProtectedRoute';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'notifications' });
  return {
    title: `${t('outbox')} | LogiRest`,
    description: 'Track sent emails and notification history',
  };
}

export default async function EmailOutboxPage(props: { params: Promise<{ locale: string }> }) {
  const { locale } = await props.params;
  setRequestLocale(locale);
  const t = await getTranslations('notifications');

  return (
    <ProtectedRoute requiredAction="view" requiredResource="admin">
      <div className="flex flex-col gap-6">
        <PageHeader 
          title={t('outbox')} 
          description="Track sent emails and notification history"
        />
        <EmailOutboxClient />
      </div>
    </ProtectedRoute>
  );
}