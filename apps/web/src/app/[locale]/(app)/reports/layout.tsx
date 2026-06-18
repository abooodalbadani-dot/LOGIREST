'use client';

import { useAuth } from '@/providers/AuthProvider';
import { EmptyScopeState } from '@/components/ui/EmptyScopeState';
import { Loader2 } from 'lucide-react';

export default function ReportsLayout({
 children,
}: {
 children: React.ReactNode;
}) {
 const { user, activeScope, isLoading } = useAuth();

 if (isLoading) {
  return (
   <div className="flex h-[60vh] items-center justify-center">
    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
   </div>
  );
 }

 if (!user) {
  return null;
 }

 // Reports generally require a warehouse to be selected to show meaningful data
 if (!activeScope?.warehouseId) {
  return (
   <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] py-12 w-full min-w-0 shrink-0">
    <EmptyScopeState 
     context="warehouse"
    />
   </div>
  );
 }

 return <div className="w-full">{children}</div>;
}
