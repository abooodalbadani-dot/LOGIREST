export function isConfigValid(env: Record<string, string | undefined>): boolean {
  if (!env.NEXT_PUBLIC_API_URL) {
    if (env.NEXT_PUBLIC_USE_MOCKS === 'true') {
      return true;
    }
    if (env.NODE_ENV === 'development' && env.NEXT_PUBLIC_USE_MOCKS !== 'false') {
      return true;
    }
    return false;
  }
  return true;
}
