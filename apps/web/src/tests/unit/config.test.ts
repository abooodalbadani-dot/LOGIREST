import { describe, it, expect } from 'vitest';
import { isConfigValid } from '@/lib/config-check';

describe('isConfigValid', () => {
  it('should pass when NEXT_PUBLIC_API_URL is configured', () => {
    const result = isConfigValid({
      NEXT_PUBLIC_API_URL: 'http://localhost:4000/api/v1',
      NEXT_PUBLIC_USE_MOCKS: 'false',
      NODE_ENV: 'production',
    });
    expect(result).toBe(true);
  });

  it('should pass when API URL is missing but NEXT_PUBLIC_USE_MOCKS is explicitly true', () => {
    const result = isConfigValid({
      NEXT_PUBLIC_API_URL: undefined,
      NEXT_PUBLIC_USE_MOCKS: 'true',
      NODE_ENV: 'production',
    });
    expect(result).toBe(true);
  });

  it('should pass in development mode when NEXT_PUBLIC_USE_MOCKS is not explicitly false', () => {
    const result = isConfigValid({
      NEXT_PUBLIC_API_URL: undefined,
      NEXT_PUBLIC_USE_MOCKS: undefined,
      NODE_ENV: 'development',
    });
    expect(result).toBe(true);
  });

  it('should fail when API URL is missing, mocks are false, and NODE_ENV is production', () => {
    const result = isConfigValid({
      NEXT_PUBLIC_API_URL: undefined,
      NEXT_PUBLIC_USE_MOCKS: 'false',
      NODE_ENV: 'production',
    });
    expect(result).toBe(false);
  });

  it('should fail in development mode if NEXT_PUBLIC_USE_MOCKS is explicitly false and API URL is missing', () => {
    const result = isConfigValid({
      NEXT_PUBLIC_API_URL: undefined,
      NEXT_PUBLIC_USE_MOCKS: 'false',
      NODE_ENV: 'development',
    });
    expect(result).toBe(false);
  });
});
