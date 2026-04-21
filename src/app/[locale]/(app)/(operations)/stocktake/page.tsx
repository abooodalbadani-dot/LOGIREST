import { getTranslations } from 'next-intl/server';
import { PageHeader } from '@/components/shared/PageHeader';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { StocktakeListClient } from './StocktakeListClient';

export default async function StocktakeListPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string; page?: string; warehouse_id?: string }>;
}) {
  const { locale } = await params;
  const { status, page, warehouse_id } = await searchParams;
  const t = await getTranslations('operations.stocktake');
  const tCommon = await getTranslations('common');

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: tCommon('sidebar.dashboard'), href: `/${locale}/dashboard` },
          { label: t('title') },
        ]}
      />
      <PageHeader title={t('title')} />
      <StocktakeListClient
        initialStatus={status}
        initialPage={Number(page ?? 1)}
        initialWarehouseId={warehouse_id}
        locale={locale as 'ar' | 'en'}
      />
    </div>
  );
}
