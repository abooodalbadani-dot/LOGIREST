import { setRequestLocale, getTranslations } from 'next-intl/server';
import { AdjustmentListClient } from './AdjustmentListClient';

export default async function AdjustmentsPage(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;
  setRequestLocale(params.locale);
  const t = await getTranslations('operations.adjustment');

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
      </div>
      <AdjustmentListClient />
    </div>
  );
}
