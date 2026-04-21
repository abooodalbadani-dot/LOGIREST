import { setRequestLocale, getTranslations } from 'next-intl/server';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { RolesViewerClient } from './RolesViewerClient';

export default async function RolesPage(props: { params: Promise<{ locale: string }> }) {
  const { locale } = await props.params;
  setRequestLocale(locale);
  const t = await getTranslations('admin');

  return (
    <ProtectedRoute requiredAction="view" requiredResource="admin">
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold text-on-surface">{t('roles')}</h1>
        <RolesViewerClient />
      </div>
    </ProtectedRoute>
  );
}