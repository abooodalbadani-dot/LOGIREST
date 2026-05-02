import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { AuditLogsClient } from './AuditLogsClient';
import { PageHeader } from '@/components/shared/PageHeader';
import { getTranslations, setRequestLocale } from 'next-intl/server';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
 const { locale } = await params;
 await getTranslations({ locale, namespace: 'admin' });
 return {
 title: `Audit Logs | LogiRest`,
 description: 'System-wide audit trail and security event logging',
 };
}

export default async function AuditLogsPage(props: { params: Promise<{ locale: string }> }) {
 const { locale } = await props.params;
 setRequestLocale(locale);
 await getTranslations('admin');

 return (
 <ProtectedRoute requiredAction="view" requiredResource="audit_log">
 <div className="flex flex-col gap-6">
 <PageHeader 
 title="Audit Logs" 
 description="System-wide audit trail and security event logging"
 />
 <AuditLogsClient />
 </div>
 </ProtectedRoute>
 );
}