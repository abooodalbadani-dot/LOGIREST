'use client';
import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { z } from 'zod';
import { apiClient, normalizeKeysToCamelCase } from '@/lib/api/client';
import { getTokenCookie, setTokenCookie, deleteTokenCookie } from '@/lib/api/cookies';
import { AuthUserSchema } from '@/types/auth';
import LoadingSpinner from '@/components/shared/LoadingSpinner';

export type UserRole = 'ADMIN' | 'GM' | 'INV_MGR' | 'WH_KEEPER' | 'PROC_OFFICER' | 'APPROVER' | 'AUDITOR' | 'VIEWER' | 'KITCHEN_CHIEF' | 'STORE_MGR' | 'BRANCH_MGR' | 'PROC_MGR';
export interface UserScope { 
  branchId: string | null; 
  warehouseId: string | null; 
  departmentId: string | null; 
  warehouse?: {
    id: string;
    name: string;
    branch?: {
      id: string;
      name: string;
    } | null;
  } | null;
  department?: {
    id: string;
    name: string;
  } | null;
  branch?: {
    id: string;
    name: string;
  } | null;
}
export interface ActiveScope { branchId: string | null; warehouseId: string | null; departmentId: string | null; }
export interface AuthUser { 
  id: string; 
  name: string; 
  email: string; 
  role: UserRole; 
  scopes: UserScope[]; 
  locale?: 'ar' | 'en'; 
  avatarUrl?: string | null;
  phone?: string | null;
  notificationPreferences?: {
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
  const [hasAttemptedAutoSelect, setHasAttemptedAutoSelect] = useState(false);
  const router = useRouter();
  const t = useTranslations('auth');

  const setActiveScope = (scope: ActiveScope) => {
    setActiveScopeState(scope);
    localStorage.setItem('logirest_active_scope', JSON.stringify(scope));
  };

  useEffect(() => {
    const handleExpired = () => {
      deleteTokenCookie();
      localStorage.removeItem('logirest_user_overrides');
      localStorage.removeItem('logirest_active_scope');
      setUser(null);
      setToken(null);
      setActiveScopeState({ branchId: null, warehouseId: null, departmentId: null });
      setHasAttemptedAutoSelect(false);
      
      if (typeof window !== 'undefined') {
        try {
          sessionStorage.clear();
        } catch (e) {
          console.error('Failed to clear session storage:', e);
        }
        
        // Remove document cookie explicitly to double-guarantee
        document.cookie = 'logirest_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';

        const currentPath = window.location.pathname + window.location.search;
        const isLogin = currentPath.includes('/login');
        if (!isLogin) {
          const redirectPath = `&redirect=${encodeURIComponent(currentPath)}`;
          const locale = document.documentElement.lang || 'ar';
          // Aggressively redirect via window.location.href to break free from any crashed React render loop
          window.location.href = `/${locale}/login?reason=expired${redirectPath}`;
        }
      } else {
        router.replace('/login?reason=expired');
      }
    };
    window.addEventListener('auth:expired', handleExpired);
    return () => window.removeEventListener('auth:expired', handleExpired);
  }, [router]);

  useEffect(() => {
    const handleScopeResolved = (e: Event) => {
      const customEvent = e as CustomEvent<ActiveScope>;
      if (customEvent.detail) {
        setActiveScopeState(customEvent.detail);
      }
    };
    window.addEventListener('auth:scope-resolved', handleScopeResolved);
    return () => window.removeEventListener('auth:scope-resolved', handleScopeResolved);
  }, []);

  useEffect(() => {
    const storedToken = getTokenCookie();
    const storedScope = localStorage.getItem('logirest_active_scope');

    const verifyTokenAndLoad = async () => {
      if (!storedToken) {
        setIsLoading(false);
        return;
      }
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        const meResponse = await apiClient.get('/auth/me', AuthUserSchema, { signal: controller.signal });
        clearTimeout(timeoutId);

        let finalUser = meResponse;
        const storedOverrides = localStorage.getItem('logirest_user_overrides');
        if (storedOverrides) {
          try {
            finalUser = { ...meResponse, ...JSON.parse(storedOverrides) };
          } catch (err) {
            console.error('Failed to parse user overrides:', err);
            localStorage.removeItem('logirest_user_overrides');
          }
        }
        setUser(finalUser);
        setToken(storedToken);

        if (storedScope) {
          try {
            const scopeObj = JSON.parse(storedScope);
            const isValid = meResponse.scopes.some(
              (s: UserScope) => s.branchId === scopeObj.branchId && s.warehouseId === scopeObj.warehouseId
            );
            if (isValid) {
              setActiveScopeState(scopeObj);
            } else {
              setActiveScopeState({ branchId: null, warehouseId: null, departmentId: null });
              localStorage.removeItem('logirest_active_scope');
            }
          } catch (err) {
            console.error('Failed to parse active scope from localStorage:', err);
            localStorage.removeItem('logirest_active_scope');
          }
        } else if (meResponse.scopes.length > 0) {
          const first = meResponse.scopes[0];
          setActiveScopeState({
            branchId: first.branchId,
            warehouseId: first.warehouseId,
            departmentId: first.departmentId
          });
        }
        setIsLoading(false);
      } catch (err) {
        console.error('Failed to restore auth session:', err);
        deleteTokenCookie();
        localStorage.removeItem('logirest_active_scope');
        localStorage.removeItem('logirest_user_overrides');
        setUser(null);
        setToken(null);
        setIsLoading(false);

        const isTimeout = err instanceof DOMException && err.name === 'AbortError';
        const reason = isTimeout ? 'verification_failed' : 'expired';

        if (typeof window !== 'undefined') {
          try {
            sessionStorage.clear();
          } catch (e) {
            console.error('Failed to clear session storage:', e);
          }
          document.cookie = 'logirest_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';

          const currentPath = window.location.pathname + window.location.search;
          const isLogin = currentPath.includes('/login');
          if (!isLogin) {
            const redirectPath = `&redirect=${encodeURIComponent(currentPath)}`;
            const locale = document.documentElement.lang || 'ar';
            window.location.href = `/${locale}/login?reason=${reason}${redirectPath}`;
          }
        } else {
          router.replace(`/login?reason=${reason}`);
        }
      }
    };

    verifyTokenAndLoad();
  }, []);

