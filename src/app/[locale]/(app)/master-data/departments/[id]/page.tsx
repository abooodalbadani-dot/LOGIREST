import { setRequestLocale, getTranslations } from 'next-intl/server';
import { DepartmentFormClient } from '../DepartmentFormClient';

export default async function DepartmentDetailPage(props: { params: Promise<{ locale: string; id: string }> }) {
 const params = await props.params;
 setRequestLocale(params.locale);
 const t = await getTranslations('masterData.departments');
 return (
 <DepartmentFormClient
 id={params.id === 'new' ? null : params.id}
 createTitle={t('create_title')}
 editTitle={t('edit_title')}
 locale={params.locale}
 />
 );
}
