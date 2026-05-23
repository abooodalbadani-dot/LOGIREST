import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

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
        `SELECT migration_name FROM _prisma_migrations WHERE applied_steps_count > 0`,
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
