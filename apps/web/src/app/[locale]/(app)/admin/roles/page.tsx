import { RolesListClient } from './RolesListClient';
import { PageHeader } from '@/components/shared/PageHeader';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'admin' });
  return {
    title: `${t('roles')} | LogiRest`,
    description: 'User access control and permission management',
  };
}

export default async function RolesPage(props: { params: Promise<{ locale: string }> }) {
  const { locale } = await props.params;
  setRequestLocale(locale);
  const t = await getTranslations('admin');

  return (
    <ProtectedRoute requiredAction="view" requiredResource="admin">
      <div className="flex flex-col gap-10 p-8 max-w-[1600px] mx-auto">
        <PageHeader 
          title={t('roles')} 
          description="User access control and permission management"
          actions={
            <Link href="/admin/roles/matrix">
              <Button className="h-11 px-8 bg-surface-container-high hover:bg-surface-container-highest text-cyan-500 text-label-xs font-semibold uppercase rounded-sm transition-all border border-cyan-500/30">
                View Permission Matrix
              </Button>
            </Link>
          }
        />
        <RolesListClient locale={locale} />
      </div>
    </ProtectedRoute>
  );
}
