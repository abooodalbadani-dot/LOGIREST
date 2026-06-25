'use client';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { useUserProfile } from '@/providers/UserProfileProvider';
import { useContextScope } from '@/hooks/useContextScope';
import { useRestaurantProfile } from '@/features/admin/hooks/useRestaurantProfile';
import { getMediaUrl } from '@/utils/path';
import LocaleSwitcher from '../shared/LocaleSwitcher';
import { ContextSelector } from '../shared/ContextSelector';
import { ThemeToggle } from '../shared/ThemeToggle';
import { NotificationBell } from '../shared/NotificationBell';

import { useTranslations } from 'next-intl';

import { Globe, ChevronDown, LogOut, Loader2, Menu, Search } from 'lucide-react';
import { Link } from '@/i18n/navigation';

interface TopbarProps {
  locale: string;
  onMenuClick?: () => void;
  isSidebarOpen?: boolean;
}

export function Topbar({ locale: _locale, onMenuClick, isSidebarOpen }: TopbarProps) {
  const { user, logout, activeScope } = useAuth();
  const { displayName, avatarUrl } = useUserProfile();
  const { branchName, warehouseName, isLoading } = useContextScope();
  const { data: profile } = useRestaurantProfile();

  const brandingConfig = profile?.brandingConfig;
  const logoUrl = profile?.logoUrl || profile?.logo || "/logoicon.svg";
  const restaurantName = profile?.name || 'OTANTIK';

  const isMissingDepartment = user?.role === 'KITCHEN_CHIEF' && !activeScope?.departmentId;
  const isMissingWarehouse = user?.role === 'STORE_MGR' && !activeScope?.warehouseId;
  const isScopeMissing = isMissingDepartment || isMissingWarehouse;

  const [isSelectorOpen, setIsSelectorOpen] = useState(false);

  useEffect(() => {
    const handleOpen = (e: Event) => {
      e.preventDefault();
      setIsSelectorOpen(true);
    };
    window.addEventListener('open-context-selector', handleOpen);
    return () => window.removeEventListener('open-context-selector', handleOpen);
  }, []);

  const t = useTranslations('context');
  const tc = useTranslations('common');

  return (
    <header className="min-h-[72px] py-2 bg-card border-b border-border shadow-sm flex items-center justify-between gap-2 md:gap-4 lg:gap-6 px-4 sticky top-0 z-40">
      <div className="flex items-center gap-2 md:gap-4 lg:gap-6 shrink min-w-0">
        {/* Mobile Menu Button */}
        <button
          onClick={onMenuClick}
          aria-label="Menu"
          aria-expanded={isSidebarOpen}
          className="md:hidden shrink-0 px-6 py-2.5 bg-[#0B1220] text-white font-bold rounded-lg shadow-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 sm:gap-3 md:gap-4 shrink-0 cursor-pointer select-none">
          <div className="flex items-center h-full shrink-0 w-[110px] md:w-[140px]">
            <img
              src="/Otantik%20Restaurant%20logo%20B.svg"
              alt="Otantik Corporate Identity"
              className="h-14 md:h-[70px] w-full shrink-0 object-contain cursor-pointer transition-opacity duration-200 hover:opacity-90"
            />
          </div>
        </div>

        {user && (
          <button
            onClick={() => setIsSelectorOpen(true)}
            className={`flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-1.5 rounded-xl bg-card border border-border shadow-sm hover:bg-muted transition-all group relative overflow-hidden shrink min-w-0 ${isScopeMissing ? 'ring-2 ring-status-warning ring-offset-2 animate-pulse' : ''
              }`}
          >
            {/* Subtle glow effect */}
            <div className="absolute inset-0 bg-operational-cyan/5 opacity-0 group-hover:opacity-100 transition-opacity" />

            <div className="p-1.5 bg-operational-cyan/10 rounded-sm text-operational-cyan transition-all">
              <Globe className="w-3.5 h-3.5 group-hover:rotate-12 transition-transform" />
            </div>

            <div className="flex flex-col items-start leading-tight relative z-10 shrink min-w-0">
              <span className="hidden sm:inline text-label-xs text-muted-foreground/60 uppercase font-semibold">
                {t('switch_context')}
              </span>
              <div className="flex items-center gap-1.5 shrink min-w-0">
                <span className="text-label-sm font-bold text-foreground max-w-[90px] sm:max-w-[150px] truncate" dir="ltr">
                  {isLoading ? (
                    <Loader2 className="w-3 h-3 animate-spin text-operational-cyan" />
                  ) : (
                    branchName ? `${branchName} ${warehouseName ? ` /${warehouseName}` : ''}` : t('no_selection')
                  )}
                </span>
              </div>
            </div>
            <ChevronDown className="w-3 h-3 shrink-0 text-muted-foreground/60 group-hover:text-operational-cyan transition-colors" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        <Link
          href="/search"
          className="p-1 sm:p-1.5 text-muted-foreground/60 hover:text-operational-cyan hover:bg-operational-cyan/10 rounded-xl transition-all hidden md:flex"
          title={tc('search')}
        >
          <Search className="w-5 h-5 sm:w-4 sm:h-4" />
        </Link>

        {user && (
          <div className="md:hidden flex shrink-0">
            <NotificationBell />
          </div>
        )}

        <div className="flex items-center gap-1.5 md:gap-3 lg:gap-4 shrink-0">
          {user && <div className="hidden md:block shrink-0"><NotificationBell /></div>}
          {user && <div className="scale-90 sm:scale-100 transform origin-center flex shrink-0"><ThemeToggle /></div>}
          <div className="scale-90 sm:scale-100 transform origin-center flex shrink-0"><LocaleSwitcher /></div>
        </div>

        {user ? (
          <>
            <Link
              href="/profile"
              aria-label="User Profile"
              className="flex items-center gap-3 pe-2 md:pe-4 group shrink-0"
            >
              <div className="hidden lg:flex flex-col items-end leading-tight text-end">
                <span className="text-body-md font-bold text-foreground group-hover:text-operational-cyan transition-colors">{displayName || user.name}</span>
                <span className="text-label-xs text-operational-cyan font-semibold uppercase">{user.role}</span>
              </div>
              <div className="w-8 h-8 md:w-9 md:h-9 rounded-sm bg-card border border-border shadow-sm flex items-center justify-center text-body-md font-semibold text-operational-cyan transition-all group-hover:bg-muted overflow-hidden shrink-0">
                {avatarUrl ? (
                  <img src={getMediaUrl(avatarUrl)} alt={displayName || user.name} className="w-full h-full object-cover" />
                ) : (
                  (displayName || user.name || '').charAt(0).toUpperCase()
                )}
              </div>
            </Link>
            <button
              onClick={() => logout()}
              className="p-1.5 sm:p-2 text-muted-foreground/60 hover:text-status-error hover:bg-status-error/10 rounded-xl transition-all hidden sm:flex"
              title={tc('logout')}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </>
        ) : (
          <div className="text-body-md text-muted-foreground/60">{tc('not_logged_in')}</div>
        )}
      </div>

      <ContextSelector
        open={isSelectorOpen}
        onOpenChange={setIsSelectorOpen}
      />
    </header>
  );
}

