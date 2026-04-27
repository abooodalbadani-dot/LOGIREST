import { setRequestLocale, getTranslations } from 'next-intl/server';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { UserFormClient } from './UserFormClient';

export default async function UserDetailPage(props: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await props.params;
  setRequestLocale(locale);
  const t = await getTranslations('admin');

  return (
    <ProtectedRoute requiredAction="view" requiredResource="admin">
      <UserFormClient
        id={id === 'new' ? null : id}
        createTitle={t('create_user')}
        editTitle={t('edit_user')}
        locale={locale}
      />
    </ProtectedRoute>
  );
}