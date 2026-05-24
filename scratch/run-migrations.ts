import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
  try {
    await prisma.$connect();
    console.log('Connected to the database.');

    // 1. Get applied migrations
    const applied: any[] = await prisma.$queryRaw`
      SELECT migration_name FROM _prisma_migrations WHERE applied_steps_count > 0
    `;
    const appliedNames = new Set(applied.map(m => m.migration_name));
    console.log('Applied in DB:', Array.from(appliedNames));

    // 2. Read local migrations
    const migrationsDir = path.resolve(__dirname, '../apps/api/prisma/migrations');
    const localMigrations = fs
      .readdirSync(migrationsDir)
      .filter((file: string) => {
        const fullPath = path.join(migrationsDir, file);
        return fs.statSync(fullPath).isDirectory();
      })
      .sort();

    console.log('Local migrations found:', localMigrations);

    // 3. Apply unapplied migrations
    for (const migration of localMigrations) {
      if (appliedNames.has(migration)) {
        continue;
      }

      console.log(`\nApplying migration: ${migration}`);
      const sqlPath = path.join(migrationsDir, migration, 'migration.sql');
      if (!fs.existsSync(sqlPath)) {
        console.warn(`No migration.sql found for ${migration}. Skipping.`);
        continue;
      }

      const sql = fs.readFileSync(sqlPath, 'utf8');
      
      // Split statements by semicolon
      const statements = sql
        .replace(/--.*$/gm, '')
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      console.log(`Executing ${statements.length} SQL statements...`);
      for (const statement of statements) {
        console.log(`Running statement: ${statement.substring(0, 50)}...`);
        try {
          await prisma.$executeRawUnsafe(statement);
        } catch (err: any) {
          if (err.message && (err.message.includes('already exists') || err.message.includes('already a relation'))) {
            console.log(`Statement already applied (relation/column already exists). Skipping.`);
          } else {
            throw err;
          }
        }
      }

      // Register in _prisma_migrations
      const id = crypto.randomUUID();
      const now = new Date();
      const checksum = 'manual-migration-checksum';
      
      console.log('Registering migration in _prisma_migrations...');
      await prisma.$executeRawUnsafe(`
        INSERT INTO "_prisma_migrations" (
          "id",
          "checksum",
          "finished_at",
          "migration_name",
          "logs",
          "rolled_back_at",
          "started_at",
          "applied_steps_count"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, 
        id, 
        checksum, 
        now, 
        migration, 
        null, 
        null, 
        now, 
        1
      );

      console.log(`Migration ${migration} applied successfully!`);
    }

    console.log('\nAll migrations are up to date.');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
