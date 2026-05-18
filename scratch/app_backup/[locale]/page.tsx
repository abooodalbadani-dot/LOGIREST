import { redirect } from '@/i18n/navigation';
import { cookies } from 'next/headers';

export default async function LocaleRootPage({ params }: { params: Promise<{ locale: string }> }) {
 const { locale } = await params;
 const cookieStore = await cookies();
 const token = cookieStore.get('logirest_token')?.value;

  if (token) {
    redirect({ href: '/dashboard', locale });
  }
  
  redirect({ href: '/login', locale });
}
