import { setRequestLocale, getTranslations } from 'next-intl/server';
import { WarehouseFormClient } from '../WarehouseFormClient';

export default async function WarehouseDetailPage(props: { params: Promise<{ locale: string; id: string }> }) {
  const params = await props.params;
  setRequestLocale(params.locale);
  const t = await getTranslations('masterData.warehouses');
  return (
    <WarehouseFormClient
      id={params.id === 'new' ? null : params.id}
      createTitle={t('create_title')}
      editTitle={t('edit_title')}
    />
  );
}
