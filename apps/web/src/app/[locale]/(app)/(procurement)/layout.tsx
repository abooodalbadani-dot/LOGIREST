'use client';

import * as React from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { Loader2 } from 'lucide-react';
import { EmptyScopeState } from '@/components/ui/EmptyScopeState';

export default function ProcurementLayout({
 children,
}: {
 children: React.ReactNode;
}) {
 const { user, activeScope, isLoading } = useAuth();

 if (isLoading) {
  return (
   <div className="flex h-screen items-center justify-center">
    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
   </div>
  );
 }

 if (!user) {
  return null;
 }

 // Ensure warehouse context is resolved before rendering procurement pages
 if (!activeScope?.warehouseId) {
  return (
   <div className="flex-1 w-full min-w-0 flex flex-col items-center justify-center min-h-[60vh] py-12">
    <EmptyScopeState 
     context="warehouse"
     title="يرجى تحديد المستودع أولاً"
     description="لعرض بيانات المشتريات، يجب عليك اختيار المستودع أو الفرع النشط من القائمة العلوية."
     buttonText="اختيار المستودع الآن"
    />
   </div>
  );
 }

 return <>{children}</>;
}
