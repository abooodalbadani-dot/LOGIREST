'use client';
import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { z } from 'zod';
import { apiClient } from '@/lib/api/client';
import { getTokenCookie, setTokenCookie, deleteTokenCookie } from '@/lib/api/cookies';
import { AuthUserSchema } from '@/types/auth';

export type UserRole = 'ADMIN' | 'GM' | 'INV_MGR' | 'WH_KEEPER' | 'PROC_OFFICER' | 'APPROVER' | 'AUDITOR' | 'VIEWER' | 'KITCHEN_CHIEF' | 'STORE_MGR';
export interface UserScope { branch_id: string | null; warehouse_id: string | null; department_id: string | null; }
export interface ActiveScope { branchId: string | null; warehouseId: string | null; departmentId: string | null; }
export interface AuthUser { 
  id: string; 
  name: string; 
  email: string; 
  role: UserRole; 
  scopes: UserScope[]; 
  locale?: 'ar' | 'en'; 
  avatar_url?: string | null;
  phone?: string | null;
  notification_preferences?: {
    lowStock: boolean;
    expiry: boolean;
    pendingApproval: boolean;
    poFinalized: boolean;
    security: boolean;
  };
}
export interface AuthContextValue { 
  user: AuthUser | null; 
  token: string | null; 
  login: (email: string, password: string) => Promise<void>; 
  logout: () => void; 
  updateUser: (updatedFields: Partial<AuthUser>) => void;
  isLoading: boolean;
  activeScope: ActiveScope;
  setActiveScope: (scope: ActiveScope) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const LoginResponseSchema = z.object({
  user: AuthUserSchema,
  token: z.string()
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [activeScope, setActiveScopeState] = useState<ActiveScope>({ branchId: null, warehouseId: null, departmentId: null });
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const t = useTranslations('auth');

  const setActiveScope = (scope: ActiveScope) => {
    setActiveScopeState(scope);
    localStorage.setItem('logirest_active_scope', JSON.stringify(scope));
  };

  useEffect(() => {
    const handleExpired = () => {
      deleteTokenCookie();
      setUser(null);
      setToken(null);
      setActiveScopeState({ branchId: null, warehouseId: null, departmentId: null });
      const currentPath = window.location.pathname + window.location.search;
      const redirectPath = currentPath !== '/login' ? `&redirect=${encodeURIComponent(currentPath)}` : '';
      router.replace(`/login?reason=expired${redirectPath}`);
    };
    window.addEventListener('auth:expired', handleExpired);
    return () => window.removeEventListener('auth:expired', handleExpired);
  }, [router]);

  useEffect(() => {
    const storedToken = getTokenCookie();
    const storedScope = localStorage.getItem('logirest_active_scope');

    if (storedToken) {
      try {
        const payloadStr = decodeURIComponent(escape(atob(storedToken.split('.')[1])));
        const payload = JSON.parse(payloadStr);
        let parsedUser = AuthUserSchema.parse(payload.user);

        setTimeout(async () => {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);
            const meResponse = await apiClient.get('/auth/me', AuthUserSchema, { signal: controller.signal });
            clearTimeout(timeoutId);
            parsedUser = meResponse;
          } catch (err) {
            if (err instanceof DOMException && err.name === 'AbortError') {
              deleteTokenCookie();
              localStorage.removeItem('logirest_user_overrides');
              localStorage.removeItem('logirest_active_scope');
              router.replace('/login?reason=verification_failed');
              return;
            }
            if (err && typeof err === 'object' && 'response' in err && (err as { response?: { status?: number } }).response?.status === 401) {
              deleteTokenCookie();
              localStorage.removeItem('logirest_user_overrides');
              localStorage.removeItem('logirest_active_scope');
              router.replace('/login?reason=expired');
              return;
            }
            deleteTokenCookie();
            localStorage.removeItem('logirest_user_overrides');
            localStorage.removeItem('logirest_active_scope');
            router.replace('/login?reason=verification_failed');
            return;
          }

          let finalUser = parsedUser;
          const storedOverrides = localStorage.getItem('logirest_user_overrides');
          if (storedOverrides) {
            try {
              finalUser = { ...parsedUser, ...JSON.parse(storedOverrides) };
            } catch (err) {
              console.error('Failed to parse user overrides:', err);
            }
          }
          setUser(finalUser);
          setToken(storedToken);

          if (storedScope) {
            setActiveScopeState(JSON.parse(storedScope));
          } else if (parsedUser.scopes.length > 0) {
            const first = parsedUser.scopes[0];
            setActiveScopeState({
              branchId: first.branch_id,
              warehouseId: first.warehouse_id,
              departmentId: first.department_id
            });
          }
          setIsLoading(false);
        }, 0);
        return;
      } catch (e) {
        console.error('Failed to restore auth session:', e);
        deleteTokenCookie();
      }
    }

    setTimeout(() => {
      setIsLoading(false);
    }, 0);
  }, []);

  useEffect(() => {
    if (!token) return;
    try {
      const payloadStr = decodeURIComponent(escape(atob(token.split('.')[1])));
      const payload = JSON.parse(payloadStr);
      const exp = payload.exp as number;
      const now = Math.floor(Date.now() / 1000);
      const timeUntilExpiry = (exp - now) * 1000;
      const refreshAt = Math.max(timeUntilExpiry - 300000, 60000);
      const timerId = setTimeout(async () => {
        try {
          const data = await apiClient.post(
            '/auth/refresh',
            z.object({ success: z.boolean(), accessToken: z.string() }),
            {},
          );
          if (data.success) {
            setTokenCookie(data.accessToken);
            setToken(data.accessToken);
          }
        } catch {
          // Refresh failed silently; 401 interceptor will handle
        }
      }, refreshAt);
      return () => clearTimeout(timerId);
    } catch {
      // Invalid token, skip scheduling
    }
  }, [token]);

  const login = async (email: string, password: string) => {
    try {
      const data = await apiClient.post('/auth/login', LoginResponseSchema, { email, password });

      setTokenCookie(data.token);

      const payloadStr = decodeURIComponent(escape(atob(data.token.split('.')[1])));
      const payload = JSON.parse(payloadStr);
      const parsedUser = AuthUserSchema.parse(payload.user);

      setUser(parsedUser);
      setToken(data.token);
    } catch (err) {
      console.error('[Auth] Login sequence failed:', {
        error: err,
        message: err instanceof Error ? err.message : String(err),
        timestamp: new Date().toISOString()
      });
      throw new Error(t('login_failed'));
    }
  };

  const updateUser = (updatedFields: Partial<AuthUser>) => {
    setUser(prev => {
      if (!prev) return null;
      const merged = { ...prev, ...updatedFields };
      localStorage.setItem('logirest_user_overrides', JSON.stringify(merged));
      return merged;
    });
  };

  const logout = async () => {
    try {
      await apiClient.post('/auth/logout', z.object({}), {});
    } catch {
      // Proceed with client-side cleanup even if API call fails
    }
    deleteTokenCookie();
    localStorage.removeItem('logirest_active_scope');
    localStorage.removeItem('logirest_user_overrides');

    setUser(null);
    setToken(null);
    setActiveScopeState({ branchId: null, warehouseId: null, departmentId: null });
    router.replace('/login');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, updateUser, isLoading, activeScope, setActiveScope }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
