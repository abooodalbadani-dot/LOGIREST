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
  <ProtectedRoute requiredResource="admin" requiredAction="view">
   <UserFormClient
    id={id === 'new' ? null : id}
    createTitle={t('users.create_title')}
    editTitle={t('users.edit_title')}
    locale={locale}
    isReadOnly={true}
   />
  </ProtectedRoute>
 );
}
