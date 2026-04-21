import { setRequestLocale, getTranslations } from 'next-intl/server';
import { BranchListClient } from './BranchListClient';

export default async function BranchesPage(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;
  setRequestLocale(params.locale);
  const t = await getTranslations('masterData.branches');

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">{t('title')}</h1>
      <BranchListClient />
    </div>
  );
}
