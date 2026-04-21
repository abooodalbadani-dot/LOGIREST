import { setRequestLocale, getTranslations } from 'next-intl/server';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { UserListClient } from './UserListClient';

export default async function UsersPage(props: { params: Promise<{ locale: string }> }) {
  const { locale } = await props.params;
  setRequestLocale(locale);
  const t = await getTranslations('admin');

  return (
    <ProtectedRoute requiredAction="view" requiredResource="admin">
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold text-on-surface">{t('users')}</h1>
        <UserListClient />
      </div>
    </ProtectedRoute>
  );
}