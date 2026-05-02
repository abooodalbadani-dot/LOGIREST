import { setRequestLocale, getTranslations } from 'next-intl/server';
import { BranchFormClient } from '../BranchFormClient';

export default async function BranchDetailPage(props: { params: Promise<{ locale: string; id: string }> }) {
 const params = await props.params;
 setRequestLocale(params.locale);
 const t = await getTranslations('masterData.branches');

 return (
 <BranchFormClient
 id={params.id === 'new' ? null : params.id}
 createTitle={t('create_title')}
 editTitle={t('edit_title')}
 locale={params.locale}
 />
 );
}
