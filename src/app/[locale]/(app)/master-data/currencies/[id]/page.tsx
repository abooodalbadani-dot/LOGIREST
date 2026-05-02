import { setRequestLocale, getTranslations } from 'next-intl/server';
import { CurrencyFormClient } from '../CurrencyFormClient';

export default async function CurrencyDetailPage(props: { params: Promise<{ locale: string; id: string }> }) {
 const params = await props.params;
 setRequestLocale(params.locale);
 const t = await getTranslations('master_data.currencies');
 return (
 <CurrencyFormClient
 id={params.id === 'new' ? null : params.id}
 createTitle={t('create_title')}
 editTitle={t('edit_title')}
 locale={params.locale}
 />
 );
}
