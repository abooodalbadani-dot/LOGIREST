'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { paginatedSchema } from '@/types/api';
import { StockBalanceItemSchema, InventoryMovementSchema, DashboardKPISchema } from '@/types/inventory';
import { 
 BranchSchema, 
 WarehouseSchema, 
 ItemSchema, 
 SupplierSchema, 
 LotSchema, 
 CategorySchema, 
 CurrencySchema, 
 DepartmentSchema, 
 UoMSchema, 
 BarcodeSchema 
} from '@/types/master-data';
import { 
 GRNSchema, 
 PurchaseOrderSchema, 
 PurchaseRequestSchema, 
 StockIssueSchema, 
 TransferSchema, 
 AdjustmentSchema 
} from '@/types/documents';
import { StocktakeSessionSchema } from '@/types/stocktake';
import { AuthUserSchema } from '@/types/auth';
import { AuditLogEntrySchema } from '@/types/notifications';
import { z } from 'zod';

interface WebMCPContextType {
 isAvailable: boolean;
 registeredTools: Omit<WebMCPTool, 'execute'>[];
}

const WebMCPContext = createContext<WebMCPContextType>({
 isAvailable: false,
 registeredTools: []
});

export const useWebMCP = () => useContext(WebMCPContext);

interface WebMCPTool {
 name: string;
 description: string;
 parameters: {
 type: 'object';
 properties: Record<string, { type: string; description?: string }>;
 required?: string[];
 };
 execute: (args: Record<string, unknown>) => Promise<unknown>;
}

interface WebMCPNavigator extends Navigator {
 modelContext?: {
 registerTool: (tool: WebMCPTool) => void;
 };
}

