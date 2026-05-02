import { setRequestLocale, getTranslations } from 'next-intl/server';
import { ItemFormClient } from '../ItemFormClient';

export default async function ItemDetailPage(props: { params: Promise<{ locale: string; id: string }> }) {
 const params = await props.params;
 setRequestLocale(params.locale);
 const t = await getTranslations('masterData.items');
 return (
 <ItemFormClient
 id={params.id === 'new' ? null : params.id}
 createTitle={t('create_title')}
 editTitle={t('edit_title')}
 locale={params.locale}
 />
 );
}
