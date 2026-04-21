import { useQuery } from '@tanstack/react-query';
import { Supplier } from '../types';
import { apiClient } from '@/lib/api/client';

export function useSuppliers() {
  return useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      // Mock data returned for front-end iteration.
      return new Promise<Supplier[]>((resolve) => {
        setTimeout(() => {
          resolve([
            { 
              id: 'SUP-1', 
              code: 'V-001', 
              nameEn: 'Global Food Distributing Co.', 
              nameAr: 'شركة توزيع الأغذية العالمية', 
              contactPerson: 'Ahmed Hassan',
              email: 'sales@global-food.com', 
              phone: '+966 50 123 4567',
              taxNumber: '300123456700003',
              status: 'ACTIVE', 
              createdAt: '2023-11-01T10:00:00Z', 
              updatedAt: '2023-11-01T10:00:00Z' 
            },
            { 
              id: 'SUP-2', 
              code: 'V-002', 
              nameEn: 'Elite Restaurant Equipment', 
              nameAr: 'معدات المطاعم النخبة', 
              contactPerson: 'Sara Smith',
              email: 'orders@eliterestaurant.com', 
              phone: '+971 50 987 6543',
              taxNumber: '300987654300003',
              status: 'ACTIVE', 
              createdAt: '2023-11-15T09:30:00Z', 
              updatedAt: '2023-11-15T09:30:00Z' 
            },
            { 
              id: 'SUP-3', 
              code: 'V-003', 
              nameEn: 'Local Fresh Produce Farms', 
              nameAr: 'مزارع المنتجات الطازجة المحلية', 
              contactPerson: 'Ali Fares',
              email: 'ali@localfarms.sa', 
              phone: '+966 55 555 5555',
              taxNumber: '',
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
