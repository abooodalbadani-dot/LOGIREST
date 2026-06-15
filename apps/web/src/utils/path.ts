/**
 * Normalizes a path by removing extra spaces and multiple slashes.
 * @param path The path to normalize
 * @returns The normalized path
 */
export function normalizePath(path: string): string {
  if (!path) return '/';
  
  // Remove spaces and multiple slashes
  return path
    .replace(/\s+/g, '')        // Remove all whitespace
    .replace(/\/{2,}/g, '/')    // Replace multiple slashes with a single one
    .replace(/\/$/, '') || '/'; // Remove trailing slash, ensure at least /
}

/**
 * Resolves a media path (e.g., /uploads/avatars/...) to a full URL pointing to the backend API if needed.
 * @param path The relative or absolute media path
 * @returns The resolved media URL
 */
export function getMediaUrl(path: string | null | undefined): string {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  
  if (path.startsWith('/uploads')) {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
    
    if (apiUrl.startsWith('/')) {
      return path;
    }

    let backendOrigin = 'http://localhost:4000';
    try {
      const urlObj = new URL(apiUrl);
      backendOrigin = urlObj.origin;
    } catch (e) {
      // fallback to default
    }
    return `${backendOrigin}${path}`;
  }
  return path;
}

