/* eslint-disable @typescript-eslint/unbound-method */
import { validate } from '../src/config/env.validation';

describe('Config Validation', () => {
  let originalExit: typeof process.exit;
  let originalError: typeof console.error;
  let mockExit: jest.Mock;
  let mockError: jest.Mock;

  beforeAll(() => {
    originalExit = process.exit;
    originalError = console.error;
  });

  beforeEach(() => {
    mockExit = jest.fn();
    mockError = jest.fn();
    process.exit = mockExit as unknown as (
      code?: string | number | null,
    ) => never;
    console.error = mockError as any;
  });

  afterAll(() => {
    process.exit = originalExit;
    console.error = originalError;
  });

  it('should pass with valid config', () => {
    const validConfig = {
      DATABASE_URL: 'postgresql://localhost:5432/test',
      PORT: '3000',
      FRONTEND_URL: 'http://localhost:3000',
      JWT_ACCESS_SECRET: 'a'.repeat(32),
      JWT_REFRESH_SECRET: 'b'.repeat(32),
      ENCRYPTION_KEY: 'c'.repeat(32),
    };

    const result = validate(validConfig);
    expect(result).toBeDefined();
    expect(result.PORT).toBe(3000);
    expect(mockExit).not.toHaveBeenCalled();
  });

  it('should fail, log FATAL JSON, and exit if a required variable is missing', () => {
    const invalidConfig = {
      DATABASE_URL: 'postgresql://localhost:5432/test',
      PORT: '3000',
    };

    validate(invalidConfig);

    expect(mockExit).toHaveBeenCalledWith(1);
    expect(mockError).toHaveBeenCalled();

    const loggedText = mockError.mock.calls[0][0] as string;
    const logObj = JSON.parse(loggedText);

    expect(logObj.logLevel).toBe('FATAL');
    expect(logObj.context).toBe('ConfigModule');
    expect(logObj.message).toContain('Configuration validation failed');
    expect(logObj.errorDetails).toBeDefined();
    expect(
      logObj.errorDetails.some((d: any) => d.field === 'JWT_ACCESS_SECRET'),
    ).toBe(true);
  });

  it('should fail if ENCRYPTION_KEY is missing or too short', () => {
    const shortKeyConfig = {
      DATABASE_URL: 'postgresql://localhost:5432/test',
      PORT: '3000',
      FRONTEND_URL: 'http://localhost:3000',
      JWT_ACCESS_SECRET: 'a'.repeat(32),
      JWT_REFRESH_SECRET: 'b'.repeat(32),
      ENCRYPTION_KEY: 'too-short',
    };

    validate(shortKeyConfig);

    expect(mockExit).toHaveBeenCalledWith(1);
    expect(mockError).toHaveBeenCalled();

    const loggedText = mockError.mock.calls[0][0] as string;
    const logObj = JSON.parse(loggedText);
    expect(
      logObj.errorDetails.some((d: any) => d.field === 'ENCRYPTION_KEY'),
    ).toBe(true);
  });
});
