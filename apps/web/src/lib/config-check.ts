export function isConfigValid(env: Record<string, string | undefined>): boolean {
  const useMocks =
    env.NEXT_PUBLIC_USE_MOCKS === 'true' ||
    (env.NODE_ENV === 'development' && env.NEXT_PUBLIC_USE_MOCKS !== 'false');

  if (!env.NEXT_PUBLIC_API_URL && !useMocks) {
    return false;
  }
  return true;
}
