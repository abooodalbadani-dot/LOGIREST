import { setRequestLocale } from 'next-intl/server';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { RoleDetailClient } from '../RoleDetailClient';

export default async function RoleEditPage(props: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await props.params;
  setRequestLocale(locale);
  
  return (
    <ProtectedRoute requiredAction="edit" requiredResource="admin">
      <RoleDetailClient locale={locale} id={id} isReadOnly={false} />
    </ProtectedRoute>
  );
}
