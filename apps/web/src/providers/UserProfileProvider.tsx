'use client';

import { createContext, useContext, useState } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { apiClient } from '@/lib/api/client';
import { AuthUserSchema } from '@/types/auth';

interface UserProfileContextType {
  avatarUrl: string | null;
  displayName: string;
  themePreferences: 'light' | 'dark';
  updateProfile: (fields: { 
    displayName?: string; 
    avatarUrl?: string | null; 
    themePreferences?: 'light' | 'dark';
    phone?: string | null;
    email?: string;
  }) => Promise<void>;
  isSaving: boolean;
  error: string | null;
}

const UserProfileContext = createContext<UserProfileContextType | null>(null);

export function UserProfileProvider({ children }: { children: React.ReactNode }) {
  const { user, updateUser } = useAuth();
  const { theme, setTheme } = useTheme();

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Derive active states synchronously from source contexts to prevent cascading useEffect renders
  const avatarUrl = user?.avatar_url || null;
  const displayName = user?.name || '';
  const themePreferences: 'light' | 'dark' = theme === 'dark' ? 'dark' : 'light';

  const updateProfile = async (fields: { 
    displayName?: string; 
    avatarUrl?: string | null; 
    themePreferences?: 'light' | 'dark';
    phone?: string | null;
    email?: string;
  }) => {
    setIsSaving(true);
    setError(null);
    try {
      // 1. Sync active system theme immediately
      if (fields.themePreferences) {
        setTheme(fields.themePreferences);
      }

      // 2. Build the updated fields profile
      const updatedFields: Record<string, unknown> = {};
      if (fields.displayName !== undefined) updatedFields.name = fields.displayName;
      if (fields.avatarUrl !== undefined) updatedFields.avatar_url = fields.avatarUrl;
      if (fields.phone !== undefined) updatedFields.phone = fields.phone;
      if (fields.email !== undefined) updatedFields.email = fields.email;

      if (user) {
        const fullPayload = {
          ...user,
          ...updatedFields
        };

        // 3. Make simulated API / DB call
        await apiClient.put(`/auth/profile`, AuthUserSchema, fullPayload);

        // 4. Trigger synchronous Auth Provider update to propagate global changes
        updateUser(updatedFields);
      }
    } catch (err: unknown) {
      console.error('[UserProfileProvider] Failed to update profile:', err);
      const msg = err instanceof Error ? err.message : 'Unknown error during profile sync';
      setError(msg);
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <UserProfileContext.Provider 
      value={{ 
        avatarUrl, 
        displayName, 
        themePreferences, 
        updateProfile, 
        isSaving, 
        error 
      }}
    >
      {children}
    </UserProfileContext.Provider>
  );
}

export function useUserProfile() {
  const context = useContext(UserProfileContext);
  if (!context) {
    throw new Error('useUserProfile must be used within a UserProfileProvider');
  }
  return context;
}
