import { getMessages, setRequestLocale } from 'next-intl/server';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { SettingsClient } from './SettingsClient';

export default async function SettingsPage(props: { params: Promise<{ locale: string }> }) {
 const { locale } = await props.params;
 setRequestLocale(locale);
 const messages = await getMessages();
 
 return (
 <ProtectedRoute requiredAction="view" requiredResource="admin">
 <SettingsClient locale={locale} />
 </ProtectedRoute>
 );
}
