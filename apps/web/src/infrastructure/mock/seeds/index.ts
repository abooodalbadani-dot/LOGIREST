import { db } from '../mock-database';
import { 
  initialBranches, initialWarehouses, initialDepartments, 
  initialSuppliers, initialCategories, initialUoMs, 
  initialItems, initialBarcodes, initialCurrencies, initialFXRates, initialLots 
} from './master-data.seed';
import { initialIssues, initialStocktakeSessions } from './operations.seed';
import { initialPRs, initialPOs, initialGRNs } from './purchasing.seed';

export async function seedDatabase() {
  console.log('🌱 Seeding mock database...');

  // Master Data
  await seedIfEmpty(db.branches, initialBranches);
  await seedIfEmpty(db.warehouses, initialWarehouses);
  await seedIfEmpty(db.departments, initialDepartments);
  await seedIfEmpty(db.suppliers, initialSuppliers);
  await seedIfEmpty(db.categories, initialCategories);
  await seedIfEmpty(db.uoms, initialUoMs);
  await seedIfEmpty(db.items, initialItems);
  await seedIfEmpty(db.barcodes, initialBarcodes);
  await seedIfEmpty(db.currencies, initialCurrencies);
  await seedIfEmpty(db.fxRates, initialFXRates);
  await seedIfEmpty(db.lots, initialLots);

  // Operations
  await seedIfEmpty(db.issues, initialIssues);
  await seedIfEmpty(db.stocktake, initialStocktakeSessions);
  
  // Purchasing
  await seedIfEmpty(db.pr, initialPRs);
  await seedIfEmpty(db.po, initialPOs);
  await seedIfEmpty(db.grn, initialGRNs);

  console.log('✅ Database seeded successfully!');
}

async function seedIfEmpty<T extends { id: string | number }>(
  repo: { findAll: () => Promise<T[]>; saveAll: (data: T[]) => Promise<T[]> }, 
  data: T[]
) {
  try {
    const existing = await repo.findAll();
    if (existing.length === 0) {
      await repo.saveAll(data);
    }
  } catch (error) {
    console.warn('🌱 Seed validation failed or data stale, re-seeding...', error);
    // If validation fails, we force-overwrite with seed data to stabilize the environment
    await repo.saveAll(data);
  }
}
