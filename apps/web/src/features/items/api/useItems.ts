import { useQuery } from '@tanstack/react-query';
import { Item } from '../types';
import { apiClient } from '@/lib/api/client';

export function useItems() {
 return useQuery({
 queryKey: ['items'],
 queryFn: async () => {
 // Mock data returned for front-end iteration.
 return new Promise<Item[]>((resolve) => {
 setTimeout(() => {
 resolve([
 { 
 id: 'IT-1', 
 sku: 'SKU-F-001', 
 nameEn: 'Premium Basmati Rice 5kg', 
 nameAr: 'أرز بسمتي ممتاز 5 كجم', 
 category: 'FOOD',
 uom: 'BAG', 
 minStockLevel: 50,
 costPrice: 45.50,
 status: 'ACTIVE', 
 createdAt: '2023-11-01T10:00:00Z', 
 updatedAt: '2023-11-01T10:00:00Z' 
 },
 { 
 id: 'IT-2', 
 sku: 'SKU-E-102', 
 nameEn: 'Commercial Blender Pro', 
 nameAr: 'خلاط تجاري احترافي', 
 category: 'EQUIPMENT',
 uom: 'EA', 
 minStockLevel: 2,
 costPrice: 1250.00,
 status: 'ACTIVE', 
 createdAt: '2023-11-15T09:30:00Z', 
 updatedAt: '2023-11-15T09:30:00Z' 
 },
 { 
 id: 'IT-3', 
 sku: 'SKU-S-005', 
 nameEn: 'Cleaning Detergent XL', 
 nameAr: 'منظف كبير', 
 category: 'SUPPLIES',
 uom: 'L', 
 minStockLevel: 20,
 costPrice: 35.00,
 status: 'INACTIVE', 
 createdAt: '2024-01-10T14:20:00Z', 
 updatedAt: '2024-01-10T14:20:00Z' 
 },
 ]);
 }, 800);
 });
 }
 });
}
