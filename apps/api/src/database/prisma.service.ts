import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { transactionLifecycleStore } from '../common/transaction-lifecycle.context';

interface PrismaMigration {
  migration_name: string;
}

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'stdout', level: 'info' },
        { emit: 'stdout', level: 'warn' },
        { emit: 'stdout', level: 'error' },
      ],
    });

    return this;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  override $transaction<P extends Prisma.PrismaPromise<any>[]>(
    arg: [...P],
    options?: { isolationLevel?: Prisma.TransactionIsolationLevel }, // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<any>;
  override $transaction<R>(
    fn: (prisma: Prisma.TransactionClient) => Promise<R>,
    options?: {
      maxWait?: number;
      timeout?: number;
      isolationLevel?: Prisma.TransactionIsolationLevel;
    },
  ): Promise<R>;
  override async $transaction(
    arg: unknown,
    options?: unknown,
  ): Promise<unknown> {
    const callbacks: Array<() => Promise<void> | void> = [];
    return transactionLifecycleStore.run(callbacks, async () => {
      let result: unknown;
      if (typeof arg === 'function') {
        const fn = arg as (
          prisma: Prisma.TransactionClient,
        ) => Promise<unknown>;
        const opts = options as
          | {
              maxWait?: number;
              timeout?: number;
              isolationLevel?: Prisma.TransactionIsolationLevel;
            }
          | undefined;
        result = await super.$transaction(fn, opts);
      } else if (Array.isArray(arg)) {
        const arr = arg as Prisma.PrismaPromise<unknown>[];
        const opts = options as
          | { isolationLevel?: Prisma.TransactionIsolationLevel }
          | undefined;
        result = await super.$transaction(arr, opts);
      } else {
        throw new Error('Invalid arguments passed to $transaction');
      }

      // Run post-commit callbacks:
      for (const cb of callbacks) {
        try {
          await cb();
        } catch (err) {
          this.logger.error(
            `Error in post-commit callback: ${err instanceof Error ? err.message : String(err)}`,
            err instanceof Error ? err.stack : undefined,
          );
        }
      }

      return result;
    });
  }

  async onModuleInit() {
    let retries = 5;
    while (retries > 0) {
      try {
        await this.$connect();
        this.logger.log('Database connection established');
        await this.verifyMigrationSync();
        return;
      } catch (err) {
        retries--;
        this.logger.warn(
          `Database connection failed, retrying in 2 seconds... (${retries} attempts left). Error: ${err instanceof Error ? err.message : String(err)}`,
        );
        if (retries === 0) {
          throw err;
        }
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }
  }

  private async verifyMigrationSync() {
    if (process.env.NODE_ENV === 'test') {
      this.logger.log(
        'Skipping database migration alignment check in test environment',
      );
      return;
    }

    let migrationsDir = path.resolve(process.cwd(), 'prisma/migrations');
    if (!fs.existsSync(migrationsDir)) {
      migrationsDir = path.resolve(process.cwd(), 'apps/api/prisma/migrations');
    }

    if (!fs.existsSync(migrationsDir)) {
      this.logger.warn(
        `Prisma migrations directory not found at ${migrationsDir}. Skipping migration sync check.`,
      );
      return;
    }

    const localMigrations = fs
      .readdirSync(migrationsDir)
      .filter((file: string) => {
        const fullPath = path.join(migrationsDir, file);
        return fs.statSync(fullPath).isDirectory();
      });

    if (localMigrations.length === 0) {
      return;
    }

    try {
      const dbMigrations = await this.$queryRawUnsafe<PrismaMigration[]>(
        `SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL`,
      );
      const dbMigrationNames = new Set(
        dbMigrations.map((m) => m.migration_name),
      );

      const unappliedMigrations = localMigrations.filter(
        (m) => !dbMigrationNames.has(m),
      );

      if (unappliedMigrations.length > 0) {
        const errMsg = `Database is out of sync. Unapplied migrations detected: ${unappliedMigrations.join(', ')}`;
        this.logger.error(errMsg);
        process.exit(1);
      } else {
        this.logger.log('Database migration alignment verified (zero drift)');
      }
    } catch (err) {
      this.logger.error(
        `Failed to verify database migration status: ${err instanceof Error ? err.message : String(err)}`,
      );
      process.exit(1);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Database connection closed');
  }
}
