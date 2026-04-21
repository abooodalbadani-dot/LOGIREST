import { useQuery } from '@tanstack/react-query';
import { Branch } from '../types';
import { apiClient } from '@/lib/api/client';

export function useBranches() {
  return useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      // Mock data returned for front-end iteration. Swap with apiClient later.
      return new Promise<Branch[]>((resolve) => {
        setTimeout(() => {
          resolve([
            { 
              id: '1', 
              code: 'BR-Riyadh-01', 
              nameEn: 'Main Riyadh Branch', 
              nameAr: 'فرع الرياض الرئيسي', 
              status: 'ACTIVE', 
              createdAt: '2023-11-01T10:00:00Z', 
              updatedAt: '2023-11-01T10:00:00Z' 
            },
            { 
              id: '2', 
              code: 'BR-Jeddah-01', 
              nameEn: 'Jeddah Warehouse', 
              nameAr: 'مستودع جدة', 
              status: 'ACTIVE', 
              createdAt: '2023-11-15T09:30:00Z', 
              updatedAt: '2023-11-15T09:30:00Z' 
            },
            { 
              id: '3', 
              code: 'BR-Dammam-01', 
              nameEn: 'Dammam Branch', 
              nameAr: 'فرع الدمام', 
              status: 'INACTIVE', 
              createdAt: '2024-01-10T14:20:00Z', 
              updatedAt: '2024-01-10T14:20:00Z' 
            },
          ]);
        }, 500);
      });
    }
  });
}
