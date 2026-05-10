'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from '@/components/ui/alert-dialog';

export function SessionTimeoutModal() {
 const isSessionTimeout = false;
 const resolveSessionTimeout = () => {};
 const t = useTranslations('auth.session_timeout');

 return (
 <AlertDialog open={isSessionTimeout}>
 <AlertDialogContent>
 <AlertDialogHeader>
 <AlertDialogTitle>{t('title')}</AlertDialogTitle>
 <AlertDialogDescription>
 {t('description')}
 </AlertDialogDescription>
 </AlertDialogHeader>
 <AlertDialogFooter>
 <Button onClick={resolveSessionTimeout} className="w-full">
 {t('login_button')}
 </Button>
 </AlertDialogFooter>
 </AlertDialogContent>
 </AlertDialog>
 );
}
