import { setRequestLocale, getTranslations } from 'next-intl/server';
import { UoMFormClient } from '../UoMFormClient';

export default async function NewUoMPage(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;
  setRequestLocale(params.locale);
  const t = await getTranslations('masterData.uom');

  return (
    <UoMFormClient
      id={null}
      createTitle={t('create_title')}
      editTitle={t('edit_title')}
      locale={params.locale}
    />
  );
}
