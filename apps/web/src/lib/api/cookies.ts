const TOKEN_NAME = 'logirest_token';

export function getTokenCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${TOKEN_NAME}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function setTokenCookie(token: string, maxAgeSeconds = 86400): void {
  if (typeof document === 'undefined') return;
  const isSecure = location.protocol === 'https:';
  document.cookie = `${TOKEN_NAME}=${encodeURIComponent(token)}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax${isSecure ? '; Secure' : ''}`;
}

export function deleteTokenCookie(): void {
  if (typeof document === 'undefined') return;
  const isSecure = location.protocol === 'https:';
  const baseOptions = `; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT${isSecure ? '; Secure' : ''}`;
  
  document.cookie = `${TOKEN_NAME}=${baseOptions}; SameSite=Lax`;
  document.cookie = `${TOKEN_NAME}=${baseOptions}; SameSite=Strict`;
  document.cookie = `${TOKEN_NAME}=${baseOptions}`;
  document.cookie = `${TOKEN_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}
