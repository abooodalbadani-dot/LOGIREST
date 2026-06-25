import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const EXCLUDED_TABLES = [
  'users',
  'user_warehouse_scopes',
  'user_branch_scopes',
  'user_department_scopes',
  'refresh_tokens',
  'password_reset_tokens',
  'email_templates',
  '_prisma_migrations',
  'system_settings',
  'branches',
  'departments',
  'warehouses',
  'units_of_measure',
  'currencies',
];

async function main() {
  console.log('🔄 Querying database tables for selective wipe...');

  // 1. Retrieve all public tables dynamically
  const tables: Array<{ tablename: string }> = await prisma.$queryRawUnsafe(`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  `);

  const allTableNames = tables.map((t) => t.tablename);

  // 2. Filter tables to wipe and preserve
  const tablesToWipe = allTableNames.filter(
    (name) => !EXCLUDED_TABLES.includes(name.toLowerCase())
  );

  const preservedTables = allTableNames.filter(
    (name) => EXCLUDED_TABLES.includes(name.toLowerCase())
  );

  console.log('\n🛡️  [Preserved Tables]:');
  console.log(preservedTables.map((t) => `  - ${t}`).join('\n'));

  if (tablesToWipe.length === 0) {
    console.log('\n✅ No tables to wipe.');
    return;
  }

  console.log('\n🧹 [Tables to Wipe]:');
  console.log(tablesToWipe.map((t) => `  - ${t}`).join('\n'));

  // 3. Construct and execute the truncate command with CASCADE
  // We double-quote table names to prevent casing issues in PostgreSQL.
  const quotedTableNames = tablesToWipe.map((t) => `"${t}"`).join(', ');
  const truncateQuery = `TRUNCATE TABLE ${quotedTableNames} CASCADE;`;

  console.log('\n⚡ Executing Truncate CASCADE...');
  await prisma.$executeRawUnsafe(truncateQuery);

  console.log('\n🎉 Database wipe complete!');
}

main()
  .catch((error) => {
    console.error('\n❌ Wipe failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
