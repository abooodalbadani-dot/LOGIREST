'use client';
import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { apiClient } from '@/lib/api/client';

export type UserRole = 'ADMIN' | 'INV_MGR' | 'WH_KEEPER' | 'PROC_OFFICER' | 'AUDITOR';
export interface UserScope { branch_id: string | null; warehouse_id: string | null; department_id: string | null; }
export interface AuthUser { id: string; name: string; email: string; role: UserRole; scopes: UserScope[]; locale: 'ar' | 'en'; }
export interface AuthContextValue { user: AuthUser | null; token: string | null; login: (email: string, password: string) => Promise<void>; logout: () => void; isLoading: boolean; }

const AuthContext = createContext<AuthContextValue | null>(null);

const LoginResponseSchema = z.object({
  user: z.any(),
  token: z.string()
});

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
    try {
      const data = await apiClient.post('/auth/login', LoginResponseSchema, { email, password });
      
      localStorage.setItem('logirest_token', data.token);
      const payloadStr = atob(data.token.split('.')[1]);
      const payload = JSON.parse(payloadStr);
      
      setUser(payload.user as AuthUser);
      setToken(data.token);
    } catch (err) {
      console.error('Login error:', err);
      throw new Error('Login failed');
    }
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
