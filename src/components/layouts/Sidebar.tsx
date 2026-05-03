'use client';
import { Link } from '@/i18n/navigation';
import { usePathname } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { usePermission } from '@/hooks/usePermission';
import { cn } from '@/lib/utils';
import { X, LucideIcon } from 'lucide-react';
import { navigationMap, NavItem } from '@/lib/navigationMap';

interface SidebarProps {
  onClose?: () => void;
}

export function Sidebar({ onClose }: SidebarProps) {
  const pathname = usePathname();
  const t = useTranslations('common.sidebar');

  return (
    <aside className="w-full bg-surface-container-low flex flex-col h-full border-e border-outline-low/5">
      <div className="p-4 flex items-center justify-between md:hidden mb-2">
        <span className="font-bold text-operational-cyan">LogiRest</span>
        <button onClick={onClose} className="p-1 hover:bg-surface-container-high rounded-lg transition-colors">
          <X className="w-5 h-5 text-muted-foreground/60" />
        </button>
      </div>

      <nav className="flex-1 py-4 flex flex-col gap-6 px-3 overflow-y-auto custom-scrollbar">
        {navigationMap.map((group) => {
          return (
            <div key={group.key} className="flex flex-col gap-1">
              {group.titleKey && (
                <div className="px-4 mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/40 text-start block">
                    {t(group.titleKey)}
                  </span>
                </div>
              )}
              <div className="flex flex-col gap-1">
                {group.items.map((item) => (
                  <SidebarLink key={item.key} item={item} pathname={pathname} t={t} onClick={onClose} />
                ))}
              </div>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}

function SidebarLink({ item, pathname, t, onClick }: { item: NavItem, pathname: string, t: (key: string) => string, onClick?: () => void }) {
  const canView = usePermission('view', item.resource);
  
  if (!canView) return null;
  
  const isDashboard = item.key === 'dashboard';
  // With next-intl Link, we don't manually prepend locale, but pathname still has it.
  // However, createNavigation's usePathname usually returns the relative path.
  // Let's check if we should use usePathname from @/i18n/navigation.
  const isActive = isDashboard 
    ? pathname === item.href 
    : pathname.startsWith(item.href);

  const Icon = item.icon;
  
  return (
    <Link 
      href={item.href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-4 py-2 rounded-xl text-sm leading-6 font-semibold uppercase transition-all duration-200 relative group",
        isActive
          ? "bg-primary text-white shadow-md shadow-primary/20"
          : "text-muted-foreground/60 hover:text-foreground hover:bg-surface-container-high"
      )}
    >
      <Icon className={cn(
        "w-4 h-4 shrink-0 transition-transform duration-200",
        isActive ? 'scale-110' : 'group-hover:scale-110'
      )} />
      
      <span className="flex-1 truncate text-start whitespace-nowrap overflow-hidden text-ellipsis">
        {t(item.labelKey) ?? item.labelKey}
      </span>

      {isActive && (
        <div className="w-1 h-4 rounded-full bg-white/40" />
      )}
    </Link>
  );
}
