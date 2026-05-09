import { useAuth } from '@/providers/AuthProvider';
import { useMasterDataItem } from '@/features/master-data/hooks/useMasterDataCRUD';
import { BranchSchema, WarehouseSchema, DepartmentSchema } from '@/types/master-data';
import { useLocale } from './useLocale';

export function useContextScope() {
 const { activeScope, setActiveScope } = useAuth();
 const { isRtl } = useLocale();

 const { data: branch, isLoading: isBranchLoading } = useMasterDataItem(
 'branches', 
 activeScope.branchId, 
 BranchSchema
 );

 const { data: warehouse, isLoading: isWarehouseLoading } = useMasterDataItem(
 'warehouses', 
 activeScope.warehouseId, 
 WarehouseSchema
 );

 const { data: department, isLoading: isDepartmentLoading } = useMasterDataItem(
 'departments', 
 activeScope.departmentId, 
 DepartmentSchema
 );

 const getLocalizedName = (item: { name_ar: string; name_en: string } | null | undefined) => {
 if (!item) return null;
 return isRtl ? item.name_ar : item.name_en;
 };

 return {
 activeScope,
 setActiveScope,
 branch,
 warehouse,
 department,
 branchName: getLocalizedName(branch),
 warehouseName: getLocalizedName(warehouse),
 departmentName: getLocalizedName(department),
 isLoading: isBranchLoading || isWarehouseLoading || isDepartmentLoading,
 };
}
