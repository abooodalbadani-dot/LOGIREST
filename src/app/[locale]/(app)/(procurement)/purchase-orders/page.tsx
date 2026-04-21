import { setRequestLocale, getTranslations } from 'next-intl/server';
import { POListClient } from './POListClient';

export default async function PurchaseOrdersPage(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;
  setRequestLocale(params.locale);
  const t = await getTranslations('procurement.po');

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
      </div>
      <POListClient />
    </div>
  );
}
