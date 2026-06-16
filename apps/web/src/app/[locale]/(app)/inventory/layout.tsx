'use client';

import { usePathname, Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Layers, Database, History, Scan, Loader2 } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { EmptyScopeState } from '@/components/ui/EmptyScopeState';

export default function InventoryLayout({
 children,
}: {
 children: React.ReactNode;
}) {
 const pathname = usePathname();
 const t = useTranslations('operational.inventory.tabs');
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

 // Ensure warehouse context is resolved before rendering inventory pages
 if (!activeScope?.warehouseId) {
 return (
  <div className="flex flex-col items-center justify-center min-h-[60vh] py-12 w-full">
   <div className="w-full max-w-md">
    <EmptyScopeState 
     context="warehouse"
     title="يرجى تحديد المستودع أولاً"
     description="لعرض بيانات المخزون أو الأصناف، يجب عليك اختيار المستودع أو الفرع النشط من القائمة العلوية."
     buttonText="اختيار المستودع الآن"
    />
   </div>
  </div>
 );
 }

 const tabs = [
 { name: t('balance'), href: `/inventory/balance`, icon: Layers },
 { name: t('lots'), href: `/inventory/lots`, icon: Database },
 { name: t('movements'), href: `/inventory/movements`, icon: History },
 { name: t('scan'), href: `/inventory/scan-mode`, icon: Scan },
 ];

 return (
 <div className="flex flex-col gap-6">
 <div className="flex items-center gap-1 p-1 bg-card border border-border shadow-sm border border-outline-low rounded-2xl w-fit">
 {tabs.map((tab) => {
 const isActive = pathname === tab.href;
 const Icon = tab.icon;
 return (
 <Link
 key={tab.href}
 href={tab.href}
 className={cn(
 "flex items-center gap-2.5 px-6 py-2.5 rounded-xl text-label-xs font-semibold uppercase transition-all duration-[140ms] ease-out",
 isActive
 ? "bg-primary text-white shadow-sm shadow-primary/20"
 : "text-muted-foreground/60 hover:text-foreground hover:bg-surface-container-high"
 )}
 >
 <Icon className={cn("w-3.5 h-3.5", isActive ? "animate-pulse" : "")} />
 {tab.name}
 </Link>
 );
 })}
 </div>
 {children}
 </div>
 );
}
