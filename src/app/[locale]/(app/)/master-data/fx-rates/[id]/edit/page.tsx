import { setRequestLocale, getTranslations } from 'next-intl/server';
import { FXRateFormClient } from '../FXRateFormClient';

export default async function FXRateEditPage(props: { params: Promise<{ locale: string; id: string }> }) {
  const params = await props.params;
  setRequestLocale(params.locale);
  const t = await getTranslations('master_data.fx_rates');
  return (
    <FXRateFormClient
      id={params.id}
      createTitle={t('create')}
      editTitle={t('edit')}
      locale={params.locale}
    />
  );
}