export function WebMCPProvider({ children }: { children: React.ReactNode }) {
 const [isAvailable, setIsAvailable] = useState(false);
 const [registeredTools, setRegisteredTools] = useState<Omit<WebMCPTool, 'execute'>[]>([]);
 // Guard against React Strict Mode double-effect invocations and HMR remounts.
 // The provider lives at the root layout and is never truly unmounted during the
 // page's lifetime, so a ref is the correct primitive here.
 const hasRegistered = useRef(false);

 useEffect(() => {
 if (hasRegistered.current) return;

 const nav = navigator as WebMCPNavigator;
 if (nav.modelContext && typeof nav.modelContext.registerTool === 'function') {
 console.log('⚡ WebMCP detected, starting registration...');
 try {
 hasRegistered.current = true;
 const modelContext = nav.modelContext;
 const toolsMetadata: Omit<WebMCPTool, 'execute'>[] = [];
 setTimeout(() => setIsAvailable(true), 0);

 const register = (tool: WebMCPTool) => {
 try {
 modelContext.registerTool(tool);
 const { execute: _execute, ...metadata } = tool;
 toolsMetadata.push(metadata);
 console.log(`✅ Tool registered: ${tool.name}`);
 } catch (err) {
 console.error(`❌ Failed to register tool ${tool.name}:`, err);
 }
 };

 // Register Discovery Tool
 register({
 name: 'discover_tools',
 description: 'Returns a list of all available system tools, their descriptions, and parameters.',
 parameters: {
 type: 'object',
 properties: {}
 },
 execute: async () => {
 return toolsMetadata;
 }
 });

 // Register Inventory Balance Tool
 register({
 name: 'get_inventory_balance',
 description: 'Fetch the current stock balance of items in the kitchen or store. Can be filtered by warehouse, search term, or page.',
 parameters: {
 type: 'object',
 properties: {
 warehouse_id: { type: 'string', description: 'Optional warehouse ID to filter by' },
 search: { type: 'string', description: 'Search term for item name or SKU' },
 page: { type: 'number', description: 'Page number for pagination' }
 }
 },
 execute: async (args: Record<string, unknown>) => {
 const params = args as { warehouse_id?: string; search?: string; page?: number };
 const qs = new URLSearchParams();
 if (params.warehouse_id) qs.append('warehouse_id', String(params.warehouse_id));
 if (params.search) qs.append('search', String(params.search));
 if (params.page) qs.append('page', String(params.page));
 const path = `/inventory/balance ${qs.toString() ? `?${qs.toString()}` : ''}`;
 return apiClient.get(path, paginatedSchema(StockBalanceItemSchema));
 }
 });

 // Register Inventory Lots Tool
 register({
 name: 'get_inventory_lots',
 description: 'Fetch specific lots/batches for an item, including expiry dates and available quantities.',
 parameters: {
 type: 'object',
 properties: {
 item_id: { type: 'string', description: 'Required item ID' },
 warehouse_id: { type: 'string', description: 'Optional warehouse ID' }
 },
 required: ['item_id']
 },
 execute: async (args: Record<string, unknown>) => {
 const params = args as { item_id: string; warehouse_id?: string };
 const qs = new URLSearchParams();
 qs.append('item_id', params.item_id);
 if (params.warehouse_id) qs.append('warehouse_id', params.warehouse_id);
 return apiClient.get(`/inventory/lots?${qs.toString()}`, z.array(LotSchema));
 }
 });

 // Register Item Details Tool
 register({
 name: 'get_item_details',
 description: 'Fetch comprehensive details for a specific inventory item by ID.',
 parameters: {
 type: 'object',
 properties: {
 id: { type: 'string', description: 'Item ID' }
 },
 required: ['id']
 },
 execute: async (args: Record<string, unknown>) => {
 return apiClient.get(`/items/ ${args.id}`, ItemSchema);
 }
 });

 // Register Supplier Details Tool
 register({
 name: 'get_supplier_details',
 description: 'Fetch comprehensive details for a specific supplier.',
 parameters: {
 type: 'object',
 properties: {
 id: { type: 'string', description: 'Supplier ID' }
 },
 required: ['id']
 },
 execute: async (args: Record<string, unknown>) => {
 return apiClient.get(`/suppliers/ ${args.id}`, SupplierSchema);
 }
 });

 // Register Warehouse Details Tool
 register({
 name: 'get_warehouse_details',
 description: 'Fetch comprehensive details for a specific warehouse.',
 parameters: {
 type: 'object',
 properties: {
 id: { type: 'string', description: 'Warehouse ID' }
 },
 required: ['id']
 },
 execute: async (args: Record<string, unknown>) => {
 return apiClient.get(`/warehouses/ ${args.id}`, WarehouseSchema);
 }
 });

 // Register Inventory Movements Tool
 register({
 name: 'get_inventory_movements',
 description: 'Fetch the history of inventory movements (issues, stocktakes, transfers).',
 parameters: {
 type: 'object',
 properties: {
 search: { type: 'string', description: 'Search term for item or document reference' },
 page: { type: 'number', description: 'Page number' },
 document_type: { type: 'string', description: 'Filter by document type (e.g., ISSUE, STOCKTAKE)' }
 }
 },
 execute: async (args: Record<string, unknown>) => {
 const params = args as { search?: string; page?: number; document_type?: string };
 const qs = new URLSearchParams();
 if (params.search) qs.append('search', String(params.search));
 if (params.page) qs.append('page', String(params.page));
 if (params.document_type) qs.append('document_type', String(params.document_type));
 const path = `/inventory/movements ${qs.toString() ? `?${qs.toString()}` : ''}`;
 return apiClient.get(path, paginatedSchema(InventoryMovementSchema));
 }
 });

 // Register FEFO Sorting Tool
 register({
 name: 'fefo_sort_lots',
 description: 'Sort a list of lots using First-Expired-First-Out (FEFO) logic. Lots with null expiry dates are moved to the end.',
 parameters: {
 type: 'object',
 properties: {
 lots: {
 type: 'array',
 description: 'Array of lot objects with expiry_date (ISO string)'
 }
 },
 required: ['lots']
 },
 execute: async (args: Record<string, unknown>) => {
 const { lots } = args as { lots: Array<{ expiry_date: string | null }> };
 return [...lots].sort((a, b) => {
 if (!a.expiry_date && !b.expiry_date) return 0;
 if (!a.expiry_date) return 1;
 if (!b.expiry_date) return -1;
 return new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime();
 });
 }
 });

 // Register Expiry Check Tool
 register({
 name: 'check_lot_expiry',
 description: 'Checks if a lot is expired or nearing expiry.',
 parameters: {
 type: 'object',
 properties: {
 expiry_date: { type: 'string', description: 'Expiry date ISO string' },
 near_expiry_days: { type: 'number', description: 'Threshold in days to consider as nearing expiry (default 30)' }
 },
 required: ['expiry_date']
 },
 execute: async (args: Record<string, unknown>) => {
 const { expiry_date, near_expiry_days = 30 } = args as { expiry_date: string; near_expiry_days?: number };
 const exp = new Date(expiry_date);
 const now = new Date();
 const cutoff = new Date();
 cutoff.setDate(now.getDate() + near_expiry_days);

 return {
 is_expired: exp < now,
 is_near_expiry: exp <= cutoff && exp >= now,
 days_until_expiry: Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
 };
 }
 });

 // Register Stock Transfers Tool
 register({
 name: 'get_stock_transfers',
 description: 'Fetch the list of inventory transfers between warehouses.',
 parameters: {
 type: 'object',
 properties: {
 status: { type: 'string', description: 'Filter by status (DRAFT, IN_TRANSIT, RECEIVED)' },
 page: { type: 'number', description: 'Page number' }
 }
 },
 execute: async (args: Record<string, unknown>) => {
 const params = args as { status?: string; page?: number };
 const qs = new URLSearchParams();
 if (params.status) qs.append('transfer_status', String(params.status));
 if (params.page) qs.append('page', String(params.page));
 return apiClient.get(`/operations/transfers ${qs.toString() ? `?${qs.toString()}` : ''}`, paginatedSchema(TransferSchema));
 }
 });

 // Register Stock Adjustments Tool
 register({
 name: 'get_stock_adjustments',
 description: 'Fetch the list of inventory adjustments (damage, theft, etc.).',
 parameters: {
 type: 'object',
 properties: {
 status: { type: 'string', description: 'Filter by status (DRAFT, POSTED)' },
 page: { type: 'number', description: 'Page number' }
 }
 },
 execute: async (args: Record<string, unknown>) => {
 const params = args as { status?: string; page?: number };
 const qs = new URLSearchParams();
 if (params.status) qs.append('status', String(params.status));
 if (params.page) qs.append('page', String(params.page));
 return apiClient.get(`/operations/adjustments ${qs.toString() ? `?${qs.toString()}` : ''}`, paginatedSchema(AdjustmentSchema));
 }
 });

 // Register Stocktakes Tool
 register({
 name: 'get_stocktakes',
 description: 'Fetch the list of stocktake sessions.',
 parameters: {
 type: 'object',
 properties: {
 status: { type: 'string', description: 'Filter by status (DRAFT, COMPLETED)' },
 page: { type: 'number', description: 'Page number' }
 }
 },
 execute: async (args: Record<string, unknown>) => {
 const params = args as { status?: string; page?: number };
 const qs = new URLSearchParams();
 if (params.status) qs.append('status', String(params.status));
 if (params.page) qs.append('page', String(params.page));
 return apiClient.get(`/operations/stocktakes ${qs.toString() ? `?${qs.toString()}` : ''}`, paginatedSchema(StocktakeSessionSchema));
 }
 });

 // Register Stocktake Details Tool
 register({
 name: 'get_stocktake_details',
 description: 'Fetch detailed information about a stocktake session, including snapshotted and counted quantities.',
 parameters: {
 type: 'object',
 properties: {
 id: { type: 'string', description: 'Stocktake ID' }
 },
 required: ['id']
 },
 execute: async (args: Record<string, unknown>) => {
 return apiClient.get(`/operations/stocktakes/ ${args.id}`, StocktakeSessionSchema);
 }
 });

 // Register Issue Details Tool
 register({
 name: 'get_issue_details',
 description: 'Fetch detailed information about a stock issue / requisition.',
 parameters: {
 type: 'object',
 properties: {
 id: { type: 'string', description: 'Issue ID' }
 },
 required: ['id']
 },
 execute: async (args: Record<string, unknown>) => {
 return apiClient.get(`/operations/issues/ ${args.id}`, StockIssueSchema);
 }
 });

 // Register Stocktake Actions Tool
 register({
 name: 'manage_stocktake_status',
 description: 'Change the status of a stocktake session (START, BEGIN_COUNTING, APPROVE, POST).',
 parameters: {
 type: 'object',
 properties: {
 id: { type: 'string', description: 'Stocktake ID' },
 action: { type: 'string', description: 'Action to perform (start, begin-counting, approve, post)' },
 comment: { type: 'string', description: 'Optional comment for approval' }
 },
 required: ['id', 'action']
 },
 execute: async (args: Record<string, unknown>) => {
 const { id, action, comment } = args as { id: string; action: string; comment?: string };
 const pathMap: Record<string, string> = {
 'start': `/operations/stocktakes/ ${id}/start`,
 'begin-counting': `/operations/stocktakes/ ${id}/begin-counting`,
 'approve': `/operations/stocktakes/ ${id}/approve`,
 'post': `/operations/stocktakes/ ${id}/post`
 };
 const path = pathMap[action];
 if (!path) throw new Error('Invalid action');
 return apiClient.post(path, StocktakeSessionSchema, { comment });
 }
 });

 // Register Suppliers Tool
 register({
 name: 'get_suppliers',
 description: 'Fetch the list of suppliers for procurement.',
 parameters: {
 type: 'object',
 properties: {
 search: { type: 'string', description: 'Search term for supplier name or code' },
 page: { type: 'number', description: 'Page number' }
 }
 },
 execute: async (args: Record<string, unknown>) => {
 const params = args as { search?: string; page?: number };
 const qs = new URLSearchParams();
 if (params.search) qs.append('search', String(params.search));
 if (params.page) qs.append('page', String(params.page));
 return apiClient.get(`/suppliers ${qs.toString() ? `?${qs.toString()}` : ''}`, paginatedSchema(SupplierSchema));
 }
 });

 // Register Branches Tool
 register({
 name: 'get_branches',
 description: 'Fetch the list of company branches.',
 parameters: {
 type: 'object',
 properties: {
 search: { type: 'string', description: 'Search term for branch name or code' },
 page: { type: 'number', description: 'Page number' }
 }
 },
 execute: async (args: Record<string, unknown>) => {
 const params = args as { search?: string; page?: number };
 const qs = new URLSearchParams();
 if (params.search) qs.append('search', String(params.search));
 if (params.page) qs.append('page', String(params.page));
 return apiClient.get(`/branches ${qs.toString() ? `?${qs.toString()}` : ''}`, paginatedSchema(BranchSchema));
 }
 });

 // Register Items Tool
 register({
 name: 'get_items',
 description: 'Fetch the catalog of inventory items.',
 parameters: {
 type: 'object',
 properties: {
 search: { type: 'string', description: 'Search term for item name or SKU' },
 category_id: { type: 'string', description: 'Filter by category ID' },
 page: { type: 'number', description: 'Page number' }
 }
 },
 execute: async (args: Record<string, unknown>) => {
 const params = args as { search?: string; category_id?: string; page?: number };
 const qs = new URLSearchParams();
 if (params.search) qs.append('search', String(params.search));
 if (params.category_id) qs.append('category_id', String(params.category_id));
 if (params.page) qs.append('page', String(params.page));
 return apiClient.get(`/items ${qs.toString() ? `?${qs.toString()}` : ''}`, paginatedSchema(ItemSchema));
 }
 });

 // Register Purchase Orders Tool
 register({
 name: 'get_purchase_orders',
 description: 'Fetch the list of purchase orders sent to suppliers.',
 parameters: {
 type: 'object',
 properties: {
 status: { type: 'string', description: 'Filter by status (DRAFT, POSTED, APPROVED)' },
 page: { type: 'number', description: 'Page number' }
 }
 },
 execute: async (args: Record<string, unknown>) => {
 const params = args as { status?: string; page?: number };
 const qs = new URLSearchParams();
 if (params.status) qs.append('status', String(params.status));
 if (params.page) qs.append('page', String(params.page));
 return apiClient.get(`/procurement/purchase-orders ${qs.toString() ? `?${qs.toString()}` : ''}`, paginatedSchema(PurchaseOrderSchema));
 }
 });

 // Register Purchase Requests Tool
 register({
 name: 'get_purchase_requests',
 description: 'Fetch the list of internal purchase requests for stock replenishment.',
 parameters: {
 type: 'object',
 properties: {
 status: { type: 'string', description: 'Filter by status (DRAFT, APPROVED, REJECTED)' },
 page: { type: 'number', description: 'Page number' }
 }
 },
 execute: async (args: Record<string, unknown>) => {
 const params = args as { status?: string; page?: number };
 const qs = new URLSearchParams();
 if (params.status) qs.append('status', String(params.status));
 if (params.page) qs.append('page', String(params.page));
 return apiClient.get(`/procurement/purchase-requests ${qs.toString() ? `?${qs.toString()}` : ''}`, paginatedSchema(PurchaseRequestSchema));
 }
 });

 // Register Goods Received Notes Tool
 register({
 name: 'get_goods_received_notes',
 description: 'Fetch the list of goods received notes (GRN) from suppliers.',
 parameters: {
 type: 'object',
 properties: {
 status: { type: 'string', description: 'Filter by status (DRAFT, POSTED)' },
 page: { type: 'number', description: 'Page number' }
 }
 },
 execute: async (args: Record<string, unknown>) => {
 const params = args as { status?: string; page?: number };
 const qs = new URLSearchParams();
 if (params.status) qs.append('status', String(params.status));
 if (params.page) qs.append('page', String(params.page));
 return apiClient.get(`/procurement/goods-received ${qs.toString() ? `?${qs.toString()}` : ''}`, paginatedSchema(GRNSchema));
 }
 });

 // Register Warehouses Tool
 register({
 name: 'get_warehouses',
 description: 'Fetch the list of warehouses and inventory storage nodes.',
 parameters: {
 type: 'object',
 properties: {
 search: { type: 'string', description: 'Search term for warehouse name or code' },
 page: { type: 'number', description: 'Page number' }
 }
 },
 execute: async (args: Record<string, unknown>) => {
 const params = args as { search?: string; page?: number };
 const qs = new URLSearchParams();
 if (params.search) qs.append('search', String(params.search));
 if (params.page) qs.append('page', String(params.page));
 return apiClient.get(`/warehouses ${qs.toString() ? `?${qs.toString()}` : ''}`, paginatedSchema(WarehouseSchema));
 }
 });

 // Register Barcodes Tool
 register({
 name: 'get_barcodes',
 description: 'Fetch the list of registered barcodes and their linked items.',
 parameters: {
 type: 'object',
 properties: {
 search: { type: 'string', description: 'Search term for barcode or item' },
 page: { type: 'number', description: 'Page number' }
 }
 },
 execute: async (args: Record<string, unknown>) => {
 const params = args as { search?: string; page?: number };
 const qs = new URLSearchParams();
 if (params.search) qs.append('search', String(params.search));
 if (params.page) qs.append('page', String(params.page));
 return apiClient.get(`/barcodes ${qs.toString() ? `?${qs.toString()}` : ''}`, paginatedSchema(BarcodeSchema));
 }
 });

 // Register Categories Tool
 register({
 name: 'get_categories',
 description: 'Fetch the catalog of item categories.',
 parameters: {
 type: 'object',
 properties: {
 search: { type: 'string', description: 'Search term' },
 page: { type: 'number', description: 'Page number' }
 }
 },
 execute: async (args: Record<string, unknown>) => {
 const params = args as { search?: string; page?: number };
 const qs = new URLSearchParams();
 if (params.search) qs.append('search', String(params.search));
 if (params.page) qs.append('page', String(params.page));
 return apiClient.get(`/categories ${qs.toString() ? `?${qs.toString()}` : ''}`, paginatedSchema(CategorySchema));
 }
 });

 // Register Currencies Tool
 register({
 name: 'get_currencies',
 description: 'Fetch the list of supported currencies and their FX settings.',
 parameters: {
 type: 'object',
 properties: {
 search: { type: 'string', description: 'Search term' },
 page: { type: 'number', description: 'Page number' }
 }
 },
 execute: async (args: Record<string, unknown>) => {
 const params = args as { search?: string; page?: number };
 const qs = new URLSearchParams();
 if (params.search) qs.append('search', String(params.search));
 if (params.page) qs.append('page', String(params.page));
 return apiClient.get(`/currencies ${qs.toString() ? `?${qs.toString()}` : ''}`, paginatedSchema(CurrencySchema));
 }
 });

 // Register Departments Tool
 register({
 name: 'get_departments',
 description: 'Fetch the list of organizational departments.',
 parameters: {
 type: 'object',
 properties: {
 search: { type: 'string', description: 'Search term' },
 page: { type: 'number', description: 'Page number' }
 }
 },
 execute: async (args: Record<string, unknown>) => {
 const params = args as { search?: string; page?: number };
 const qs = new URLSearchParams();
 if (params.search) qs.append('search', String(params.search));
 if (params.page) qs.append('page', String(params.page));
 return apiClient.get(`/departments ${qs.toString() ? `?${qs.toString()}` : ''}`, paginatedSchema(DepartmentSchema));
 }
 });

 // Register Units of Measure Tool
 register({
 name: 'get_units_of_measure',
 description: 'Fetch the list of units of measure (UOM) for inventory items.',
 parameters: {
 type: 'object',
 properties: {
 search: { type: 'string', description: 'Search term' },
 page: { type: 'number', description: 'Page number' }
 }
 },
 execute: async (args: Record<string, unknown>) => {
 const params = args as { search?: string; page?: number };
 const qs = new URLSearchParams();
 if (params.search) qs.append('search', String(params.search));
 if (params.page) qs.append('page', String(params.page));
 return apiClient.get(`/units-of-measure ${qs.toString() ? `?${qs.toString()}` : ''}`, paginatedSchema(UoMSchema));
 }
 });

 // Register Admin Users Tool
 register({
 name: 'get_admin_users',
 description: 'Fetch the list of users and their access scopes (Admin only).',
 parameters: {
 type: 'object',
 properties: {
 page: { type: 'number', description: 'Page number' }
 }
 },
 execute: async (args: Record<string, unknown>) => {
 const params = args as { page?: number };
 const qs = new URLSearchParams();
 if (params.page) qs.append('page', String(params.page));
 return apiClient.get(`/admin/users ${qs.toString() ? `?${qs.toString()}` : ''}`, paginatedSchema(AuthUserSchema));
 }
 });

 // Register Audit Logs Tool
 register({
 name: 'get_audit_logs',
 description: 'Fetch the system audit log history (Admin only).',
 parameters: {
 type: 'object',
 properties: {
 page: { type: 'number', description: 'Page number' }
 }
 },
 execute: async (args: Record<string, unknown>) => {
 const params = args as { page?: number };
 const qs = new URLSearchParams();
 if (params.page) qs.append('page', String(params.page));
 return apiClient.get(`/admin/audit-logs ${qs.toString() ? `?${qs.toString()}` : ''}`, paginatedSchema(AuditLogEntrySchema));
 }
 });

 // --- MUTATION TOOLS ---

 // Register Create Purchase Order Tool
 register({
 name: 'create_purchase_order',
 description: 'Create a new purchase order draft for a supplier.',
 parameters: {
 type: 'object',
 properties: {
 supplier_id: { type: 'string', description: 'ID of the supplier' },
 target_warehouse_id: { type: 'string', description: 'ID of the delivery warehouse' },
 currency_id: { type: 'string', description: 'Currency code (USD, EUR, etc.)' },
 notes: { type: 'string', description: 'Optional order notes' },
 lines: {
 type: 'array',
 description: 'Array of items to order. Each object should have item_id, qty, uom_id, and unit_cost_foreign.'
 }
 },
 required: ['supplier_id', 'target_warehouse_id', 'currency_id', 'lines']
 },
 execute: async (args: Record<string, unknown>) => {
 return apiClient.post('/procurement/purchase-orders', PurchaseOrderSchema, args);
 }
 });

 // Register Post Purchase Order Tool
 register({
 name: 'post_purchase_order',
 description: 'Post and finalize a purchase order draft. This is an irreversible action.',
 parameters: {
 type: 'object',
 properties: {
 order_id: { type: 'string', description: 'ID of the purchase order to post' }
 },
 required: ['order_id']
 },
 execute: async (args: Record<string, unknown>) => {
 const { order_id } = args as { order_id: string };
 return apiClient.post(`/procurement/purchase-orders/ ${order_id}/post`, PurchaseOrderSchema, {});
 }
 });

 // Register Post Goods Received Tool
 register({
 name: 'post_goods_received',
 description: 'Confirm and post a Goods Received Note (GRN) to update inventory.',
 parameters: {
 type: 'object',
 properties: {
 grn_id: { type: 'string', description: 'ID of the GRN to post' },
 fx_rate: { type: 'number', description: 'Foreign exchange rate at time of receipt' },
 confirmation: { type: 'string', description: 'Must be "ACKNOWLEDGE_IRREVERSIBLE"' }
 },
 required: ['grn_id', 'fx_rate', 'confirmation']
 },
 execute: async (args: Record<string, unknown>) => {
 const { grn_id, ...payload } = args as { grn_id: string, fx_rate: number, confirmation: string };
 return apiClient.post(`/procurement/grns/ ${grn_id}/post`, GRNSchema, payload);
 }
 });

 // Register Create Inventory Adjustment Tool
 register({
 name: 'create_inventory_adjustment',
 description: 'Create a new stock adjustment (positive or negative) for a warehouse.',
 parameters: {
 type: 'object',
 properties: {
 warehouse_id: { type: 'string', description: 'ID of the warehouse' },
 reason: { type: 'string', description: 'Reason for adjustment (e.g. BREAKAGE, FOUND)' },
 notes: { type: 'string', description: 'Optional details' },
 lines: {
 type: 'array',
 description: 'Array of items. Each object should have item_id, qty (can be negative), and uom_id.'
 }
 },
 required: ['warehouse_id', 'reason', 'lines']
 },
 execute: async (args: Record<string, unknown>) => {
 return apiClient.post('/operations/adjustments', AdjustmentSchema, args);
 }
 });

 // Register Create Inventory Transfer Tool
 register({
 name: 'create_inventory_transfer',
 description: 'Create a new stock transfer request between two warehouses.',
 parameters: {
 type: 'object',
 properties: {
 from_warehouse_id: { type: 'string', description: 'Source warehouse ID' },
 to_warehouse_id: { type: 'string', description: 'Destination warehouse ID' },
 notes: { type: 'string', description: 'Optional notes' },
 lines: {
 type: 'array',
 description: 'Array of items. Each object should have item_id, qty, and uom_id.'
 }
 },
 required: ['from_warehouse_id', 'to_warehouse_id', 'lines']
 },
 execute: async (args: Record<string, unknown>) => {
 return apiClient.post('/operations/transfers', TransferSchema, args);
 }
 });

 // Register Create Inventory Issue Tool
 register({
 name: 'create_inventory_issue',
 description: 'Create a new stock issue (requisition) from a warehouse to a department.',
 parameters: {
 type: 'object',
 properties: {
 warehouse_id: { type: 'string', description: 'ID of the source warehouse' },
 department_id: { type: 'string', description: 'ID of the receiving department' },
 notes: { type: 'string', description: 'Optional notes' },
 items: {
 type: 'array',
 description: 'Array of items. Each object should have itemId and requestedQuantity.'
 }
 },
 required: ['warehouse_id', 'department_id', 'items']
 },
 execute: async (args: Record<string, unknown>) => {
 return apiClient.post('/operations/issues', StockIssueSchema, args);
 }
 });

 // Register Post Inventory Issue Tool
 register({
 name: 'post_inventory_issue',
 description: 'Finalize and post a stock issue, updating inventory levels.',
 parameters: {
 type: 'object',
 properties: {
 issue_id: { type: 'string', description: 'ID of the issue to post' }
 },
 required: ['issue_id']
 },
 execute: async (args: Record<string, unknown>) => {
 const { issue_id } = args as { issue_id: string };
 return apiClient.post(`/operations/issues/ ${issue_id}/post`, StockIssueSchema, {});
 }
 });

 // Register Create Purchase Request Tool
 register({
 name: 'create_purchase_request',
 description: 'Create a new internal purchase request for stock replenishment.',
 parameters: {
 type: 'object',
 properties: {
 branch_id: { type: 'string', description: 'ID of the requesting branch' },
 expected_date: { type: 'string', description: 'Expected delivery date (ISO)' },
 notes: { type: 'string', description: 'Optional notes' },
 items: {
 type: 'array',
 description: 'Array of items. Each object should have item_id and quantity.'
 }
 },
 required: ['branch_id', 'items']
 },
 execute: async (args: Record<string, unknown>) => {
 return apiClient.post('/procurement/purchase-requests', PurchaseRequestSchema, args);
 }
 });

 // Register Dashboard KPIs Tool
 register({
 name: 'get_dashboard_kpis',
 description: 'Fetch high-level performance indicators (inventory value, low stock count, etc.).',
 parameters: {
 type: 'object',
 properties: {}
 },
 execute: async () => {
 return apiClient.get('/dashboard/kpis', DashboardKPISchema);
 }
 });

 setTimeout(() => setRegisteredTools(toolsMetadata), 0);
 console.log('⚡ WebMCP tools registered successfully');
 } catch (err) {
 console.error('❌ WebMCP registration failed:', err);
 }
 }
 }, []);

 return (
 <WebMCPContext.Provider value={{ isAvailable, registeredTools }}>
 {children}
 </WebMCPContext.Provider>
 );
}
