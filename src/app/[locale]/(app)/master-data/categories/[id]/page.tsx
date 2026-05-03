import { setRequestLocale, getTranslations } from 'next-intl/server';
import { CategoryFormClient } from '../CategoryFormClient';

export default async function CategoryDetailPage(props: { params: Promise<{ locale: string; id: string }> }) {
 const params = await props.params;
 setRequestLocale(params.locale);
 const t = await getTranslations('master_data.categories');
 return (
 <CategoryFormClient
 id={params.id === 'new' ? null : params.id}
 locale={params.locale}
 createTitle={t('create_title')}
 editTitle={t('edit_title')}
 />
 );
}
