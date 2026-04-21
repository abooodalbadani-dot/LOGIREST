import { useAuth } from '@/providers/AuthProvider';
export function useSession() {
  const { user, token, logout, isLoading } = useAuth();
  return { user, token, logout, isAuthenticated: !!user, isLoading };
}
