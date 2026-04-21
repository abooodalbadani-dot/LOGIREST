'use client';
import { useAuth } from '@/providers/AuthProvider';
import LocaleSwitcher from '../shared/LocaleSwitcher';

export function Topbar() {
  const { user, logout } = useAuth();
  
  return (
    <header className="h-14 bg-surface-1 border-b border-surface-3 flex items-center justify-between px-4">
      <div className="flex items-center text-lg font-bold text-neon-cyan">
        LogiRest
      </div>
      <div className="flex items-center justify-center flex-1">
        <LocaleSwitcher />
      </div>
      <div className="flex items-center gap-4">
        {user ? (
          <>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-surface-3 flex items-center justify-center text-sm font-bold text-on-surface">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-medium text-on-surface">{user.name}</span>
            </div>
            <button 
              onClick={() => logout()}
              className="text-xs text-on-surface-muted hover:text-neon-red transition-colors"
            >
              Logout
            </button>
          </>
        ) : (
          <div className="text-sm text-on-surface-muted">Not logged in</div>
        )}
      </div>
    </header>
  );
}
