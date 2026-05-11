import { LocalStorageDriver } from '../storage/local-storage.driver';
import { MemoryStorageDriver } from '../storage/memory-storage.driver';
import { GenericMockRepository } from './generic-mock.repository';
import { 
  StocktakeSessionSchema, 
  StocktakeSession 
} from '@/features/operations/types/stocktake';
import { 
  StockIssueSchema, 
  StockIssue, 
  TransferSchema, 
  Transfer, 
  AdjustmentSchema, 
  Adjustment,
  PurchaseRequestSchema,
  PurchaseRequest,
  PurchaseOrderSchema,
  PurchaseOrder,
  GRNSchema,
  GRN
} from '@/types/documents';
import {
  BranchSchema, Branch,
  WarehouseSchema, Warehouse,
  DepartmentSchema, Department,
  UoMSchema, UoM,
  CategorySchema, Category,
  ItemSchema, Item,
  LotSchema, Lot,
  SupplierSchema, Supplier,
  CurrencySchema, Currency,
  FXRateSchema, FXRate,
  BarcodeSchema, Barcode
} from '@/types/master-data';
import { KitchenRequestDetailSchema, KitchenRequestDetail } from '@/features/operations/types/kitchen-request';
import { InventoryMovementSchema, InventoryMovement } from '@/types/inventory';

const isBrowser = typeof window !== 'undefined';
const driver = isBrowser ? new LocalStorageDriver() : new MemoryStorageDriver();

// Master Data Repositories
export const branchRepo = new GenericMockRepository<Branch>(driver, 'mock_branches', BranchSchema);
export const warehouseRepo = new GenericMockRepository<Warehouse>(driver, 'mock_warehouses', WarehouseSchema);
export const departmentRepo = new GenericMockRepository<Department>(driver, 'mock_departments', DepartmentSchema);
export const uomRepo = new GenericMockRepository<UoM>(driver, 'mock_uoms', UoMSchema);
export const categoryRepo = new GenericMockRepository<Category>(driver, 'mock_categories', CategorySchema);
export const itemRepo = new GenericMockRepository<Item>(driver, 'mock_items', ItemSchema);
export const lotRepo = new GenericMockRepository<Lot>(driver, 'mock_lots', LotSchema);
export const supplierRepo = new GenericMockRepository<Supplier>(driver, 'mock_suppliers', SupplierSchema);
export const currencyRepo = new GenericMockRepository<Currency>(driver, 'mock_currencies', CurrencySchema);
export const fxRateRepo = new GenericMockRepository<FXRate>(driver, 'mock_fx_rates', FXRateSchema);
export const barcodeRepo = new GenericMockRepository<Barcode>(driver, 'mock_barcodes', BarcodeSchema);

// Operations Repositories
export const stocktakeRepo = new GenericMockRepository<StocktakeSession>(driver, 'mock_stocktake_sessions', StocktakeSessionSchema);
export const issueRepo = new GenericMockRepository<StockIssue>(driver, 'mock_issues', StockIssueSchema);
export const transferRepo = new GenericMockRepository<Transfer>(driver, 'mock_transfers', TransferSchema);
export const adjustmentRepo = new GenericMockRepository<Adjustment>(driver, 'mock_adjustments', AdjustmentSchema);
export const kitchenRequestRepo = new GenericMockRepository<KitchenRequestDetail>(driver, 'mock_kitchen_requests', KitchenRequestDetailSchema);

// Purchasing Repositories
export const prRepo = new GenericMockRepository<PurchaseRequest>(driver, 'mock_purchase_requests', PurchaseRequestSchema);
export const poRepo = new GenericMockRepository<PurchaseOrder>(driver, 'mock_purchase_orders', PurchaseOrderSchema);
export const grnRepo = new GenericMockRepository<GRN>(driver, 'mock_grns', GRNSchema);
export const movementRepo = new GenericMockRepository<InventoryMovement>(driver, 'mock_inventory_movements', InventoryMovementSchema);

export const db = {
  branches: branchRepo,
  warehouses: warehouseRepo,
  departments: departmentRepo,
  uoms: uomRepo,
  categories: categoryRepo,
  items: itemRepo,
  lots: lotRepo,
  suppliers: supplierRepo,
  currencies: currencyRepo,
  fxRates: fxRateRepo,
  barcodes: barcodeRepo,
  stocktake: stocktakeRepo,
  issues: issueRepo,
  transfers: transferRepo,
  adjustments: adjustmentRepo,
  kitchenRequests: kitchenRequestRepo,
  pr: prRepo,
  po: poRepo,
  grn: grnRepo,
  movements: movementRepo,
};

// Auto-seed on import if in browser
if (isBrowser) {
  import('./seeds').then(({ seedDatabase }) => {
    seedDatabase().catch(err => console.error('Failed to seed database:', err));
  });
}

