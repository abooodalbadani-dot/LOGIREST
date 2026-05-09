'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { useAuth } from '@/providers/AuthProvider';
import { useBranches } from '@/features/branches/hooks/useBranches';
import { useWarehouses } from '@/features/warehouses/hooks/useWarehouses';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
 Building2, 
 Warehouse, 
 CheckCircle2, 
 ChevronRight, 
 LayoutDashboard,
 Globe,
 Settings2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

export function ContextSelectorClient({ locale }: { locale: string }) {
 const t = useTranslations('common');
 const router = useRouter();
 const { user, activeScope, setActiveScope } = useAuth();
 
 const { data: branchesData } = useBranches();
 const { data: warehousesData } = useWarehouses();

 const branches = branchesData?.data || [];
 const warehouses = warehousesData?.data || [];

 const [selectedBranchId, setSelectedBranchId] = useState<string | null>(activeScope.branchId);
 const [selectedWarehouseId, setSelectedWarehouseId] = useState<string | null>(activeScope.warehouseId);

 const handleConfirm = () => {
 setActiveScope({
 branchId: selectedBranchId,
 warehouseId: selectedWarehouseId,
 departmentId: activeScope.departmentId // Preserve department if any
 });
 router.push('/dashboard');
 };

 const filteredWarehouses = warehouses?.filter(wh => wh.branch_id === selectedBranchId) || [];

 return (
 <div className="min-h-[80vh] flex flex-col items-center justify-center py-12 px-6">
 <div className="w-full max-w-5xl space-y-12">
 {/* Header Section */}
 <div className="text-center space-y-4">
 <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-operational-cyan/10 rounded-full border border-operational-cyan/20">
 <Globe className="w-3.5 h-3.5 text-operational-cyan" />
 <span className="text-label-xs font-semibold uppercase text-operational-cyan">System Environment</span>
 </div>
 <h1 className="text-headline-lg font-semibold uppercase italic bg-gradient-to-e from-foreground to-foreground/40 bg-clip-text text-transparent">
 Context Selector
 </h1>
 <p className="text-muted-foreground/60 text-body-md font-medium uppercase max-w-md mx-auto leading-relaxed">
 Switch your operational branch and warehouse environment
 </p>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
 {/* Branch Selection */}
 <div className="space-y-6">
 <div className="flex items-center gap-3 ps-4">
 <Building2 className="w-5 h-5 text-operational-cyan/40" />
 <h3 className="text-label-xs font-semibold uppercase text-muted-foreground">Select Branch</h3>
 </div>
 
 <div className="grid gap-4">
 {branches?.map((branch) => (
 <button
 key={branch.id}
 onClick={() => {
 setSelectedBranchId(branch.id);
 setSelectedWarehouseId(null); // Reset warehouse when branch changes
 }}
 className={cn(
 "relative p-6 rounded-[2rem] text-start transition-all duration-500 group overflow-hidden border border-white/5",
 selectedBranchId === branch.id 
 ? "bg-operational-cyan shadow-[0_20px_40px_rgba(var(--operational-cyan-rgb),0.2)]" 
 : "bg-surface-container-low hover:bg-surface-container-high"
 )}
 >
 <div className="relative z-10 flex items-center justify-between">
 <div className="space-y-1">
 <p className={cn(
 "text-label-xs font-semibold uppercase",
 selectedBranchId === branch.id ? "text-primary-foreground/60" : "text-muted-foreground/40"
 )}>
 {branch.code}
 </p>
 <p className={cn(
 "text-title-sm font-bold",
 selectedBranchId === branch.id ? "text-primary-foreground" : "text-foreground"
 )}>
 {locale === 'ar' ? branch.name_ar : branch.name_en}
 </p>
 </div>
 {selectedBranchId === branch.id && (
 <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center animate-in zoom-in-50 duration-500">
 <CheckCircle2 className="w-6 h-6 text-white" />
 </div>
 )}
 </div>
 {/* Decorative element */}
 <div className={cn(
 "absolute -bottom-6 -right-6 w-24 h-24 rounded-full blur-3xl opacity-0 transition-opacity duration-500 group-hover:opacity-20",
 selectedBranchId === branch.id ? "bg-white" : "bg-operational-cyan"
 )} />
 </button>
 ))}
 </div>
 </div>

 {/* Warehouse Selection */}
 <div className="space-y-6">
 <div className="flex items-center gap-3 ps-4">
 <Warehouse className="w-5 h-5 text-operational-cyan/40" />
 <h3 className="text-label-xs font-semibold uppercase text-muted-foreground">Select Warehouse</h3>
 </div>
 
 <div className="grid gap-4">
 {!selectedBranchId ? (
 <div className="h-[300px] flex flex-col items-center justify-center rounded-[2rem] bg-surface-container-low/30 border border-dashed border-white/5 space-y-4">
 <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
 <Settings2 className="w-6 h-6 text-muted-foreground/20" />
 </div>
 <p className="text-label-xs font-semibold uppercase text-muted-foreground/30 text-center px-12">
 Select a branch first to see available warehouses
 </p>
 </div>
 ) : filteredWarehouses.length > 0 ? (
 filteredWarehouses.map((wh) => (
 <button
 key={wh.id}
 onClick={() => setSelectedWarehouseId(wh.id)}
 className={cn(
 "relative p-6 rounded-[2rem] text-start transition-all duration-500 group overflow-hidden border border-white/5",
 selectedWarehouseId === wh.id 
 ? "bg- operational-cyan shadow-[0_20px_40px_rgba(var(--operational-cyan-rgb),0.2)]" 
 : "bg-surface-container-low hover:bg-surface-container-high"
 )}
 >
 <div className="relative z-10 flex items-center justify-between">
 <div className="space-y-1">
 <p className={cn(
 "text-label-xs font-semibold uppercase",
 selectedWarehouseId === wh.id ? "text-primary-foreground/60" : "text-muted-foreground/40"
 )}>
 {wh.code}
 </p>
 <p className={cn(
 "text-title-sm font-bold",
 selectedWarehouseId === wh.id ? "text-primary-foreground" : "text-foreground"
 )}>
 {locale === 'ar' ? wh.name_ar : wh.name_en}
 </p>
 </div>
 {selectedWarehouseId === wh.id && (
 <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center animate-in zoom-in-50 duration-500">
 <CheckCircle2 className="w-6 h-6 text-white" />
 </div>
 )}
 </div>
 </button>
 ))
 ) : (
 <div className="h-[200px] flex flex-col items-center justify-center rounded-[2rem] bg-surface-container-low/30 border border-dashed border-white/5 space-y-4">
 <p className="text-label-xs font-semibold uppercase text-muted-foreground/30">No warehouses found for this branch</p>
 </div>
 )}
 </div>
 </div>
 </div>

 {/* Action Button */}
 <div className="flex justify-center pt-8">
 <Button
 size="lg"
 disabled={!selectedBranchId || !selectedWarehouseId}
 onClick={handleConfirm}
 className="h-20 px-16 bg-foreground text-background hover:scale-105 transition-all duration-500 rounded-[2.5rem] font-semibold uppercase text-label-sm group shadow-2xl"
 >
 Switch Context
 <ChevronRight className="w-5 h-5 ms-4 group-hover:translate-x-2 transition-transform duration-500" />
 </Button>
 </div>
 </div>
 </div>
 );
}
