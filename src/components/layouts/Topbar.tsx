'use client';
import { useState } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { useContextScope } from '@/hooks/useContextScope';
import LocaleSwitcher from '../shared/LocaleSwitcher';
import { ContextSelector } from '../shared/ContextSelector';
import { WebMCPBadge } from '../shared/WebMCPBadge';
import { useTranslations } from 'next-intl';
import { useWebMCP } from '@/providers/WebMCPProvider';
import { Globe, ChevronDown, LogOut, Loader2 } from 'lucide-react';

export function Topbar() {
  const { user, logout } = useAuth();
  const { branchName, warehouseName, isLoading } = useContextScope();
  const { isAvailable, registeredTools } = useWebMCP();
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const t = useTranslations('context');
  const tc = useTranslations('common');

  return (
    <header className="h-14 bg-surface-container-lowest flex items-center justify-between px-4 sticky top-0 z-40">
      <div className="flex items-center gap-4">
        <div className="text-lg font-bold text-cyan-500 hidden md:block">
          LogiRest
        </div>

        {user && (
          <button
            onClick={() => setIsSelectorOpen(true)}
            className="flex items-center gap-3 px-3 py-1.5 rounded-xl bg-surface-container-low hover:bg-surface-container transition-all group relative overflow-hidden"
          >
            {/* Subtle glow effect */}
            <div className="absolute inset-0 bg-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />

            <div className="p-1.5 bg-cyan-500/10 rounded-lg text-cyan-500 group-hover:shadow-[0_0_10px_rgba(6,182,212,0.2)] transition-all">
              <Globe className="w-3.5 h-3.5 group-hover:rotate-12 transition-transform" />
            </div>

            <div className="flex flex-col items-start leading-tight relative z-10">
              <span className="text-[10px] text-on-surface-muted uppercase tracking-widest font-black">
                {t('switch_context')}
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-on-surface max-w-[140px] truncate" dir="ltr">
                  {isLoading ? (
                    <Loader2 className="w-3 h-3 animate-spin text-cyan-500" />
                  ) : (
                    branchName ? `${branchName}${warehouseName ? ` / ${warehouseName}` : ''}` : t('no_selection')
                  )}
                </span>
              </div>
            </div>
            <ChevronDown className="w-3 h-3 text-on-surface-muted group-hover:text-cyan-500 transition-colors" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden sm:block">
          <WebMCPBadge />
        </div>
        <LocaleSwitcher />
      </div>

      <div className="flex items-center gap-4">
        {user ? (
          <>
            <div className="flex items-center gap-3 pe-4">
              <div className="hidden sm:flex flex-col items-end leading-tight text-end" dir="ltr">
                <span className="text-sm font-bold text-on-surface">{user.name}</span>
                <span className="text-[10px] text-cyan-500 font-black uppercase tracking-tighter">{user.role}</span>
              </div>
              <div className="w-9 h-9 rounded-xl bg-surface-container-low flex items-center justify-center text-sm font-black text-cyan-500 shadow-inner transition-all group-hover:bg-surface-container">
                {user.name.charAt(0).toUpperCase()}
              </div>
            </div>
            <button
              onClick={() => logout()}
              className="p-2 text-on-surface-muted hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
              title={tc('logout')}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </>
        ) : (
          <div className="text-sm text-on-surface-muted">{tc('not_logged_in')}</div>
        )}
      </div>

      <ContextSelector
        open={isSelectorOpen}
        onOpenChange={setIsSelectorOpen}
      />
    </header>
  );
}
