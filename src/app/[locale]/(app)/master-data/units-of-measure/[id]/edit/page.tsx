import { setRequestLocale, getTranslations } from 'next-intl/server';
import { UoMFormClient } from '../../UoMFormClient';
import ProtectedRoute from '@/components/shared/ProtectedRoute';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
 const { locale } = await params;
 const t = await getTranslations({ locale, namespace: 'master_data.uoms' });
 return {
 title: `${t('edit_title')} | LogiRest`,
 };
}

export default async function EditUoMPage(props: { params: Promise<{ locale: string; id: string }> }) {
 const params = await props.params;
 setRequestLocale(params.locale);
 const t = await getTranslations({ locale: params.locale, namespace: 'master_data.uoms' });

 return (
 <ProtectedRoute requiredAction="edit" requiredResource="master_data_units_of_measure">
 <UoMFormClient
 id={params.id}
 createTitle={t('create_title')}
 editTitle={t('edit_title')}
 locale={params.locale}
 />
 </ProtectedRoute>
 );
}
