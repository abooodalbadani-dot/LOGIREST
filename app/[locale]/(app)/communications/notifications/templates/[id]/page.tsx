import { setRequestLocale, getTranslations } from 'next-intl/server';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { TemplateEditorClient } from './TemplateEditorClient';

export default async function NotificationTemplateDetailPage(props: {
 params: Promise<{ locale: string; id: string }>;
}) {
 const { locale, id } = await props.params;
 setRequestLocale(locale);
 const t = await getTranslations('notifications');

 return (
 <ProtectedRoute requiredAction="view" requiredResource="admin">
 <TemplateEditorClient id={id} title={t('templates')} locale={locale} />
 </ProtectedRoute>
 );
}
