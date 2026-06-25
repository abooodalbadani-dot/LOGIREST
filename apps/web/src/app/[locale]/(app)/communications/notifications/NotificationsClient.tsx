'use client';

import * as React from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { BellOff, Check, Loader2, MailOpen, Mail } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import { type NotificationLog } from '@/types/notifications';
import {
 useNotifications,
 useMarkNotificationRead,
 useMarkAllNotificationsRead,
} from '@/features/notifications/hooks/useNotifications';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

function formatRelativeTime(dateString: string, locale: string): string {
 const date = new Date(dateString);
 const now = new Date();
 const diffMs = now.getTime() - date.getTime();
 const diffMins = Math.floor(diffMs / 60000);
 const diffHours = Math.floor(diffMins / 60);
 const diffDays = Math.floor(diffHours / 24);

 const isAr = locale === 'ar';

 if (diffMins < 1) {
  return isAr ? 'الآن' : 'Just now';
 }
 if (diffMins < 60) {
  return isAr ? `قبل ${diffMins} دقيقة` : `${diffMins}m ago`;
 }
 if (diffHours < 24) {
  return isAr ? `قبل ${diffHours} ساعة` : `${diffHours}h ago`;
 }
 return isAr ? `قبل ${diffDays} يوم` : `${diffDays}d ago`;
}

function getDocumentRoute(docType?: string | null, docId?: string | null): string {
 if (!docType || !docId) return '#';
 switch (docType.toUpperCase()) {
  case 'PURCHASE_REQUEST':
   return `/purchase-requests/${docId}`;
  case 'PURCHASE_ORDER':
   return `/purchase-orders/${docId}`;
  case 'GOODS_RECEIVED_NOTE':
   return `/goods-received/${docId}`;
  case 'INVENTORY_ISSUE':
   return `/issues/${docId}`;
  case 'TRANSFER':
   return `/transfers/${docId}`;
  case 'ADJUSTMENT':
   return `/adjustments/${docId}`;
  case 'KITCHEN_REQUEST':
   return `/kitchen-requests/${docId}`;
  case 'STOCKTAKE':
   return `/stocktake/${docId}`;
  default:
   return '#';
 }
}

interface NotificationsClientProps {
 locale: 'ar' | 'en';
}

