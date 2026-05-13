import { setRequestLocale, getTranslations } from 'next-intl/server';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { UserFormClient } from '../[id]/UserFormClient';

export default async function CreateUserPage(props: { params: Promise<{ locale: string }> }) {
  const { locale } = await props.params;
  setRequestLocale(locale);
  const t = await getTranslations('admin.users');

  return (
    <ProtectedRoute requiredResource="admin" requiredAction="create">
      <UserFormClient
        id={null}
        createTitle={t('create_title')}
        editTitle={t('edit_title')}
        locale={locale}
        isReadOnly={false}
      />
    </ProtectedRoute>
  );
}
