import { setRequestLocale, getTranslations } from 'next-intl/server';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { TemplateListClient } from './TemplateListClient';

export default async function NotificationTemplatesPage(props: { params: Promise<{ locale: string }> }) {
  const { locale } = await props.params;
  setRequestLocale(locale);
  const t = await getTranslations('notifications');

  return (
    <ProtectedRoute requiredAction="view" requiredResource="admin">
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold text-on-surface">{t('templates')}</h1>
        <TemplateListClient />
      </div>
    </ProtectedRoute>
  );
}