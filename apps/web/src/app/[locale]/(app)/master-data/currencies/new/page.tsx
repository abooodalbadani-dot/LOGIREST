import { setRequestLocale, getTranslations } from 'next-intl/server';
import { CurrencyFormClient } from '../CurrencyFormClient';
import ProtectedRoute from '@/components/shared/ProtectedRoute';

export async function generateMetadata(props: { params: Promise<{ locale: string }> }) {
    const params = await props.params;
    const t = await getTranslations({ locale: params.locale, namespace: 'master_data.currencies' });
    return { title: `${t('create_title')} | OTANTIK RESTAURANT` };
}

export default async function NewCurrencyPage(props: { params: Promise<{ locale: string }> }) {
    const params = await props.params;
    setRequestLocale(params.locale);
    const t = await getTranslations('master_data.currencies');

    return (
        <ProtectedRoute action="create" resource="master_data_currencies">
            <CurrencyFormClient
                id={null}
                createTitle={t('create_title')}
                editTitle={t('edit_title')}
                viewTitle={t('view_title')}
                isReadOnly={false}
            />
        </ProtectedRoute>
    );
}
