import { useQuery } from '@tanstack/react-query';
import { Warehouse } from '../types';

export function useWarehouses() {
  return useQuery({
    queryKey: ['warehouses'],
    queryFn: async ({ signal }) => {
      // Mock data returned for front-end iteration.
      return new Promise<Warehouse[]>((resolve, reject) => {
        const timeout = setTimeout(() => {
          resolve([
            { 
              id: 'wh-1', 
              code: 'WH-Riyadh-MAIN', 
              branch_id: '1', 
              name_en: 'Riyadh Central Warehouse', 
              name_ar: 'مستودع الرياض المركزي', 
              type: 'main',
              is_active: true, 
              version: 1
            },
            { 
              id: 'wh-2', 
              code: 'WH-Jeddah-TR', 
              branch_id: '2', 
              name_en: 'Jeddah Transit Hub', 
              name_ar: 'نقطة عبور جدة', 
              type: 'transit',
              is_active: true, 
              version: 1
            },
            { 
              id: 'wh-3', 
              code: 'WH-Dam-VIR', 
              branch_id: '3', 
              name_en: 'Dammam Virtual Stock', 
              name_ar: 'مخزون الدمام الافتراضي', 
              type: 'virtual',
              is_active: false, 
              version: 1
            },
          ]);
        }, 600);

        signal?.addEventListener('abort', () => {
          clearTimeout(timeout);
          reject(new Error('Aborted'));
        });
      });
    }
  });
}
