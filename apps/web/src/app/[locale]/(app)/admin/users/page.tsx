import { setRequestLocale, getTranslations } from 'next-intl/server';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { UserListClient } from './UserListClient';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Link } from '@/i18n/navigation';

export default async function UsersPage(props: { params: Promise<{ locale: string }> }) {
  const { locale } = await props.params;
  setRequestLocale(locale);
  const t = await getTranslations('admin.users');

  return (
    <ProtectedRoute requiredResource="admin" requiredAction="view">
      <div className="p-8 max-w-[1600px] mx-auto space-y-10">
        <PageHeader 
          title={t('title') || 'Access Management'} 
          description={t('description') || 'Authorized identity registry and operational scoping'} 
          actions={
            <ProtectedRoute requiredAction="create" requiredResource="admin">
              <Link href="/admin/users/new">
                <Button className="h-11 px-8 bg-cyan-600 hover:bg-cyan-500 text-white text-label-xs font-semibold uppercase rounded-sm transition-all shadow-lg shadow-cyan-900/20">
                  <Plus className="w-3.5 h-3.5 me-2" />
                  {t('create_user')}
                </Button>
              </Link>
            </ProtectedRoute>
          }
        />
        <UserListClient locale={locale} />
      </div>
    </ProtectedRoute>
  );
}
