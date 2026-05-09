'use client';
import { useState } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { useContextScope } from '@/hooks/useContextScope';
import LocaleSwitcher from '../shared/LocaleSwitcher';
import { ContextSelector } from '../shared/ContextSelector';
import { ThemeToggle } from '../shared/ThemeToggle';
import { WebMCPBadge } from '@/components/shared/WebMCPBadge';
import { useTranslations } from 'next-intl';
import { useWebMCP } from '@/providers/WebMCPProvider';
import { Globe, ChevronDown, LogOut, Loader2, Menu, Search } from 'lucide-react';
import { Link } from '@/i18n/navigation';

interface TopbarProps {
  locale: string;
  onMenuClick?: () => void;
}

export function Topbar({ locale, onMenuClick }: TopbarProps) {
  const { user, logout } = useAuth();
  const { branchName, warehouseName, isLoading } = useContextScope();
  const { isAvailable, registeredTools } = useWebMCP();
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const t = useTranslations('context');
  const tc = useTranslations('common');

  return (
    <header className="h-14 bg-surface-container-lowest flex items-center justify-between px-4 sticky top-0 z-40">
      <div className="flex items-center gap-4">
        {/* Mobile Menu Button */}
        <button 
          onClick={onMenuClick}
          className="p-2 -ms-2 text-muted-foreground/60 hover:text-operational-cyan hover:bg-operational-cyan/10 rounded-lg md:hidden transition-all"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="text-title-sm font-bold text-operational-cyan hidden sm:block">
          LogiRest
        </div>

        {user && (
          <button
            onClick={() => setIsSelectorOpen(true)}
            className="flex items-center gap-3 px-3 py-1.5 rounded-xl bg-surface-container-low hover:bg-surface-container transition-all group relative overflow-hidden"
          >
            {/* Subtle glow effect */}
            <div className="absolute inset-0 bg-operational-cyan/5 opacity-0 group-hover:opacity-100 transition-opacity" />

            <div className="p-1.5 bg-operational-cyan/10 rounded-sm text-operational-cyan transition-all">
              <Globe className="w-3.5 h-3.5 group-hover:rotate-12 transition-transform" />
            </div>

            <div className="flex flex-col items-start leading-tight relative z-10">
              <span className="text-label-xs text-muted-foreground/60 uppercase font-semibold">
                {t('switch_context')}
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-label-sm font-bold text-foreground max-w-[100px] md:max-w-[140px] truncate" dir="ltr">
                  {isLoading ? (
                    <Loader2 className="w-3 h-3 animate-spin text-operational-cyan" />
                  ) : (
                    branchName ? `${branchName} ${warehouseName ? ` /${warehouseName}` : ''}` : t('no_selection')
                  )}
                </span>
              </div>
            </div>
            <ChevronDown className="w-3 h-3 text-muted-foreground/60 group-hover:text-operational-cyan transition-colors" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        <Link 
          href="/search"
          className="p-2 text-muted-foreground/60 hover:text-operational-cyan hover:bg-operational-cyan/10 rounded-xl transition-all"
          title={tc('search')}
        >
          <Search className="w-4 h-4" />
        </Link>
        <div className="hidden sm:block">
          <WebMCPBadge />
        </div>
        {user && <ThemeToggle />}
        <LocaleSwitcher />
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        {user ? (
          <>
            <Link 
              href="/profile"
              className="flex items-center gap-3 pe-2 md:pe-4 group"
            >
              <div className="hidden sm:flex flex-col items-end leading-tight text-end">
                <span className="text-body-md font-bold text-foreground group-hover:text-operational-cyan transition-colors">{user.name}</span>
                <span className="text-label-xs text-operational-cyan font-semibold uppercase">{user.role}</span>
              </div>
              <div className="w-8 h-8 md:w-9 md:h-9 rounded-sm bg-surface-container-low flex items-center justify-center text-body-md font-semibold text-operational-cyan transition-all group-hover:bg-surface-container">
                {user.name.charAt(0).toUpperCase()}
              </div>
            </Link>
            <button
              onClick={() => logout()}
              className="p-2 text-muted-foreground/60 hover:text-status-error hover:bg-status-error/10 rounded-xl transition-all"
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

