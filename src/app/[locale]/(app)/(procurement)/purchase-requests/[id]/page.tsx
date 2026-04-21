import { setRequestLocale, getTranslations } from 'next-intl/server';
import { PRDetailClient } from './PRDetailClient';

export default async function PurchaseRequestDetailPage(props: { params: Promise<{ locale: string, id: string }> }) {
  const params = await props.params;
  setRequestLocale(params.locale);
  const t = await getTranslations('procurement.pr');

  const isNew = params.id === 'new';

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{isNew ? t('create_new') : t('detail_title')}</h1>
      </div>
      <PRDetailClient id={isNew ? null : params.id} />
    </div>
  );
}
