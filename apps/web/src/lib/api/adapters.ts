/**
 * API Adapters
 * Utilities to normalize backend snake_case data into frontend camelCase structures.
 */

import { 
  PurchaseRequest, 
  PurchaseOrder, 
  GRN, 
  Transfer, 
  StockIssue, 
  Adjustment,
  BaseDocument
} from '@/types/documents';

/**
 * Recursive function to convert snake_case keys to camelCase
 */
export function toCamelCase<T>(obj: any): T {
  if (Array.isArray(obj)) {
    return obj.map(v => toCamelCase(v)) as any;
  }
  if (obj !== null && typeof obj === 'object' && !(obj instanceof Date)) {
    return Object.keys(obj).reduce((acc, key) => {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      acc[camelKey] = toCamelCase(obj[key]);
      return acc;
    }, {} as any);
  }
  return obj;
}

/**
 * Recursive function to convert camelCase keys to snake_case
 */
export function toSnakeCase<T>(obj: any): T {
  if (Array.isArray(obj)) {
    return obj.map(v => toSnakeCase(v)) as any;
  }
  if (obj !== null && typeof obj === 'object' && !(obj instanceof Date)) {
    return Object.keys(obj).reduce((acc, key) => {
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      acc[snakeKey] = toSnakeCase(obj[key]);
      return acc;
    }, {} as any);
  }
  return obj;
}

/**
 * Domain-specific normalization helpers
 * While toCamelCase handles generic keys, these functions can handle 
 * complex mappings or value transformations if needed.
 */

export const normalizeDocument = <T extends BaseDocument>(data: any): T => {
  return toCamelCase<T>(data);
};

export const normalizePR = (data: any): PurchaseRequest => normalizeDocument<PurchaseRequest>(data);
export const normalizePO = (data: any): PurchaseOrder => normalizeDocument<PurchaseOrder>(data);
export const normalizeGRN = (data: any): GRN => normalizeDocument<GRN>(data);
export const normalizeTransfer = (data: any): Transfer => normalizeDocument<Transfer>(data);
export const normalizeIssue = (data: any): StockIssue => normalizeDocument<StockIssue>(data);
export const normalizeAdjustment = (data: any): Adjustment => normalizeDocument<Adjustment>(data);