  useEffect(() => {
    if (isLoading || !user || hasAttemptedAutoSelect) return;
    const storedScope = localStorage.getItem('logirest_active_scope');
    if (storedScope) {
      try {
        const parsed = JSON.parse(storedScope);
        if (parsed.branchId && parsed.warehouseId) {
          return;
        }
      } catch (e) {
        localStorage.removeItem('logirest_active_scope');
      }
    }

    setHasAttemptedAutoSelect(true);
    let active = true;
    const autoSelect = async () => {
      try {
        const branchesRes = await apiClient.get('/branches', z.object({ data: z.array(z.object({ id: z.string() })) }));
        if (!active) return;
        const branches = branchesRes.data;
        if (branches && branches.length > 0) {
          const firstBranch = branches[0];
          const warehousesRes = await apiClient.get(`/warehouses?branchId=${firstBranch.id}`, z.object({ data: z.array(z.object({ id: z.string() })) }));
          if (!active) return;
          const warehouses = warehousesRes.data;
          if (warehouses && warehouses.length > 0) {
            const firstWarehouse = warehouses[0];
            const newScope = {
              branchId: firstBranch.id,
              warehouseId: firstWarehouse.id,
              departmentId: null
            };
            setActiveScope(newScope);
          }
        }
      } catch (err) {
        console.error('Failed to auto-select scope:', err);
      }
    };

    autoSelect();
    return () => {
      active = false;
    };
  }, [user, isLoading]);

  useEffect(() => {
    if (!token) return;
    try {
      const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      const payloadStr = decodeURIComponent(escape(atob(b64)));
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

      const b64 = data.token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      const payloadStr = decodeURIComponent(escape(atob(b64)));
      const payload = JSON.parse(payloadStr);
      const camelPayloadUser = normalizeKeysToCamelCase(payload.user);
      const parsedUser = AuthUserSchema.parse(camelPayloadUser);

      setUser(parsedUser);
      setToken(data.token);

      // Forcefully overwrite or initialize active scope in LocalStorage and state
      if (parsedUser.scopes && parsedUser.scopes.length > 0) {
        const validScope = parsedUser.scopes.find(s => s.branchId && s.warehouseId);
        const targetScope = validScope || parsedUser.scopes[0];
        if (targetScope) {
          const newScope = {
            branchId: targetScope.branchId || null,
            warehouseId: targetScope.warehouseId || null,
            departmentId: targetScope.departmentId || null
          };
          setActiveScopeState(newScope);
          localStorage.setItem('logirest_active_scope', JSON.stringify(newScope));
        }
      }
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
    setHasAttemptedAutoSelect(false);
    router.replace('/login');
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

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
