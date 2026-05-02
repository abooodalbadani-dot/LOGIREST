import { BranchListClient } from './BranchListClient';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { PageHeader } from '@/components/shared/PageHeader';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
 const { locale } = await params;
 const t = await getTranslations({ locale, namespace: 'masterData.branches' });
 return {
 title: `${t('title')} | LogiRest`,
 description: 'Branch and retail location management',
 };
}

export default async function BranchesPage(props: { params: Promise<{ locale: string }> }) {
 const params = await props.params;
 setRequestLocale(params.locale);
 const t = await getTranslations('masterData.branches');

 return (
 <ProtectedRoute requiredAction="view" requiredResource="master_data">
 <div className="flex flex-col gap-6">
 <PageHeader 
 title={t('title')} 
 description="Branch and retail location management"
 />
 <BranchListClient locale={params.locale} />
 </div>
 </ProtectedRoute>
 );
}
