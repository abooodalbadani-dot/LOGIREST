import { useQuery } from '@tanstack/react-query';
import { Item } from '../types';

export function useItems() {
  return useQuery({
    queryKey: ['items'],
    queryFn: async ({ signal }) => {
      return new Promise<Item[]>((resolve, reject) => {
        const timeout = setTimeout(() => {
          resolve([
            { 
              id: 'IT-1', 
              code: 'SKU-F-001',
              barcode: '1234567890',
              name_en: 'Premium Basmati Rice 5kg', 
              name_ar: 'أرز بسمتي ممتاز 5 كجم', 
              category_id: 'CAT-1',
              primary_uom: {
                id: 'UOM-1',
                code: 'BAG',
                name_ar: 'كيس',
                name_en: 'Bag',
                is_active: true,
                created_at: new Date().toISOString()
              },
              uom_conversions: [],
              track_lots: true,
              min_stock_level: 50,
              reorder_point: 60,
              is_active: true,
              version: 1
            },
            { 
              id: 'IT-2', 
              code: 'SKU-E-102',
              barcode: '2234567891',
              name_en: 'Commercial Blender Pro', 
              name_ar: 'خلاط تجاري احترافي', 
              category_id: 'CAT-2',
              primary_uom: {
                id: 'UOM-2',
                code: 'EA',
                name_ar: 'حبة',
                name_en: 'Each',
                is_active: true,
                created_at: new Date().toISOString()
              },
              uom_conversions: [],
              track_lots: false,
              min_stock_level: 2,
              reorder_point: 5,
              is_active: true,
              version: 1
            },
            { 
              id: 'IT-3', 
              code: 'SKU-S-005',
              barcode: '3234567892',
              name_en: 'Cleaning Detergent XL', 
              name_ar: 'منظف كبير', 
              category_id: 'CAT-3',
              primary_uom: {
                id: 'UOM-3',
                code: 'L',
                name_ar: 'لتر',
                name_en: 'Liter',
                is_active: true,
                created_at: new Date().toISOString()
              },
              uom_conversions: [],
              track_lots: false,
              min_stock_level: 20,
              reorder_point: 30,
              is_active: false,
              version: 1
            },
          ]);
        }, 800);

        signal?.addEventListener('abort', () => {
          clearTimeout(timeout);
          reject(new Error('Aborted'));
        });
      });
    }
  });
}
