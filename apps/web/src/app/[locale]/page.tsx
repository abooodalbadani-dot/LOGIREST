import { redirect } from '@/i18n/navigation';
import { cookies } from 'next/headers';

export default async function LocaleRootPage({ params }: { params: Promise<{ locale: string }> }) {
 const { locale } = await params;
 const cookieStore = await cookies();
 const token = cookieStore.get('logirest_token')?.value;

<<<<<<< HEAD:src/app/[locale]/page.tsx
 if (token) {
   redirect({ href: '/dashboard', locale });
 }
 
   redirect({ href: '/login', locale });
=======
  if (token) {
    redirect({ href: '/dashboard', locale });
  }
  
  redirect({ href: '/login', locale });
>>>>>>> 002-frontend-baseline:apps/web/src/app/[locale]/page.tsx
}
