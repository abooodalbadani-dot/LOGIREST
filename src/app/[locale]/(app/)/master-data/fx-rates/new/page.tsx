import { useTranslations } from 'next-intl';
import { FXRateFormClient } from '../FXRateFormClient';
import { getTranslations } from 'next-intl/server';

export default async function NewFXRatePage({
  params: { locale }
}: {
  params: { locale: string }
}) {
  const t = await getTranslations({ locale, namespace: 'master_data.fx_rates' });

  return (
    <FXRateFormClient 
      id={null} 
      createTitle={t('create')} 
      editTitle={t('edit')} 
      locale={locale} 
    />
  );
}
