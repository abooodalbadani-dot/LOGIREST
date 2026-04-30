import { RestaurantProfile } from '@/features/admin/hooks/useRestaurantProfile';

const STORAGE_KEY = 'logirest_restaurant_profile';

/**
 * Utility to retrieve restaurant branding data for exports.
 * This ensures branding is consistent across all generated documents (PDF/Excel).
 */
export function getExportBranding(): RestaurantProfile | null {
  if (typeof window === 'undefined') return null;
  
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored) as RestaurantProfile;
    } catch (e) {
      console.error('Failed to parse restaurant profile for branding injection', e);
      return null;
    }
  }
  
  return null;
}

/**
 * Prepares branding header rows for Excel exports.
 */
export function getExcelBrandingHeader() {
  const branding = getExportBranding();
  if (!branding) return [];

  return [
    [branding.name],
    [branding.address],
    [`Tel: ${branding.phone} | Email: ${branding.email}`],
    branding.tax_number ? [`Tax No: ${branding.tax_number}`] : [],
    branding.commercial_registration ? [`CR No: ${branding.commercial_registration}`] : [],
    [''], // Spacing
  ].filter(row => row.length > 0);
}
