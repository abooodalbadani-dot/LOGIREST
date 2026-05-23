import { z } from 'zod';

export const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  PORT: z.coerce.number().default(4000),
  FRONTEND_URL: z.string().url(),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
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

  return result.data;
}