export function NotificationsClient({ locale }: NotificationsClientProps) {
 const t = useTranslations('notifications');
 const tCommon = useTranslations('common');
 const router = useRouter();
 const isAr = locale === 'ar';

 const { data: notifications = [], isLoading } = useNotifications();
 const markReadMutation = useMarkNotificationRead();
 const markAllReadMutation = useMarkAllNotificationsRead();

 const [activeTab, setActiveTab] = React.useState<string>('all');

 const filteredNotifications = React.useMemo(() => {
  const sorted = [...notifications].sort(
   (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  if (activeTab === 'unread') {
   return sorted.filter((n) => !n.isRead);
  }
  return sorted;
 }, [notifications, activeTab]);

 const unreadCount = React.useMemo(() => {
  return notifications.filter((n) => !n.isRead).length;
 }, [notifications]);

 const handleNotificationClick = (notif: NotificationLog) => {
  if (!notif.isRead) {
   markReadMutation.mutate(notif.id);
  }
  const route = getDocumentRoute(notif.documentType, notif.documentId);
  if (route !== '#') {
   router.push(route);
  }
 };

 return (
  <div className="flex flex-col gap-6 w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
   <PageHeader 
    title={isAr ? 'مركز' : 'NOTIFICATIONS'} 
    highlight={isAr ? 'الإشعارات' : 'CENTER'} 
    subtitle={t('notifications_page_desc')}
   />

   <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 w-full">
     <TabsList variant="default" className="w-full sm:w-auto bg-card border border-border shadow-sm rounded-xl">
      <TabsTrigger value="all" className="flex items-center gap-2">
       <span>{isAr ? 'الكل' : 'All'}</span>
       <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-muted text-muted-foreground">
        {notifications.length}
       </span>
      </TabsTrigger>
      <TabsTrigger value="unread" className="flex items-center gap-2">
       <span>{isAr ? 'غير المقروءة' : 'Unread'}</span>
       {unreadCount > 0 && (
        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-status-warning text-white animate-pulse">
         {unreadCount}
        </span>
       )}
      </TabsTrigger>
     </TabsList>

     {unreadCount > 0 && (
      <Button
       variant="ghost"
       onClick={() => markAllReadMutation.mutate()}
       isLoading={markAllReadMutation.isPending}
       className="w-full sm:w-auto text-label-xs font-semibold text-operational-cyan hover:text-operational-cyan/85 hover:bg-operational-cyan/5 transition-all rounded-xl"
      >
       <Check className="w-4 h-4 me-2 shrink-0" />
       {isAr ? 'تحديد الكل كمقروء' : 'Mark all as read'}
      </Button>
     )}
    </div>

    <TabsContent value="all" className="mt-6">
     {isLoading ? (
      <NotificationSkeleton />
     ) : filteredNotifications.length === 0 ? (
      <EmptyNotifications tab={activeTab} isAr={isAr} />
     ) : (
      <div className="bg-card border border-border/50 rounded-xl shadow-sm overflow-hidden divide-y divide-border/50">
       {filteredNotifications.map((notif) => (
        <NotificationRow
         key={notif.id}
         notif={notif}
         locale={locale}
         onClick={() => handleNotificationClick(notif)}
        />
       ))}
      </div>
     )}
    </TabsContent>

    <TabsContent value="unread" className="mt-6">
     {isLoading ? (
      <NotificationSkeleton />
     ) : filteredNotifications.length === 0 ? (
      <EmptyNotifications tab={activeTab} isAr={isAr} />
     ) : (
      <div className="bg-card border border-border/50 rounded-xl shadow-sm overflow-hidden divide-y divide-border/50">
       {filteredNotifications.map((notif) => (
        <NotificationRow
         key={notif.id}
         notif={notif}
         locale={locale}
         onClick={() => handleNotificationClick(notif)}
        />
       ))}
      </div>
     )}
    </TabsContent>
   </Tabs>
  </div>
 );
}

function NotificationRow({
 notif,
 locale,
 onClick,
}: {
 notif: NotificationLog;
 locale: string;
 onClick: () => void;
}) {
 const isAr = locale === 'ar';
 return (
  <div
   onClick={onClick}
   className={cn(
    "flex items-start gap-4 p-5 hover:bg-muted/30 cursor-pointer transition-colors duration-200 group relative",
    !notif.isRead && "bg-operational-cyan/5 dark:bg-primary-container/10 border-s-4 border-s-primary"
   )}
  >
   <div className="flex-1 min-w-0">
    <div className="flex items-start justify-between gap-4">
     <div className="flex items-start gap-3 min-w-0">
      <div className="mt-1 shrink-0">
       {notif.isRead ? (
        <MailOpen className="w-4 h-4 text-muted-foreground/45" />
       ) : (
        <Mail className="w-4 h-4 text-primary" />
       )}
      </div>
      <p
       dir="auto"
       className={cn(
        "text-body-md text-foreground leading-relaxed break-words text-start",
        !notif.isRead ? "font-bold" : "font-medium opacity-85"
       )}
      >
       {notif.message}
      </p>
     </div>
     <span className="text-[10px] font-bold text-muted-foreground/50 tracking-wider whitespace-nowrap mt-1 shrink-0 uppercase" dir="ltr">
      {formatRelativeTime(notif.createdAt, locale)}
     </span>
    </div>
   </div>
   {!notif.isRead && (
    <div className="absolute top-1/2 -translate-y-1/2 end-5 flex items-center justify-center pointer-events-none">
     <span className="h-2.5 w-2.5 rounded-full bg-primary" />
    </div>
   )}
  </div>
 );
}

function EmptyNotifications({ tab, isAr }: { tab: string; isAr: boolean }) {
 return (
  <EmptyState
   icon={<BellOff className="h-10 w-10 opacity-40 text-muted-foreground" />}
   title={
    tab === 'unread'
     ? isAr
       ? 'لا توجد إشعارات غير مقروءة'
       : "You're all caught up!"
     : isAr
       ? 'لا توجد إشعارات'
       : 'No notifications'
   }
   description={
    tab === 'unread'
     ? isAr
       ? 'لقد قمت بقراءة جميع الإشعارات الواردة لنظامك.'
       : 'All system notifications have been marked as read.'
     : isAr
       ? 'ستظهر التنبيهات والأحداث التشغيلية هنا بمجرد حدوثها.'
       : 'Operational alerts and system events will appear here once triggered.'
   }
  />
 );
}

function NotificationSkeleton() {
 return (
  <div className="bg-card border border-border/50 rounded-xl shadow-sm overflow-hidden divide-y divide-border/50">
   {[...Array(5)].map((_, i) => (
    <div key={i} className="p-5 flex items-start gap-4">
     <Skeleton className="w-4 h-4 rounded-full mt-1 shrink-0" />
     <div className="flex-1 space-y-2">
      <div className="flex justify-between items-center gap-4">
       <Skeleton className="h-4 w-3/4 rounded" />
       <Skeleton className="h-3 w-16 rounded" />
      </div>
      <Skeleton className="h-3.5 w-1/2 rounded" />
     </div>
    </div>
   ))}
  </div>
 );
}
