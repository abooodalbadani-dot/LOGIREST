import { useQuery } from '@tanstack/react-query';
import { Warehouse } from '../types';
import { apiClient } from '@/lib/api/client';

export function useWarehouses() {
  return useQuery({
    queryKey: ['warehouses'],
    queryFn: async () => {
      // Mock data returned for front-end iteration.
      return new Promise<Warehouse[]>((resolve) => {
        setTimeout(() => {
          resolve([
            { 
              id: 'W-1', 
              code: 'WH-Riyadh-MAIN', 
              branchId: '1', 
              nameEn: 'Riyadh Central Warehouse', 
              nameAr: 'مستودع الرياض المركزي', 
              type: 'MAIN',
              status: 'ACTIVE', 
              createdAt: '2023-11-01T10:00:00Z', 
              updatedAt: '2023-11-01T10:00:00Z' 
            },
            { 
              id: 'W-2', 
              code: 'WH-Jeddah-TR', 
              branchId: '2', 
              nameEn: 'Jeddah Transit Hub', 
              nameAr: 'نقطة عبور جدة', 
              type: 'TRANSIT',
              status: 'ACTIVE', 
              createdAt: '2023-11-15T09:30:00Z', 
              updatedAt: '2023-11-15T09:30:00Z' 
            },
            { 
              id: 'W-3', 
              code: 'WH-Dam-VIR', 
              branchId: '3', 
              nameEn: 'Dammam Virtual Stock', 
              nameAr: 'مخزون الدمام الافتراضي', 
              type: 'VIRTUAL',
              status: 'INACTIVE', 
              createdAt: '2024-01-10T14:20:00Z', 
              updatedAt: '2024-01-10T14:20:00Z' 
            },
          ]);
        }, 600);
      });
    }
  });
}
