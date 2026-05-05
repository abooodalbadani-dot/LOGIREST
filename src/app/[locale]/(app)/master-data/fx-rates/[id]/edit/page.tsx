import { getTranslations, setRequestLocale } from 'next-intl/server';
import { FXRateFormClient } from '../../FXRateFormClient';
 
export async function generateMetadata({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { id } = await params;
  return {
    title: `Edit FX Rate ${id} | LogiRest`
  };
}
 
export default async function EditFXRatePage(props: { params: Promise<{ locale: string; id: string }> }) {
  const params = await props.params;
  setRequestLocale(params.locale);
  const t = await getTranslations({ locale: params.locale, namespace: 'master_data.fx_rates' });
 
  return (
    <FXRateFormClient 
      id={params.id} 
      locale={params.locale}
      createTitle={t('create_title')} 
      editTitle={t('edit_title')} 
    />
  );
}
