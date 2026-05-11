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
export function toCamelCase<T>(obj: unknown): T {
  if (Array.isArray(obj)) {
    return obj.map(v => toCamelCase(v)) as unknown as T;
  }
  if (obj !== null && typeof obj === 'object' && !(obj instanceof Date)) {
    return Object.keys(obj as Record<string, unknown>).reduce((acc, key) => {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      (acc as Record<string, unknown>)[camelKey] = toCamelCase((obj as Record<string, unknown>)[key]);
      return acc;
    }, {} as Record<string, unknown>) as unknown as T;
  }
  return obj as T;
}

/**
 * Recursive function to convert camelCase keys to snake_case
 */
export function toSnakeCase<T>(obj: unknown): T {
  if (Array.isArray(obj)) {
    return obj.map(v => toSnakeCase(v)) as unknown as T;
  }
  if (obj !== null && typeof obj === 'object' && !(obj instanceof Date)) {
    return Object.keys(obj as Record<string, unknown>).reduce((acc, key) => {
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      (acc as Record<string, unknown>)[snakeKey] = toSnakeCase((obj as Record<string, unknown>)[key]);
      return acc;
    }, {} as Record<string, unknown>) as unknown as T;
  }
  return obj as T;
}

/**
 * Domain-specific normalization helpers
 * While toCamelCase handles generic keys, these functions can handle 
 * complex mappings or value transformations if needed.
 */

export const normalizeDocument = <T extends BaseDocument>(data: unknown): T => {
  return toCamelCase<T>(data);
};

export const normalizePR = (data: unknown): PurchaseRequest => normalizeDocument<PurchaseRequest>(data);
export const normalizePO = (data: unknown): PurchaseOrder => normalizeDocument<PurchaseOrder>(data);
export const normalizeGRN = (data: unknown): GRN => normalizeDocument<GRN>(data);
export const normalizeTransfer = (data: unknown): Transfer => normalizeDocument<Transfer>(data);
export const normalizeIssue = (data: unknown): StockIssue => normalizeDocument<StockIssue>(data);
export const normalizeAdjustment = (data: unknown): Adjustment => normalizeDocument<Adjustment>(data);
