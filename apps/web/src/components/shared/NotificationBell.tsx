'use client';

import * as React from 'react';
import { useLocale } from 'next-intl';
import { Bell, Check, Loader2 } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import { type NotificationLog } from '@/types/notifications';
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from '@/features/notifications/hooks/useNotifications';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

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

export function NotificationBell() {
  const locale = useLocale();
  const router = useRouter();
  const isAr = locale === 'ar';

  const { data: notifications = [], isLoading } = useNotifications();
  const markReadMutation = useMarkNotificationRead();
  const markAllReadMutation = useMarkAllNotificationsRead();

  const unreadNotifications = React.useMemo(() => {
    return notifications.filter((n) => !n.isRead);
  }, [notifications]);

  const latestNotifications = React.useMemo(() => {
    // Show only the latest 10 notifications
    return [...notifications]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);
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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="relative p-2.5 text-muted-foreground/60 hover:text-operational-cyan hover:bg-operational-cyan/10 rounded-xl transition-all active:scale-95 group focus:outline-none"
          aria-label={isAr ? 'الإشعارات' : 'Notifications'}
        >
          <Bell className="w-5 h-5 group-hover:scale-105 transition-transform" />
          {unreadNotifications.length > 0 && (
            <span
              className="absolute top-1.5 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-status-warning px-1 text-[10px] font-bold text-white border border-surface-container-lowest"
              dir="ltr"
            >
              {unreadNotifications.length}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align={isAr ? 'start' : 'end'}
        className="w-80 md:w-96 rounded-2xl bg-surface-container-lowest p-2 border border-surface-variant/10 shadow-xl"
      >
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-body-md font-bold text-foreground">
            {isAr ? 'الإشعارات' : 'Notifications'}
          </span>
          {unreadNotifications.length > 0 && (
            <button
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
              className="flex items-center gap-1 text-label-xs font-semibold text-operational-cyan hover:text-operational-cyan/80 transition-colors disabled:opacity-50"
            >
              {markAllReadMutation.isPending ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              {isAr ? 'تحديد الكل كمقروء' : 'Mark all read'}
            </button>
          )}
        </div>

        <DropdownMenuSeparator className="bg-surface-variant/10" />

        <div className="max-h-[350px] overflow-y-auto py-1 space-y-1">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground/60 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-operational-cyan" />
              <span className="text-label-xs">{isAr ? 'جاري التحميل...' : 'Loading...'}</span>
            </div>
          ) : latestNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground/60 px-4">
              <span className="text-label-sm font-semibold">
                {isAr ? 'لا توجد إشعارات' : 'No notifications'}
              </span>
              <span className="text-label-xs opacity-75 mt-1">
                {isAr
                  ? 'ستظهر هنا إشعارات الموافقات والمستندات الجديدة'
                  : 'Updates on approvals and transactions will appear here'}
              </span>
            </div>
          ) : (
            latestNotifications.map((notif) => (
              <DropdownMenuItem
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className={`flex flex-col items-start gap-1 p-3 rounded-xl transition-all cursor-pointer ${
                  notif.isRead
                    ? 'hover:bg-surface-container-low/40'
                    : 'bg-operational-cyan/5 hover:bg-operational-cyan/10 border-s-4 border-operational-cyan'
                }`}
              >
                <div className="flex w-full items-start justify-between gap-2">
                  <span
                    className={`text-body-sm leading-snug text-start flex-1 ${
                      notif.isRead ? 'text-foreground/80' : 'text-foreground font-semibold'
                    }`}
                  >
                    {notif.message}
                  </span>
                  {!notif.isRead && (
                    <span className="w-2 h-2 rounded-full bg-operational-cyan mt-1.5 shrink-0" />
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground/60 font-medium">
                  {formatRelativeTime(notif.createdAt, locale)}
                </span>
              </DropdownMenuItem>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
