import { WarehouseFormClient } from '../WarehouseFormClient';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import ProtectedRoute from '@/components/shared/ProtectedRoute';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
 const { locale } = await params;
 const t = await getTranslations({ locale, namespace: 'master_data.warehouses' });
 return {
 title: `${t('create_title')} | Otantik مطاعم`,
 };
}

export default async function NewWarehousePage(props: { params: Promise<{ locale: string }> }) {
 const params = await props.params;
 setRequestLocale(params.locale);
 const t = await getTranslations({ locale: params.locale, namespace: 'master_data.warehouses' });

 return (
  <ProtectedRoute requiredAction="create" requiredResource="master_data_warehouses">
   <WarehouseFormClient 
    id={null} 
    createTitle={t('create_title')} 
    editTitle={t('edit_title')} 
    viewTitle={t('view_title')}
    isReadOnly={false}
   />
  </ProtectedRoute>
 );
}
