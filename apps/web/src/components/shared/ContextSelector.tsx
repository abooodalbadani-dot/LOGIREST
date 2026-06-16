'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/providers/AuthProvider';
import { useMasterDataList } from '@/features/master-data/hooks/useMasterDataCRUD';
import { BranchSchema, WarehouseSchema, DepartmentSchema } from '@/types/master-data';
import { Globe, Warehouse as WarehouseIcon, Building2, Layers, X, Check } from 'lucide-react';
import { useLocale } from '@/hooks/useLocale';

interface ContextSelectorProps {
 open: boolean;
 onOpenChange: (open: boolean) => void;
}

interface MasterDataItem {
 id: string;
 name?: string;
 code?: string;
}

export function ContextSelector({ open, onOpenChange }: ContextSelectorProps) {
 const t = useTranslations('context');
 const commonT = useTranslations('common');
 const { user, activeScope, setActiveScope } = useAuth();
 const { isRtl } = useLocale();

 // Local state for selections before confirming
 const [selectedBranchId, setSelectedBranchId] = useState(activeScope?.branchId || '');
 const [selectedWarehouseId, setSelectedWarehouseId] = useState(activeScope?.warehouseId || '');
 const [selectedDepartmentId, setSelectedDepartmentId] = useState(activeScope?.departmentId || '');

 // Fetch all branches
 const { data: branchesData } = useMasterDataList('branches', BranchSchema, { limit: '100' });
 const branches = branchesData?.data || [];

 // Fetch warehouses for the selected branch
 const { data: warehousesData } = useMasterDataList('warehouses', WarehouseSchema, { 
 limit: '100',
 branchId: selectedBranchId 
 }, { enabled: !!selectedBranchId });
 let warehouses = warehousesData?.data || [];

 if (user?.role !== 'ADMIN' && user?.scopes) {
  const allowedWarehouseIds = user.scopes
   .filter((s: { branchId: string | null; warehouseId: string | null }) => s.branchId === selectedBranchId && s.warehouseId)
   .map((s: { warehouseId: string | null }) => s.warehouseId as string);
  if (allowedWarehouseIds.length > 0 || user?.role === 'STORE_MGR') {
   warehouses = warehouses.filter((w: MasterDataItem) => allowedWarehouseIds.includes(w.id));
  }
 }

 // Fetch departments for the selected branch
 const { data: departmentsData } = useMasterDataList('departments', DepartmentSchema, { 
 limit: '100',
 branchId: selectedBranchId 
 }, { enabled: !!selectedBranchId });
 let departments = departmentsData?.data || [];

 if (user?.role === 'KITCHEN_CHIEF' && user?.scopes) {
  const allowedDeptIds = user.scopes
   .filter((s: { branchId: string | null; departmentId: string | null }) => s.branchId === selectedBranchId && s.departmentId)
   .map((s: { departmentId: string | null }) => s.departmentId as string);
  departments = departments.filter((d: MasterDataItem) => allowedDeptIds.includes(d.id));
 }

 // Update local state when activeScope changes (e.g. on mount or when changed externally)
 useEffect(() => {
 if (open) {
 setTimeout(() => {
 setSelectedBranchId(activeScope?.branchId || '');
 setSelectedWarehouseId(activeScope?.warehouseId || '');
 setSelectedDepartmentId(activeScope?.departmentId || '');
 }, 0);
 }
 }, [open, activeScope]);

 // Handle Escape key
 useEffect(() => {
 const handleKeyDown = (e: KeyboardEvent) => {
 if (e.key === 'Escape') onOpenChange(false);
 };
 if (open) {
 window.addEventListener('keydown', handleKeyDown);
 document.body.style.overflow = 'hidden';
 }
 return () => {
 window.removeEventListener('keydown', handleKeyDown);
 document.body.style.overflow = 'unset';
 };
 }, [open, onOpenChange]);

 const handleConfirm = () => {
 setActiveScope({
 branchId: selectedBranchId,
 warehouseId: selectedWarehouseId,
 departmentId: selectedDepartmentId
 });
 onOpenChange(false);
 };

 if (!open) return null;

 let isConfirmDisabled = !selectedBranchId;
 if (user?.role === 'KITCHEN_CHIEF') {
  isConfirmDisabled = !selectedBranchId || !selectedDepartmentId;
 } else if (user?.role === 'STORE_MGR') {
  isConfirmDisabled = !selectedBranchId || !selectedWarehouseId;
 }

 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/60 backdrop-blur-md animate-in fade-in duration-300">
 <div 
 className="bg-card border border-border shadow-sm rounded-2xl border border-outline-low w-full max-w-4xl overflow-hidden relative animate-in zoom-in-95 duration-200"
 >
 {/* Nocturne Ghost Border / Glow */}
 <div className="absolute top-0 start-0 w-full h-[2px] bg-gradient-to-r from-transparent via-operational-cyan/50 to-transparent" />
 
 <div className="p-6 border-b border-outline-low flex justify-between items-center bg-surface-container/20">
 <div className="flex items-center gap-3">
 <div className="p-2.5 bg-operational-cyan/10 rounded-xl text-operational-cyan">
 <Globe className="w-5 h-5" />
 </div>
 <div>
 <h2 className="text-title-lg font-bold text-foreground leading-tight">{t('title')}</h2>
 <p className="text-label-xs text-muted-foreground uppercase font-semibold mt-0.5">{t('subtitle')}</p>
 </div>
 </div>
 <button 
 onClick={() => onOpenChange(false)}
 className="text-muted-foreground/60 hover:text-status-error hover:bg-status-error/10 transition-all p-2 rounded-full"
 >
 <X className="w-5 h-5" />
 </button>
 </div>

 <div className="p-6 space-y-6">
 {/* Branch Selection */}
 <div className="space-y-2 group">
 <label className="flex items-center gap-2 text-label-xs font-semibold text-muted-foreground uppercase group-focus-within:text-operational-cyan transition-colors ms-1">
 <Building2 className="w-3.5 h-3.5" />
 {t('branch')}
 </label>
 <div className="relative">
 <select
 value={selectedBranchId}
 onChange={(e) => {
 setSelectedBranchId(e.target.value);
 setSelectedWarehouseId('');
 setSelectedDepartmentId('');
 }}
 className="w-full bg-card border border-border shadow-sm border border-outline-low rounded-xl px-4 py-3 text-foreground outline-none focus:border-operational-cyan focus:ring-1 focus:ring-operational-cyan/50 transition-all appearance-none cursor-pointer hover:bg-surface-container-high"
 >
 <option value="" className="bg-card border border-border shadow-sm">{t('branch_placeholder')}</option>
 {branches.map((b: { id: string; name?: string; code?: string }) => (
 <option key={b.id} value={b.id} className="bg-card border border-border shadow-sm">
 {b.name || b.code}
 </option>
 ))}
 </select>
 <div className="absolute inset-inline-end-4 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground/60">
 <Check className={`w-4 h-4 transition-all ${selectedBranchId ? 'opacity-100 text-operational-cyan' : 'opacity-0'}`} />
 </div>
 </div>
 </div>

 {/* Warehouse Selection */}
 <div className="space-y-2 group">
 <label className="flex items-center gap-2 text-label-xs font-semibold text-muted-foreground uppercase group-focus-within:text-operational-cyan transition-colors ms-1">
 <WarehouseIcon className="w-3.5 h-3.5" />
 {t('warehouse')}
 </label>
 <select
 value={selectedWarehouseId}
 onChange={(e) => setSelectedWarehouseId(e.target.value)}
 disabled={!selectedBranchId}
 className="w-full bg-card border border-border shadow-sm border border-outline-low rounded-xl px-4 py-3 text-foreground outline-none focus:border-operational-cyan focus:ring-1 focus:ring-operational-cyan/50 transition-all appearance-none cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed hover:bg-surface-container-high"
 >
 <option value="" className="bg-card border border-border shadow-sm">{t('warehouse_placeholder')}</option>
 {warehouses.map((w: { id: string; name?: string; code?: string }) => (
 <option key={w.id} value={w.id} className="bg-card border border-border shadow-sm">
 {w.name || w.code}
 </option>
 ))}
 </select>
 </div>

 {/* Department Selection */}
 <div className="space-y-2 group">
 <label className="flex items-center gap-2 text-label-xs font-semibold text-muted-foreground uppercase group-focus-within:text-operational-cyan transition-colors ms-1">
 <Layers className="w-3.5 h-3.5" />
 {t('department')}
 </label>
 <select
 value={selectedDepartmentId}
 onChange={(e) => setSelectedDepartmentId(e.target.value)}
 disabled={!selectedBranchId}
 className="w-full bg-card border border-border shadow-sm border border-outline-low rounded-xl px-4 py-3 text-foreground outline-none focus:border-operational-cyan focus:ring-1 focus:ring-operational-cyan/50 transition-all appearance-none cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed hover:bg-surface-container-high"
 >
 <option value="" className="bg-card border border-border shadow-sm">{t('department_placeholder')}</option>
 {departments.map((d: { id: string; name?: string; code?: string }) => (
 <option key={d.id} value={d.id} className="bg-card border border-border shadow-sm">
 {d.name || d.code}
 </option>
 ))}
 </select>
 </div>
 </div>

 <div className="p-6 bg-surface-container/40 border-t border-outline-low flex flex-col sm:flex-row gap-3">
 <button 
 onClick={() => onOpenChange(false)}
 className="flex-1 px-6 py-3 bg-surface-container-high text-foreground rounded-xl font-bold hover:bg-surface-container-highest transition-all active:scale-[0.98]"
 >
 {commonT('cancel')}
 </button>
 <button 
 onClick={handleConfirm}
 disabled={isConfirmDisabled}
 className="flex-1 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:brightness-110 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
 >
 {t('confirm_selection')}
 </button>
 </div>
 </div>
 </div>
 );
}
