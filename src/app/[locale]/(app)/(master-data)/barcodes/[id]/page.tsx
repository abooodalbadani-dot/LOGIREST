import { setRequestLocale, getTranslations } from 'next-intl/server';
import { BarcodeFormClient } from '../BarcodeFormClient';

export default async function BarcodeDetailPage(props: { params: Promise<{ locale: string; id: string }> }) {
  const params = await props.params;
  setRequestLocale(params.locale);
  const t = await getTranslations('masterData.barcodes');
  return (
    <BarcodeFormClient
      id={params.id === 'new' ? null : params.id}
      createTitle={t('create_title')}
      editTitle={t('edit_title')}
    />
  );
}
