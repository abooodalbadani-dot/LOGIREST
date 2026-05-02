'use client';

import { useSession } from '@/hooks/useSession';
import { useLocale } from '@/hooks/useLocale';
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
 const { t } = useLocale(); // Uses general translations, would use real mapped keys

 return (
 <AlertDialog open={isSessionTimeout}>
 <AlertDialogContent>
 <AlertDialogHeader>
 <AlertDialogTitle>انتهت صلاحية الجلسة</AlertDialogTitle>
 <AlertDialogDescription>
 انتهت صلاحية جلستك. يرجى تسجيل الدخول مرة أخرى للمتابعة.
 </AlertDialogDescription>
 </AlertDialogHeader>
 <AlertDialogFooter>
 <Button onClick={resolveSessionTimeout} className="w-full">
 الانتقال لتسجيل الدخول
 </Button>
 </AlertDialogFooter>
 </AlertDialogContent>
 </AlertDialog>
 );
}
