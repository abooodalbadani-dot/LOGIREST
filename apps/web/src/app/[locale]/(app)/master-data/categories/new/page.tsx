import { CategoryFormClient } from '../CategoryFormClient';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import ProtectedRoute from '@/components/shared/ProtectedRoute';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
 const { locale } = await params;
 const t = await getTranslations({ locale, namespace: 'master_data.categories' });
 return {
 title: `${t('create_title')} | LogiRest`,
 };
}

export default async function NewCategoryPage(props: { params: Promise<{ locale: string }> }) {
 const params = await props.params;
 setRequestLocale(params.locale);
 const t = await getTranslations({ locale: params.locale, namespace: 'master_data.categories' });

 return (
 <ProtectedRoute requiredAction="create" requiredResource="master_data_categories">
 <CategoryFormClient 
 id={null} 
 locale={params.locale} 
 createTitle={t('create_title')} 
 editTitle={t('edit_title')}
  viewTitle={t('view_title')} 
 />
 </ProtectedRoute>
 );
}
