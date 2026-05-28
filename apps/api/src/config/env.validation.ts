import { z } from 'zod';

export const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  PORT: z.coerce.number().default(4000),
  FRONTEND_URL: z.string(),
  // JWT_ACCESS_SECRET is used to sign short-lived (e.g. 15m) access tokens sent to clients
  JWT_ACCESS_SECRET: z.string().min(32),
  // JWT_REFRESH_SECRET is used to sign longer-lived (e.g. 7d) refresh tokens for session rotation
  JWT_REFRESH_SECRET: z.string().min(32),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  REDIS_URL: z.string().url().default('redis://localhost:6379'),
  IDEMPOTENCY_TTL_HOURS: z.coerce.number().default(24),
  ENCRYPTION_KEY: z
    .string()
    .min(
      32,
      'ENCRYPTION_KEY must be at least 32 characters. Generate with: openssl rand -hex 32',
    ),
  TRANSFER_OVERDUE_DAYS: z.coerce.number().min(1).default(7),
  BASE_CURRENCY_CODE: z.string().length(3).default('SAR'),
  BASE_CURRENCY_NAME: z.string().default('Saudi Riyal'),
  SMTP_FROM: z.string().email().default('noreply@logirest.app'),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validate(config: Record<string, unknown>) {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    const errorDetails = result.error.errors.map((err) => ({
      field: err.path.join('.'),
      issue: err.message,
    }));

    const missingKeys = result.error.errors.map((err) => err.path.join('.'));

    const errorLog = {
      timestamp: new Date().toISOString(),
      logLevel: 'FATAL',
      context: 'ConfigModule',
      message: `Configuration validation failed. Missing or invalid variables: ${missingKeys.join(', ')}`,
      errorDetails,
    };

    console.error(JSON.stringify(errorLog));
    process.exit(1);
  }

  // Copy validated/defaulted values back to process.env so that process.env.* has correct defaults
  for (const [key, value] of Object.entries(result.data)) {
    if (value !== undefined) {
      process.env[key] = String(value);
    }
  }

  return result.data;
}
