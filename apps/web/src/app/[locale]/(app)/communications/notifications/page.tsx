import { getTranslations, setRequestLocale } from 'next-intl/server';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { NotificationsClient } from './NotificationsClient';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
 const { locale } = await params;
 const t = await getTranslations({ locale, namespace: 'notifications' });
 return {
 title: `${t('title')} | Otantik مطاعم`,
 description: 'System notifications and alerts hub',
 };
}

export default async function NotificationsPage(props: { params: Promise<{ locale: string }> }) {
 const { locale } = await props.params;
 setRequestLocale(locale);

 return (
 <ProtectedRoute requiredAction="view" requiredResource="inventory">
  <NotificationsClient locale={locale as 'ar' | 'en'} />
 </ProtectedRoute>
 );
}
