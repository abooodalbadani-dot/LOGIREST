'use client';

import { createContext, useContext, useState, useCallback } from 'react';
import { useAuth, AuthUser } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { apiClient } from '@/lib/api/client';
import { AuthUserSchema } from '@/types/auth';
import { z } from 'zod';

interface UserProfileContextType {
  avatarUrl: string | null;
  displayName: string;
  themePreferences: 'light' | 'dark';
  notificationPreferences: {
    lowStock: boolean;
    expiry: boolean;
    pendingApproval: boolean;
    poFinalized: boolean;
    security: boolean;
  };
  locale: 'ar' | 'en';
  updateProfile: (fields: {
    displayName?: string;
    avatarUrl?: string | null;
    themePreferences?: 'light' | 'dark';
    phone?: string | null;
    email?: string;
    notificationPreferences?: {
      lowStock?: boolean;
      expiry?: boolean;
      pendingApproval?: boolean;
      poFinalized?: boolean;
      security?: boolean;
    };
    locale?: 'ar' | 'en';
  }) => Promise<void>;
  uploadAvatar: (file: File) => Promise<string | null>;
  isSaving: boolean;
  error: string | null;
}

const UserProfileContext = createContext<UserProfileContextType | null>(null);

export function UserProfileProvider({ children }: { children: React.ReactNode }) {
  const { user, updateUser } = useAuth();
  const { theme, setTheme } = useTheme();

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const avatarUrl = user?.avatarUrl || null;
  const displayName = user?.name || '';
  const themePreferences: 'light' | 'dark' = theme === 'dark' ? 'dark' : 'light';
  const notificationPreferences = user?.notificationPreferences ?? {
    lowStock: true,
    expiry: true,
    pendingApproval: true,
    poFinalized: false,
    security: true,
  };
  const locale: 'ar' | 'en' = user?.locale || 'en';

  const uploadAvatar = useCallback(async (file: File): Promise<string | null> => {
    setIsSaving(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      const result = await apiClient.post('/auth/profile/avatar', z.object({ avatarUrl: z.string() }), formData);
      const url = result.avatarUrl || null;
      if (url) {
        updateUser({ avatarUrl: url });
      }
      return url;
    } catch (err: unknown) {
      console.error('[UserProfileProvider] Failed to upload avatar:', err);
      const msg = err instanceof Error ? err.message : 'Unknown error during avatar upload';
      setError(msg);
      return null;
    } finally {
      setIsSaving(false);
    }
  }, [updateUser]);

  const updateProfile = async (fields: {
    displayName?: string;
    avatarUrl?: string | null;
    themePreferences?: 'light' | 'dark';
    phone?: string | null;
    email?: string;
    notificationPreferences?: {
      lowStock?: boolean;
      expiry?: boolean;
      pendingApproval?: boolean;
      poFinalized?: boolean;
      security?: boolean;
    };
    locale?: 'ar' | 'en';
  }) => {
    setIsSaving(true);
    setError(null);
    try {
      if (fields.themePreferences) {
        setTheme(fields.themePreferences);
      }

      const apiPayload: Record<string, unknown> = {};
      if (fields.displayName !== undefined) apiPayload.name = fields.displayName;
      if (fields.avatarUrl !== undefined) apiPayload.avatar_url = fields.avatarUrl;
      if (fields.phone !== undefined) apiPayload.phone = fields.phone;
      if (fields.email !== undefined) apiPayload.email = fields.email;
      if (fields.locale !== undefined) apiPayload.locale = fields.locale;
      if (fields.notificationPreferences !== undefined) {
        apiPayload.notificationPreferences = {
          ...notificationPreferences,
          ...fields.notificationPreferences,
        };
      }

      const localUpdatedFields: Partial<AuthUser> = {};
      if (fields.displayName !== undefined) localUpdatedFields.name = fields.displayName;
      if (fields.avatarUrl !== undefined) localUpdatedFields.avatarUrl = fields.avatarUrl;
      if (fields.phone !== undefined) localUpdatedFields.phone = fields.phone;
      if (fields.email !== undefined) localUpdatedFields.email = fields.email;
      if (fields.locale !== undefined) localUpdatedFields.locale = fields.locale;
      if (fields.notificationPreferences !== undefined) {
        localUpdatedFields.notificationPreferences = {
          ...notificationPreferences,
          ...fields.notificationPreferences,
        };
      }

      if (user) {
        await apiClient.put('/auth/profile', AuthUserSchema, apiPayload);
        updateUser(localUpdatedFields);
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
        notificationPreferences,
        locale,
        updateProfile,
        uploadAvatar,
        isSaving,
        error,
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
