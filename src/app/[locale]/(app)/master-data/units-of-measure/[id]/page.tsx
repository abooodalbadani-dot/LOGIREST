import { setRequestLocale, getTranslations } from 'next-intl/server';
import { UoMFormClient } from '../UoMFormClient';

export default async function UoMDetailPage(props: { params: Promise<{ locale: string; id: string }> }) {
  const params = await props.params;
  setRequestLocale(params.locale);
  const t = await getTranslations('masterData.uom');
  return (
    <UoMFormClient
      id={params.id === 'new' ? null : params.id}
      createTitle={t('create_title')}
      editTitle={t('edit_title')}
      locale={params.locale}
    />
  );
}
