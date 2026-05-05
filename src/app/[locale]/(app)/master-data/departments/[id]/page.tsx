import { setRequestLocale, getTranslations } from 'next-intl/server';
import { DepartmentFormClient } from '../DepartmentFormClient';

export default async function DepartmentDetailPage(props: { params: Promise<{ locale: string; id: string }> }) {
 const params = await props.params;
 setRequestLocale(params.locale);
 const t = await getTranslations('master_data.departments');
 return (
 <DepartmentFormClient
 id={params.id === 'new' ? null : params.id}
 locale={params.locale}
 createTitle={t('create_title')}
 editTitle={t('edit_title')}
 />
 );
}
