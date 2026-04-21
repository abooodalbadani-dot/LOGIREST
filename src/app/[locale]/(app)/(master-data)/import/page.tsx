import { setRequestLocale, getTranslations } from 'next-intl/server';
import { ImportWizard } from '@/features/master-data/components/ImportWizard';

export default async function ImportPage(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;
  setRequestLocale(params.locale);
  const t = await getTranslations('masterData.import');
  
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">{t('title')}</h1>
      <ImportWizard />
    </div>
  );
}
