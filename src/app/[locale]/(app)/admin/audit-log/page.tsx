import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { AuditLogClient } from './AuditLogClient';
import { PageHeader } from '@/components/shared/PageHeader';
import { getTranslations, setRequestLocale } from 'next-intl/server';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'admin' });
  return {
    title: `${t('audit_log')} | LogiRest`,
    description: 'System-wide audit trail and security event logging',
  };
}

export default async function AuditLogPage(props: { params: Promise<{ locale: string }> }) {
  const { locale } = await props.params;
  setRequestLocale(locale);
  const t = await getTranslations('admin');

  return (
    <ProtectedRoute requiredAction="view" requiredResource="admin">
      <div className="flex flex-col gap-6">
        <PageHeader 
          title={t('audit_log')} 
          description="System-wide audit trail and security event logging"
        />
        <AuditLogClient />
      </div>
    </ProtectedRoute>
  );
}