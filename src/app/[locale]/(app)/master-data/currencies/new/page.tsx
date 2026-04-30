import { setRequestLocale, getTranslations } from 'next-intl/server';
import { CurrencyFormClient } from '../CurrencyFormClient';

export default async function NewCurrencyPage(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;
  setRequestLocale(params.locale);
  const t = await getTranslations('master_data.currencies');
  
  return (
    <CurrencyFormClient
      id={null}
      createTitle={t('create_title')}
      editTitle={t('edit_title')}
      locale={params.locale}
    />
  );
}
