'use client';
import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from '@/i18n/navigation';
import { z } from 'zod';
import { apiClient } from '@/lib/api/client';

export type UserRole = 'ADMIN' | 'GM' | 'INV_MGR' | 'WH_KEEPER' | 'PROC_OFFICER' | 'APPROVER' | 'AUDITOR' | 'VIEWER' | 'KITCHEN_CHIEF' | 'STORE_MGR';
export interface UserScope { branch_id: string | null; warehouse_id: string | null; department_id: string | null; }
export interface ActiveScope { branchId: string | null; warehouseId: string | null; departmentId: string | null; }
export interface AuthUser { id: string; name: string; email: string; role: UserRole; scopes: UserScope[]; locale?: 'ar' | 'en'; }
export interface AuthContextValue { 
 user: AuthUser | null; 
 token: string | null; 
 login: (email: string, password: string) => Promise<void>; 
 logout: () => void; 
 isLoading: boolean;
 activeScope: ActiveScope;
 setActiveScope: (scope: ActiveScope) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

import { AuthUserSchema } from '@/types/auth';

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

 const setActiveScope = (scope: ActiveScope) => {
 setActiveScopeState(scope);
 localStorage.setItem('logirest_active_scope', JSON.stringify(scope));
 };

 useEffect(() => {
 // Load auth state from localStorage on mount (Client Side Only)
 const storedToken = localStorage.getItem('logirest_token');
 const storedScope = localStorage.getItem('logirest_active_scope');

 if (storedToken) {
 // Sync cookie if missing (for middleware)
 if (!document.cookie.includes('logirest_token')) {
 document.cookie = `logirest_token=${storedToken}; path=/; max-age=86400; SameSite=Lax`;
 }

 try {
 const payloadStr = decodeURIComponent(escape(atob(storedToken.split('.')[1])));
 const payload = JSON.parse(payloadStr);
 const parsedUser = AuthUserSchema.parse(payload.user);
 
 // Defer state updates to avoid synchronous cascading renders
 setTimeout(() => {
 setUser(parsedUser);
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
 return; // Skip the default setIsLoading(false) below
 } catch (e) {
 console.error('Failed to restore auth session:', e);
 localStorage.removeItem('logirest_token');
 document.cookie = 'logirest_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
 }
 }
 
 setTimeout(() => {
 setIsLoading(false);
 }, 0);
 }, []);

 const login = async (email: string, password: string) => {
 try {
 const data = await apiClient.post('/auth/login', LoginResponseSchema, { email, password });
 
 localStorage.setItem('logirest_token', data.token);
 // Set cookie for middleware access
 document.cookie = `logirest_token=${data.token}; path=/; max-age=86400; SameSite=Lax`;
 
 const payloadStr = decodeURIComponent(escape(atob(data.token.split('.')[1])));
 const payload = JSON.parse(payloadStr);
 const parsedUser = AuthUserSchema.parse(payload.user);
 
 setUser(parsedUser);
 setToken(data.token);
 } catch (err) {
 console.error('Login error:', err);
 throw new Error('Login failed');
 }
 };

 const logout = () => {
 localStorage.removeItem('logirest_token');
 localStorage.removeItem('logirest_active_scope');
 // Remove cookie
 document.cookie = 'logirest_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
 
 setUser(null);
 setToken(null);
 setActiveScopeState({ branchId: null, warehouseId: null, departmentId: null });
  router.replace('/login');
 };

 return (
 <AuthContext.Provider value={{ user, token, login, logout, isLoading, activeScope, setActiveScope }}>
 {children}
 </AuthContext.Provider>
 );
}

export const useAuth = () => {
 const context = useContext(AuthContext);
 if (!context) throw new Error('useAuth must be used within AuthProvider');
 return context;
};
