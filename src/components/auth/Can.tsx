'use client';
import React from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { hasPermission } from '@/lib/auth/rbac';
import { ResourceType, ActionType } from '@/types/rbac';

interface CanProps {
 perform: ActionType;
 on: ResourceType;
 children: React.ReactNode;
 fallback?: React.ReactNode;
}

export function Can({ perform, on, children, fallback = null }: CanProps) {
 const { user } = useAuth();

 if (!user) return <>{fallback}</>;

 const allowed = hasPermission(user.role, on, perform);

 if (allowed) {
 return <>{children}</>;
 }

 return <>{fallback}</>;
}
