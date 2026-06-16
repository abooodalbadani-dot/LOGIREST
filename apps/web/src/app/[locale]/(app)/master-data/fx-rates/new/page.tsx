import { getTranslations, setRequestLocale } from 'next-intl/server';
import { FXRateFormClient } from '../FXRateFormClient';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
 const { locale } = await params;
 const t = await getTranslations({ locale, namespace: 'master_data.fx_rates' });
 return {
  title: `${t('create_title')} | Otantik مطاعم`
 };
}

export default async function NewFXRatePage(props: { params: Promise<{ locale: string }> }) {
 const params = await props.params;
 setRequestLocale(params.locale);
 const t = await getTranslations({ locale: params.locale, namespace: 'master_data.fx_rates' });

 return (
  <FXRateFormClient 
   id={null} 
   locale={params.locale}
   createTitle={t('create_title')} 
   editTitle={t('edit_title')} 
  />
 );
}
