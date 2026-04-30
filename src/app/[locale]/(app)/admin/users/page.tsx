import { setRequestLocale, getTranslations } from 'next-intl/server';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { UserListClient } from './UserListClient';

export default async function UsersPage(props: { params: Promise<{ locale: string }> }) {
  const { locale } = await props.params;
  setRequestLocale(locale);
  const t = await getTranslations('admin');

  return (
    <ProtectedRoute roles={["ADMIN"]}>
      <UserListClient locale={locale} />
    </ProtectedRoute>
  );
}