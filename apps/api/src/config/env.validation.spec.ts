import { validate } from './env.validation';

describe('env.validation', () => {
  const baseConfig = {
    DATABASE_URL: 'postgresql://localhost:5432/db',
    FRONTEND_URL: 'http://localhost:3000',
    JWT_ACCESS_SECRET: 'super-secret-access-key-at-least-32-chars',
    JWT_REFRESH_SECRET: 'super-secret-refresh-key-at-least-32-chars',
    ENCRYPTION_KEY: 'encryption-key-at-least-32-chars-long',
  };

  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should pass validation with valid production configuration', () => {
    const config = {
      ...baseConfig,
      NODE_ENV: 'production',
    };
    const result = validate(config);
    expect(result).toBeDefined();
    expect(result.NODE_ENV).toBe('production');
  });

  it('should crash on startup in production when JWT_ACCESS_SECRET is default', () => {
    const config = {
      ...baseConfig,
      NODE_ENV: 'production',
      JWT_ACCESS_SECRET: 'dev-jwt-access-secret-key-at-least-32-chars-long',
    };

    const mockExit = jest
      .spyOn(process, 'exit')
      .mockImplementation((code?: unknown): never => {
        throw new Error(`process.exit mock: ${String(code)}`);
      });
    const mockConsoleError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    expect(() => validate(config)).toThrow();

    expect(mockExit).toHaveBeenCalledWith(1);
    expect(mockConsoleError).toHaveBeenCalled();

    mockExit.mockRestore();
    mockConsoleError.mockRestore();
  });

  it('should crash on startup in production when JWT_REFRESH_SECRET is default', () => {
    const config = {
      ...baseConfig,
      NODE_ENV: 'production',
      JWT_REFRESH_SECRET: 'dev-jwt-refresh-secret-key-at-least-32-chars-long',
    };

    const mockExit = jest
      .spyOn(process, 'exit')
      .mockImplementation((code?: unknown): never => {
        throw new Error(`process.exit mock: ${String(code)}`);
      });
    const mockConsoleError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    expect(() => validate(config)).toThrow();

    expect(mockExit).toHaveBeenCalledWith(1);
    expect(mockConsoleError).toHaveBeenCalled();

    mockExit.mockRestore();
    mockConsoleError.mockRestore();
  });

  it('should pass validation in development even if default keys are used', () => {
    const config = {
      ...baseConfig,
      NODE_ENV: 'development',
      JWT_ACCESS_SECRET: 'dev-jwt-access-secret-key-at-least-32-chars-long',
      JWT_REFRESH_SECRET: 'dev-jwt-refresh-secret-key-at-least-32-chars-long',
    };

    const result = validate(config);
    expect(result).toBeDefined();
    expect(result.NODE_ENV).toBe('development');
  });
});
