import { setRequestLocale, getTranslations } from 'next-intl/server';
import { CategoryFormClient } from '../CategoryFormClient';

export default async function CategoryDetailPage(props: { params: Promise<{ locale: string; id: string }> }) {
  const params = await props.params;
  setRequestLocale(params.locale);
  const t = await getTranslations('masterData.categories');
  return <CategoryFormClient id={params.id === 'new' ? null : params.id} createTitle={t('create_title')} editTitle={t('edit_title')} />;
}
