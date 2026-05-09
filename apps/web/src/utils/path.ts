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
