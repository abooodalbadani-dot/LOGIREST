import { RolesListClient } from './RolesListClient';
import { PageHeader } from '@/components/shared/PageHeader';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import ProtectedRoute from '@/components/shared/ProtectedRoute';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
 const { locale } = await params;
 const t = await getTranslations({ locale, namespace: 'admin' });
 return {
 title: `${t('roles')} | LogiRest`,
 description: 'User access control and permission management',
 };
}

export default async function RolesPage(props: { params: Promise<{ locale: string }> }) {
 const { locale } = await props.params;
 setRequestLocale(locale);
 const t = await getTranslations('admin');

 return (
 <ProtectedRoute requiredAction="view" requiredResource="admin">
 <div className="flex flex-col gap-6">
 <PageHeader 
 title={t('roles')} 
 description="User access control and permission management"
 />
 <div className="px-8">
 <RolesListClient locale={locale} />
 </div>
 </div>
 </ProtectedRoute>
 );
}
