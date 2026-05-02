import { getTranslations, setRequestLocale } from 'next-intl/server';
import { TransferListClient } from './TransferListClient';
import { PageHeader } from '@/components/shared/PageHeader';
import ProtectedRoute from '@/components/shared/ProtectedRoute';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
 const { locale } = await params;
 const t = await getTranslations({ locale, namespace: 'operations.transfer' });
 return {
 title: `${t('title')} | LogiRest`,
 description: 'Internal warehouse transfers and movement tracking',
 };
}

export default async function TransfersPage(props: { params: Promise<{ locale: string }> }) {
 const params = await props.params;
 setRequestLocale(params.locale);
 const t = await getTranslations('operations.transfer');

 return (
 <ProtectedRoute requiredAction="view" requiredResource="transfer">
 <div className="flex flex-col gap-6">
 <PageHeader 
 title={t('title')} 
 description="Internal warehouse transfers and movement tracking"
 />
 <TransferListClient />
 </div>
 </ProtectedRoute>
 );
}
