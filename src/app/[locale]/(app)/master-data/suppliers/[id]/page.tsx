import { setRequestLocale, getTranslations } from 'next-intl/server';
import { SupplierFormClient } from '../SupplierFormClient';

export default async function SupplierDetailPage(props: { params: Promise<{ locale: string; id: string }> }) {
 const params = await props.params;
 setRequestLocale(params.locale);
 const t = await getTranslations('master_data.suppliers');
 return (
 <SupplierFormClient
 id={params.id === 'new' ? null : params.id}
 createTitle={t('create_title')}
 editTitle={t('edit_title')}
 locale={params.locale}
 />
 );
}
