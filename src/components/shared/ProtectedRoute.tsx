'use client';

import { useAuth } from '@/providers/AuthProvider';
import { usePermission } from '@/hooks/usePermission';
import { ActionType, ResourceType } from '@/types/rbac';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import PermissionDenied from './PermissionDenied';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredAction?: ActionType;
  requiredResource?: ResourceType;
}

export default function ProtectedRoute({
  children,
  requiredAction,
  requiredResource,
}: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  
  // If no specific permission is required, assume just authentication is enough
  const hasGenericAccess = !!user;
  const hasSpecificPermission = usePermission(requiredAction as ActionType, requiredResource as ResourceType);
  
  const hasPermission = (requiredAction && requiredResource) 
    ? hasSpecificPermission 
    : hasGenericAccess;
    
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setTimeout(() => {
      setIsMounted(true);
    }, 0);
  }, []);

  useEffect(() => {
    if (isMounted && !isLoading && !user) {
      const locale = document.documentElement.lang || 'ar';
      router.replace(`/${locale}/login`);
    }
  }, [user, isLoading, router, isMounted]);

  if (isLoading || !isMounted) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-4 border-operational-cyan border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (!hasPermission) {
    return <PermissionDenied />;
  }

  return <>{children}</>;
}
