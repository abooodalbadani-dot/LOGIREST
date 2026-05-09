import { getMessages, setRequestLocale } from 'next-intl/server';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { ProfileFormClient } from './ProfileFormClient';

export default async function RestaurantProfilePage(props: { params: Promise<{ locale: string }> }) {
 const { locale } = await props.params;
 setRequestLocale(locale);
 // Ensure messages are loaded for the client
 await getMessages();
 
 return (
 <ProtectedRoute requiredAction="view" requiredResource="admin">
 <ProfileFormClient locale={locale} />
 </ProtectedRoute>
 );
}
