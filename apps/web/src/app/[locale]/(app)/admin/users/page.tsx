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
   <div className="flex-1 w-full max-w-full overflow-x-hidden flex flex-col gap-6 p-8 mx-auto xl:max-w-[1600px]">
    <PageHeader 
     title={t('title') || 'Access Management'} 
     subtitle={t('description') || 'Authorized identity registry and operational scoping'} 
     children={
      <ProtectedRoute requiredAction="create" requiredResource="admin">
       <Link href="/admin/users/new">
        <Button className="h-11 px-8 bg-cyan-600 hover:bg-cyan-500 text-white text-label-xs font-semibold uppercase rounded-sm transition-all shadow-sm shadow-cyan-900/20">
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
