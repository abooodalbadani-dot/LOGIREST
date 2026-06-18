import { EmailOutboxClient } from './EmailOutboxClient';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import ProtectedRoute from '@/components/shared/ProtectedRoute';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
 const { locale } = await params;
 const t = await getTranslations({ locale, namespace: 'notifications' });
 return {
 title: `${t('outbox')} | Otantik مطاعم`,
 description: 'Track sent emails and notification history',
 };
}

export default async function EmailOutboxPage(props: { params: Promise<{ locale: string }> }) {
 const { locale } = await props.params;
 setRequestLocale(locale);
 const t = await getTranslations('notifications');

 return (
 <ProtectedRoute requiredAction="view" requiredResource="admin">
 <div className="flex flex-col gap-6 min-w-0">
 
 <EmailOutboxClient />
 </div>
 </ProtectedRoute>
 );
}
