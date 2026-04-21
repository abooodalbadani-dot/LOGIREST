import { setRequestLocale, getTranslations } from 'next-intl/server';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { ReportsHubClient } from './ReportsHubClient';

export default async function ReportsPage(props: { params: Promise<{ locale: string }> }) {
  const { locale } = await props.params;
  setRequestLocale(locale);
  const t = await getTranslations('reports');

  return (
    <ProtectedRoute requiredAction="view" requiredResource="reports">
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-bold text-on-surface">{t('title')}</h1>
        <ReportsHubClient />
      </div>
    </ProtectedRoute>
  );
}