import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { AuditLogsClient } from './AuditLogsClient';
import { getTranslations, setRequestLocale } from 'next-intl/server';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
 const { locale } = await params;
 const t = await getTranslations({ locale, namespace: 'admin' });
 return {
 title: `${t('audit_logs.title')} | Otantik مطاعم`,
 description: t('audit_logs.description'),
 };
}

export default async function AuditLogsPage(props: { params: Promise<{ locale: string }> }) {
 const { locale } = await props.params;
 setRequestLocale(locale);
 const t = await getTranslations('admin');

 return (
 <ProtectedRoute requiredAction="view" requiredResource="audit_log">
 <div className="flex flex-col gap-6 min-w-0">
 
 <AuditLogsClient />
 </div>
 </ProtectedRoute>
 );
}
