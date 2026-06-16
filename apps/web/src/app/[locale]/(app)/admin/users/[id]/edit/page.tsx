import { setRequestLocale, getTranslations } from 'next-intl/server';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { UserFormClient } from '../UserFormClient';

export default async function EditUserPage(props: {
 params: Promise<{ locale: string; id: string }>;
}) {
 const { locale, id } = await props.params;
 setRequestLocale(locale);
 const t = await getTranslations('admin.users');

 return (
  <ProtectedRoute requiredResource="admin" requiredAction="edit">
   <UserFormClient
    id={id}
    createTitle={t('create_title')}
    editTitle={t('edit_title')}
    locale={locale}
    isReadOnly={false}
   />
  </ProtectedRoute>
 );
}
