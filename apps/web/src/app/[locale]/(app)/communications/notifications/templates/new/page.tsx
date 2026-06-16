import { setRequestLocale } from 'next-intl/server';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { TemplateCreateClient } from './TemplateCreateClient';

export default async function NotificationTemplateCreatePage(props: {
 params: Promise<{ locale: string }>;
}) {
 const { locale } = await props.params;
 setRequestLocale(locale);

 return (
  <ProtectedRoute requiredAction="create" requiredResource="admin">
   <TemplateCreateClient locale={locale} />
  </ProtectedRoute>
 );
}
