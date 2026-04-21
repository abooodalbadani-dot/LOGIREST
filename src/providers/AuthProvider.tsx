'use client';
import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export type UserRole = 'ADMIN' | 'INV_MGR' | 'WH_KEEPER' | 'PROC_OFFICER' | 'AUDITOR';
export interface UserScope { branch_id: string | null; warehouse_id: string | null; department_id: string | null; }
export interface AuthUser { id: string; name: string; email: string; role: UserRole; scopes: UserScope[]; locale: 'ar' | 'en'; }
export interface AuthContextValue { user: AuthUser | null; token: string | null; login: (email: string, password: string) => Promise<void>; logout: () => void; isLoading: boolean; }

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const storedToken = localStorage.getItem('logirest_token');
    if (storedToken) {
      try {
        const payloadStr = atob(storedToken.split('.')[1]);
        const payload = JSON.parse(payloadStr);
        setUser(payload.user as AuthUser);
        setToken(storedToken);
      } catch (e) {
        localStorage.removeItem('logirest_token');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const res = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) throw new Error('Login failed');
    const data = await res.json();
    localStorage.setItem('logirest_token', data.token);
    const payloadStr = atob(data.token.split('.')[1]);
    const payload = JSON.parse(payloadStr);
    setUser(payload.user as AuthUser);
    setToken(data.token);
  };

  const logout = () => {
    localStorage.removeItem('logirest_token');
    setUser(null);
    setToken(null);
    const locale = document.documentElement.lang || 'ar';
    router.replace(`/${locale}/login`);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
