export function isConfigValid(env: Record<string, string | undefined>): boolean {
  if (!env.NEXT_PUBLIC_API_URL) {
    return false;
  }
  return true;
}
