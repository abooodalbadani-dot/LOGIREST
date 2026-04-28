'use client';
 
import { AppShell } from '@/components/layouts/AppShell';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
 
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <ErrorBoundary>
        <AppShell>
          {children}
        </AppShell>
      </ErrorBoundary>
    </ProtectedRoute>
  );
}
