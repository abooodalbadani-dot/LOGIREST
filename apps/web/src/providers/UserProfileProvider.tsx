'use client';

import { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { useAuth, AuthUser } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { apiClient } from '@/lib/api/client';
import { AuthUserSchema } from '@/types/auth';
import { z } from 'zod';
import { useRestaurantProfile } from '@/features/admin/hooks/useRestaurantProfile';

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

  // Call useRestaurantProfile hook to ensure configuration data is fetched and synced to localStorage
  useRestaurantProfile({ enabled: !!user });

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const avatarUrl = user?.avatarUrl || null;
  const displayName = user?.name || '';
  const themePreferences: 'light' | 'dark' = user?.themePreferences || (theme === 'dark' ? 'dark' : 'light');
  const notificationPreferences = useMemo(() => {
    return user?.notificationPreferences ?? {
      lowStock: true,
      expiry: true,
      pendingApproval: true,
      poFinalized: false,
      security: true,
    };
  }, [user?.notificationPreferences]);
  const locale: 'ar' | 'en' = user?.locale || 'en';

  // Synchronize database theme preference to next-themes theme on user load/change
  useEffect(() => {
    if (user?.themePreferences && user.themePreferences !== theme) {
      setTheme(user.themePreferences);
    }
  }, [user?.themePreferences, theme, setTheme]);

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
      if (fields.locale) {
        document.cookie = `NEXT_LOCALE=${fields.locale}; path=/; max-age=31536000; SameSite=Lax`;
      }

      const apiPayload: Record<string, unknown> = {};
      if (fields.displayName !== undefined) apiPayload.name = fields.displayName;
      if (fields.avatarUrl !== undefined) apiPayload.avatarUrl = fields.avatarUrl;
      if (fields.phone !== undefined) apiPayload.phone = fields.phone;
      if (fields.email !== undefined) apiPayload.email = fields.email;
      if (fields.locale !== undefined) apiPayload.locale = fields.locale;
      if (fields.themePreferences !== undefined) apiPayload.themePreferences = fields.themePreferences;
      if (fields.notificationPreferences !== undefined) {
        apiPayload.notificationPreferences = {
          ...notificationPreferences,
          ...fields.notificationPreferences,
        };
      }

      if (user) {
        const updatedUser = await apiClient.put('/auth/profile', AuthUserSchema, apiPayload);
        updateUser(updatedUser);
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
