import { getTranslations, setRequestLocale } from 'next-intl/server';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { PageHeader } from '@/components/shared/PageHeader';
import { Bell } from 'lucide-react';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
 const { locale } = await params;
 const t = await getTranslations({ locale, namespace: 'notifications' });
 return {
 title: `${t('title')} | LogiRest`,
 description: 'System notifications and alerts hub',
 };
}

export default async function NotificationsPage(props: { params: Promise<{ locale: string }> }) {
 const { locale } = await props.params;
 setRequestLocale(locale);
 const t = await getTranslations('notifications');

 return (
 <ProtectedRoute requiredAction="view" requiredResource="inventory">
 <div className="flex flex-col gap-6">
 <PageHeader
 title={t('title')}
 description="System alerts, low-stock warnings, and operational events"
 />
 <div className="flex flex-col items-center justify-center py-24 gap-4 text-muted-foreground/40">
 <Bell className="w-12 h-12 opacity-20" />
 <p className="text-body-md font-bold uppercase">{t('no_notifications')}</p>
 </div>
 </div>
 </ProtectedRoute>
 );
}
