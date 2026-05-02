import { getMessages, setRequestLocale } from 'next-intl/server';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { RoleDetailClient } from './RoleDetailClient';

export default async function RoleDetailPage(props: { params: Promise<{ locale: string; id: string }> }) {
 const { locale, id } = await props.params;
 setRequestLocale(locale);
 const messages = await getMessages();
 
 return (
 <ProtectedRoute requiredAction="view" requiredResource="admin">
 <RoleDetailClient locale={locale} id={id} />
 </ProtectedRoute>
 );
}
