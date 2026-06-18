'use client';

import { useEffect, useMemo } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { useForm, useWatch, Controller } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAdminUser, useAdminUserMutations, UserFormSchema, type UserFormValues } from '@/features/admin/hooks/useAdminUsers';
import { useAuth } from '@/providers/AuthProvider';
import { type UserRole } from '@/types/rbac';
import { useUnsavedChangesGuard } from '@/lib/unsaved-changes/useUnsavedChangesGuard';
import { MasterDataFormLayout } from '@/features/master-data/components/MasterDataFormLayout';
import { User, Mail, Shield, MapPin, Warehouse, Building2, CheckCircle2, Globe, Power, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { SmartCombobox } from '@/components/shared/SmartCombobox';
import { useAudioFeedback } from '@/hooks/useAudioFeedback';
import { useBranches } from '@/features/branches/hooks/useBranches';
import { useWarehouses } from '@/features/warehouses/hooks/useWarehouses';
import { useDepartments } from '@/features/departments/hooks/useDepartments';

const ALL_ROLES: { value: UserRole; labelEn: string; labelAr: string }[] = [
 { value: 'ADMIN',    labelEn: 'System Administrator', labelAr: 'مسؤول النظام'    },
 { value: 'GM',      labelEn: 'General Manager',   labelAr: 'المدير العام'    },
 { value: 'BRANCH_MGR', labelEn: 'Branch Manager',    labelAr: 'مدير الفرع'     },
 { value: 'INV_MGR',   labelEn: 'Inventory Manager',  labelAr: 'مدير المخزون'    },
 { value: 'STORE_MGR',  labelEn: 'Store Manager',    labelAr: 'مدير المتجر'    },
 { value: 'WH_KEEPER',  labelEn: 'Warehouse Keeper',   labelAr: 'أمين المستودع'   },
 { value: 'KITCHEN_CHIEF', labelEn: 'Kitchen Chief',   labelAr: 'رئيس المطبخ'    },
 { value: 'PROC_MGR',  labelEn: 'Procurement Manager', labelAr: 'مدير المشتريات'   },
 { value: 'PROC_OFFICER', labelEn: 'Procurement Officer', labelAr: 'مسؤول المشتريات'  },
 { value: 'APPROVER',  labelEn: 'Approver',       labelAr: 'مفوض الاعتماد'   },
 { value: 'AUDITOR',   labelEn: 'Auditor',       labelAr: 'مدقق مالي'     },
 { value: 'VIEWER',   labelEn: 'Viewer (Read-Only)',  labelAr: 'مشاهد (قراءة فقط)' },
];

interface Props {
 id: string | null;
 createTitle: string;
 editTitle: string;
 locale: string;
 isReadOnly?: boolean;
}

export function UserFormClient({ id, createTitle, editTitle, locale, isReadOnly = false }: Props) {
 const t = useTranslations('admin.users');
 const tv = useTranslations();
 const _router = useRouter();
 const { data, isLoading } = useAdminUser(id);
 const { user: currentUser } = useAuth();
 const { createUser, updateUser, isLastActiveAdmin } = useAdminUserMutations();
 const { playSound } = useAudioFeedback();
 const { data: branchesData } = useBranches();
 const { data: warehousesData } = useWarehouses();
 const { data: departmentsData } = useDepartments();
 const branches = branchesData?.data || [];
 const warehouses = warehousesData?.data || [];
 const departments = departmentsData?.data || [];

 const isSelf = currentUser?.id === id;
 const isAuditor = currentUser?.role === 'AUDITOR' || isReadOnly;

 const { register, handleSubmit, reset, setValue, control, formState: { isSubmitting, isDirty, errors } } = useForm<UserFormValues>({
  resolver: zodResolver(UserFormSchema),
  defaultValues: {
   name: '',
   email: '',
   role: 'WH_KEEPER',
   status: 'ACTIVE',
   language: 'en',
   branchIds: [],
   warehouseIds: [],
   departmentIds: [],
  },
 });

 const { router: guardedRouter } = useUnsavedChangesGuard(isDirty);

 const selectedBranches = useWatch({ control, name: 'branchIds' });
 const selectedWarehouses = useWatch({ control, name: 'warehouseIds' });
 const selectedRole = useWatch({ control, name: 'role' });
 const selectedStatus = useWatch({ control, name: 'status' });
 const selectedDepartments = useWatch({ control, name: 'departmentIds' });

 // Security Check: Is this the last admin?
 const isLastAdmin = useMemo(() => {
  if (!id) return false;
  return isLastActiveAdmin(id);
 }, [id, isLastActiveAdmin]);

 // Cascading Logic: Warehouses depend on Branches
 const filteredWarehouses = useMemo(() => {
  if (!selectedBranches?.length) return [];
  return warehouses.filter(wh => wh.branchId && selectedBranches.includes(wh.branchId));
 }, [selectedBranches, warehouses]);

 // Cascading Logic: Departments depend on Branches
 const filteredDepartments = useMemo(() => {
  if (!selectedBranches?.length) return [];
  return departments.filter(dep => dep.branchId && selectedBranches.includes(dep.branchId));
 }, [selectedBranches, departments]);

 const languageItems = useMemo(() => [
  { id: 'en', name_en: t('lang_en'), name_ar: t('lang_en') },
  { id: 'ar', name_en: t('lang_ar'), name_ar: t('lang_ar') },
 ], [t]);

 const roleItems = useMemo(() => {
  return ALL_ROLES.map((r) => ({
   id: r.value,
   name_en: r.labelEn,
   name_ar: r.labelAr,
  }));
 }, []);

 // Auto-reset dependent selections when parent changes
 useEffect(() => {
  const currentWhs = selectedWarehouses || [];
  const validWhs = currentWhs.filter((whId: string) => filteredWarehouses.some(f => f.id === whId));
  if (validWhs.length !== currentWhs.length) {
   setValue('warehouseIds', validWhs);
  }
 }, [filteredWarehouses, setValue, selectedWarehouses]);

 useEffect(() => {
  const currentDeps = selectedDepartments || [];
  const validDeps = currentDeps.filter((depId: string) => filteredDepartments.some(f => f.id === depId));
  if (validDeps.length !== currentDeps.length) {
   setValue('departmentIds', validDeps);
  }
 }, [filteredDepartments, setValue, selectedDepartments]);

 useEffect(() => {
  if (data) {
   reset({
    name: data.name,
    email: data.email,
    role: data.role as UserRole,
    status: data.status as 'ACTIVE' | 'INACTIVE' || 'ACTIVE',
    language: (data.language as 'en' | 'ar') || 'en',
    branchIds: Array.from(new Set(data.scopes.filter((s: { branchId?: string | null }) => s.branchId).map((s: { branchId?: string | null }) => s.branchId!))),
    warehouseIds: Array.from(new Set(data.scopes.filter((s: { warehouseId?: string | null }) => s.warehouseId).map((s: { warehouseId?: string | null }) => s.warehouseId!))),
    departmentIds: Array.from(new Set(data.scopes.filter((s: { departmentId?: string | null }) => s.departmentId).map((s: { departmentId?: string | null }) => s.departmentId!))),
   });
  }
 }, [data, reset]);

 const onSubmit = handleSubmit(async (values) => {
  if (id) {
   await updateUser.mutateAsync({ ...values, id });
  } else {
   await createUser.mutateAsync(values);
  }
  reset(values);
  guardedRouter.push('/admin/users', { skipGuard: true });
 });


 if (isLoading && id) {
  return (
   <div className="h-64 min-w-0 items-center flex-1 gap-6 justify-center flex-col flex w-full">
    <div className="w-10 h-10 border-4 border-brand-gold border-t-transparent rounded-full animate-spin" />
    <span className="text-label-xs font-semibold uppercase text-muted-foreground animate-pulse">{t('syncing_identity')}</span>
   </div>
  );
 }

 return (
  <MasterDataFormLayout
   title={id ? editTitle : createTitle}
   backHref="/admin/users"
   isSaving={isSubmitting}
   onSubmit={onSubmit}
   onCancel={() => guardedRouter.push('/admin/users', { skipGuard: true })}
   resource="admin"
   saveAction={id ? 'edit' : 'create'}
   hideSave={isReadOnly}
  >
    <div className="col-span-12 w-full min-w-0 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start p-6 bg-card border border-border rounded-xl mt-6">
    {/* Column 1: Identity & Scopes */}
    <div className="lg:col-span-7 w-full min-w-0 flex flex-col gap-8">
     {/* Identity Section */}
     <section className="w-full flex flex-col gap-6">
      <div className="flex items-center gap-3 mb-2">
       <div className="w-10 h-10 rounded-sm bg-brand-gold/10 border border-brand-gold/20 flex items-center justify-center shrink-0">
        <User className="w-5 h-5 text-brand-gold" />
       </div>
       <div className="text-start">
        <h2 className="text-title-sm font-semibold uppercase text-foreground">{t('user_identity')}</h2>
        <p className="text-label-xs text-muted-foreground/60 uppercase font-bold">{t('profile_metadata')}</p>
       </div>
      </div>

      <div className="w-full grid grid-cols-1 md:grid-cols-12 gap-6">
       <div className="md:col-span-8 w-full min-w-0 flex flex-col gap-1.5 text-start">
        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
         <User className="w-3.5 h-3.5 text-brand-gold" /> {t('name')}
        </Label>
        <Input 
         {...register('name')} 
         disabled={isAuditor} 
         dir="auto"
         className={errors.name ? 'border-red-500 focus:ring-red-500' : ''}
        />
        {errors.name?.message && (
         <p className="text-xs text-red-500 mt-1">
          {tv(('admin.users.' + errors.name.message) as never)}
         </p>
        )}
       </div>

       <div className="md:col-span-4 w-full min-w-0 flex flex-col gap-1.5 text-start">
        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
         <Mail className="w-3.5 h-3.5 text-brand-gold" /> {t('email')}
        </Label>
        <Input 
         dir="ltr" 
         {...register('email')} 
         disabled={isAuditor}
         className={errors.email ? 'border-red-500 focus:ring-red-500' : ''}
        />
        {errors.email?.message && (
         <p className="text-xs text-red-500 mt-1">
          {tv(('admin.users.' + errors.email.message) as never)}
         </p>
        )}
       </div>

       <div className="md:col-span-4 w-full min-w-0 flex flex-col gap-1.5 text-start">
        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
         <Globe className="w-3.5 h-3.5 text-brand-gold" /> {t('language')}
        </Label>
        <Controller
         name="language"
         control={control}
         render={({ field }) => (
           <SmartCombobox
            disabled={isAuditor}
            value={field.value}
            onSelect={(item) => field.onChange(item.id)}
            items={languageItems}
            placeholder={t('language')}
            className="w-full text-sm"
           />
         )}
        />
       </div>
      </div>
     </section>

     {/* Scopes Section */}
     <section className="w-full flex flex-col gap-6">
      <div className="flex items-center gap-3 mb-2">
       <div className="w-10 h-10 rounded-sm bg-brand-gold/10 border border-brand-gold/20 flex items-center justify-center shrink-0">
        <MapPin className="w-5 h-5 text-brand-gold" />
       </div>
       <div className="text-start">
        <h2 className="text-title-sm font-semibold uppercase text-foreground">{t('access_scopes')}</h2>
        <p className="text-label-xs text-muted-foreground/60 uppercase font-bold">{t('organizational_units')}</p>
       </div>
      </div>

      <div className="w-full flex flex-col gap-6">
       <MultiSelect
        label={t('branch_scope')}
        icon={<Building2 className="w-3.5 h-3.5 text-brand-gold" />}
        options={branches.map(b => ({ id: b.id, label: b.name || b.code }))}
        selected={selectedBranches}
        onChange={(v) => setValue('branchIds', v)}
        disabled={isAuditor || isSelf}
        t={t}
       />

       <MultiSelect
        label={t('warehouse_scope')}
        icon={<Warehouse className="w-3.5 h-3.5 text-brand-gold" />}
        options={filteredWarehouses.map(w => ({ id: w.id, label: w.name || w.code }))}
        selected={selectedWarehouses}
        onChange={(v) => setValue('warehouseIds', v)}
        disabled={isAuditor || isSelf || !selectedBranches.length}
        t={t}
       />

       <MultiSelect
        label={t('department_scope')}
        icon={<Building2 className="w-3.5 h-3.5 text-brand-gold" />}
        options={filteredDepartments.map(d => ({ id: d.id, label: d.name || d.code }))}
        selected={selectedDepartments}
        onChange={(v) => setValue('departmentIds', v)}
        disabled={isAuditor || isSelf || !selectedBranches.length}
        t={t}
       />

       {(!selectedBranches.length) && (
        <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 flex items-center gap-3 text-start">
         <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
         <span className="text-label-xs font-bold text-amber-500 uppercase">{t('branch_selection_hint')}</span>
        </div>
       )}
      </div>
     </section>
    </div>

    {/* Column 2: Governance & Policies */}
    <div className="lg:col-span-5 w-full min-w-0 flex flex-col gap-6">
     <section className="w-full flex flex-col gap-6 bg-muted/20 border border-border p-6 rounded-xl">
      <div className="flex items-center gap-3 mb-2">
       <div className="w-10 h-10 rounded-sm bg-brand-gold/10 border border-brand-gold/20 flex items-center justify-center shrink-0">
        <Shield className="w-5 h-5 text-brand-gold" />
       </div>
       <div className="text-start">
        <h2 className="text-title-sm font-semibold uppercase text-foreground">{t('governance')}</h2>
        <p className="text-label-xs text-muted-foreground/60 uppercase font-bold">{t('role_permissions')}</p>
       </div>
      </div>

      <div className="w-full min-w-0 p-2 bg-brand-gold/10 border-b border-brand-gold/20 flex items-center justify-center gap-2 rounded-t-lg">
       <CheckCircle2 className="w-3.5 h-3.5 text-brand-gold shrink-0" />
       <span className="text-label-xxs font-semibold uppercase text-brand-gold">{t('live_policy')}</span>
      </div>

      <div className="w-full min-w-0 flex flex-col gap-1.5 text-start">
       <Label className="text-label-xs font-semibold uppercase text-muted-foreground">
        {t('role')}
       </Label>
       <Controller
        name="role"
        control={control}
        render={({ field }) => (
          <SmartCombobox
           disabled={isAuditor || isSelf || isLastAdmin}
           value={field.value}
           onSelect={(item) => field.onChange(item.id)}
           items={roleItems}
           placeholder={t('role')}
           className="w-full bg-surface-container-highest/30 border border-border text-label-xs font-bold"
          />
        )}
       />
      </div>

      <div className="w-full min-w-0 flex flex-col gap-1.5 text-start">
       <Label className="text-label-xs font-semibold uppercase text-muted-foreground flex items-center gap-2">
        <Power className="w-3 h-3 text-brand-gold" /> {t('status')}
       </Label>
       <div className="w-full grid grid-cols-2 gap-3">
        <button
         type="button"
         disabled={isAuditor || isSelf || isLastAdmin}
         onClick={() => setValue('status', 'ACTIVE')}
         className={`h-11 rounded-sm border text-label-xs font-semibold uppercase transition-all ${ selectedStatus === 'ACTIVE' ? 'bg-muted/50 border-emerald-500/50 text-foreground shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'bg-muted border border-border text-muted-foreground/60 hover:bg-muted/85' }`}
        >
         {t('activate')}
        </button>
        <button
         type="button"
         disabled={isAuditor || isSelf || isLastAdmin}
         onClick={() => setValue('status', 'INACTIVE')}
         className={`h-11 rounded-sm border text-label-xs font-semibold uppercase transition-all ${ selectedStatus === 'INACTIVE' ? 'bg-rose-500/10 border-rose-500/50 text-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.1)]' : 'bg-muted border border-border text-muted-foreground/60 hover:bg-muted/85' }`}
        >
         {t('deactivate')}
        </button>
       </div>
      </div>

      {isLastAdmin && (selectedStatus === 'INACTIVE' || selectedRole !== 'ADMIN') && (
       <div className="w-full min-w-0 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-2 text-start">
        <div className="flex items-center gap-2">
         <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
         <span className="text-label-xxs font-semibold uppercase text-amber-500">{t('critical_lockdown')}</span>
        </div>
        <p className="text-label-xs text-amber-500/70 leading-tight">
         {t('cannot_deactivate_last_admin')}
        </p>
       </div>
      )}

      {isSelf && (
       <div className="w-full min-w-0 p-4 rounded-xl bg-rose-500/5 border border-rose-500/20 space-y-1 text-start">
        <span className="text-label-xxs font-semibold uppercase text-rose-500">{t('self_protection')}</span>
        <p className="text-label-xs text-rose-500/70 leading-tight">
         {t('cannot_modify_self')}
        </p>
       </div>
      )}
     </section>

     {/* Security Protocol Card */}
     <div className="w-full min-w-0 bg-muted/40 border-s-4 border-brand-gold p-4 rounded-e-lg flex flex-col gap-2 text-start shadow-sm shadow-black/10">
      <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
       <Shield className="w-4 h-4 text-brand-gold shrink-0" />
       {t('security_protocol')}
      </h3>
      <p className="text-sm text-muted-foreground leading-relaxed w-full">
       {t('security_protocol_desc')}
      </p>
     </div>
    </div>
   </div>
  </MasterDataFormLayout>
 );
}

function MultiSelect({ label, icon, options, selected, onChange, disabled, t }: {
 label: string;
 icon?: React.ReactNode;
 options: { id: string; label: string }[];
 selected: string[];
 onChange: (v: string[]) => void;
 disabled?: boolean;
 t: (key: string) => string;
}) {
 const toggle = (id: string) => {
  if (disabled) return;
  onChange(selected.includes(id) ? selected.filter(s => s !== id) : [...selected, id]);
 };

 return (
  <div className="space-y-3 w-full min-w-0 text-start">
   <Label className="text-label-xs font-semibold uppercase text-muted-foreground flex items-center gap-2">
    {icon} {label}
   </Label>
   <div className="w-full grid grid-cols-2 lg:grid-cols-3 gap-3">
    {options.map((opt) => {
     const isSelected = selected.includes(opt.id);
     
     let buttonClass = "w-full flex items-center justify-center px-4 py-3 text-sm rounded-lg border transition-all duration-200 gap-2";
     
     if (disabled) {
      buttonClass += " opacity-50 cursor-not-allowed bg-muted text-muted-foreground border-border";
     } else if (isSelected) {
      buttonClass += " bg-primary border-primary text-primary-foreground font-bold shadow-md ring-1 ring-primary/50";
     } else {
      buttonClass += " bg-background border-border text-foreground hover:bg-muted hover:border-primary/30 font-medium";
     }

     return (
      <button
       key={opt.id}
       type="button"
       disabled={disabled}
       onClick={() => toggle(opt.id)}
       className={buttonClass}
      >
       {isSelected && <CheckCircle2 className="w-4 h-4 shrink-0 text-primary-foreground" />}
       <span dir="auto" className="truncate">{opt.label}</span>
      </button>
     );
    })}
   </div>
   {options.length === 0 && (
    <span className="text-label-xs italic opacity-20 py-2 block">{t('no_units_available')}</span>
   )}
  </div>
 );
}