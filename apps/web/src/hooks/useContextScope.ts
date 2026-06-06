import { useAuth } from '@/providers/AuthProvider';
import { useMasterDataItem } from '@/features/master-data/hooks/useMasterDataCRUD';
import { BranchSchema, WarehouseSchema, DepartmentSchema } from '@/types/master-data';

export function useContextScope() {
 const { activeScope, setActiveScope } = useAuth();

 const { data: branch, isLoading: isBranchLoading } = useMasterDataItem(
 'branches', 
 activeScope?.branchId || null, 
 BranchSchema
 );

 const { data: warehouse, isLoading: isWarehouseLoading } = useMasterDataItem(
 'warehouses', 
 activeScope?.warehouseId || null, 
 WarehouseSchema
 );

 const { data: department, isLoading: isDepartmentLoading } = useMasterDataItem(
 'departments', 
 activeScope?.departmentId || null, 
 DepartmentSchema
 );

 const getLocalizedName = (item: { name?: string; code?: string } | null | undefined) => {
  if (!item) return null;
  return item.name || item.code || null;
 };

 return {
 activeScope: activeScope || { branchId: null, warehouseId: null, departmentId: null },
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
