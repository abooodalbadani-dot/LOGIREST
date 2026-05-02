import { setRequestLocale, getTranslations } from 'next-intl/server';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { TemplateListClient } from './TemplateListClient';

export default async function NotificationTemplatesPage(props: { params: Promise<{ locale: string }> }) {
 const { locale } = await props.params;
 setRequestLocale(locale);
 const t = await getTranslations('notifications');

 return (
 <ProtectedRoute requiredAction="view" requiredResource="admin">
 <TemplateListClient locale={locale} />
 </ProtectedRoute>
 );
}