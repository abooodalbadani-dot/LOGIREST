'use client';

import React from 'react';
import { usePermission } from '@/hooks/usePermission';
import { type ResourceType, type ActionType } from '@/types/rbac';

interface PermissionGateProps {
 action: ActionType;
 resource: ResourceType;
 children: React.ReactNode;
 fallback?: React.ReactNode;
}

/**
 * PermissionGate
 * 
 * Conditionally renders children based on user permissions.
 * Used to wrap action buttons (Create, Edit, Delete, Post, Approve).
 */
export function PermissionGate({
 action,
 resource,
 children,
 fallback = null
}: PermissionGateProps) {
 const hasPermission = usePermission(action, resource);

 if (!hasPermission) {
 return <>{fallback}</>;
 }

 return <>{children}</>;
}
