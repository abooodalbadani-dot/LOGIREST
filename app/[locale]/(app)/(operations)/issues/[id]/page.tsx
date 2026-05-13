import { IssueDetailClient } from './IssueDetailClient';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import ProtectedRoute from '@/components/shared/ProtectedRoute';

export async function generateMetadata({ params }: { params: Promise<{ locale: string, id: string }> }) {
 const { locale, id } = await params;
 const t = await getTranslations({ locale, namespace: 'operations.issue' });
 const isNew = id === 'new';
 return {
 title: `${isNew ? t('create_new') : t('detail_title')} | LogiRest`,
 description: isNew ? t('new_description') : t('detail_title'),
 };
}

export default async function IssueDetailPage(props: { params: Promise<{ locale: string; id: string }> }) {
 const params = await props.params;
 setRequestLocale(params.locale);
 
 const isNew = params.id === 'new';

 return (
 <ProtectedRoute requiredAction={isNew ? "create" : "view"} requiredResource="issue">
    <IssueDetailClient id={params.id} locale={params.locale as 'ar' | 'en'} />
 </ProtectedRoute>
 );
}
