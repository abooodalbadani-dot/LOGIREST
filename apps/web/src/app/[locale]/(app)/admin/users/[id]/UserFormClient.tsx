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
  { value: 'ADMIN',        labelEn: 'System Administrator', labelAr: 'مسؤول النظام'       },
  { value: 'GM',           labelEn: 'General Manager',      labelAr: 'المدير العام'        },
  { value: 'BRANCH_MGR',  labelEn: 'Branch Manager',       labelAr: 'مدير الفرع'         },
  { value: 'INV_MGR',     labelEn: 'Inventory Manager',    labelAr: 'مدير المخزون'       },
  { value: 'STORE_MGR',   labelEn: 'Store Manager',        labelAr: 'مدير المتجر'        },
  { value: 'WH_KEEPER',   labelEn: 'Warehouse Keeper',     labelAr: 'أمين المستودع'      },
  { value: 'KITCHEN_CHIEF', labelEn: 'Kitchen Chief',      labelAr: 'رئيس المطبخ'        },
  { value: 'PROC_MGR',    labelEn: 'Procurement Manager',  labelAr: 'مدير المشتريات'     },
  { value: 'PROC_OFFICER', labelEn: 'Procurement Officer', labelAr: 'مسؤول المشتريات'    },
  { value: 'APPROVER',    labelEn: 'Approver',             labelAr: 'مفوض الاعتماد'      },
  { value: 'AUDITOR',     labelEn: 'Auditor',              labelAr: 'مدقق مالي'          },
  { value: 'VIEWER',      labelEn: 'Viewer (Read-Only)',   labelAr: 'مشاهد (قراءة فقط)' },
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
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
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
      <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
        {/* Main Identity & Access */}
        <div className="md:col-span-8 space-y-10">
          {/* Identity Section */}
          <section className="space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-sm bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                <User className="w-5 h-5 text-cyan-500" />
              </div>
              <div>
                <h2 className="text-title-sm font-semibold uppercase">{t('user_identity')}</h2>
                <p className="text-label-xs text-muted-foreground/60 uppercase font-bold">{t('profile_metadata')}</p>
              </div>
            </div>

            <Card className="bg-surface-container-low border-outline-low rounded-sm shadow-none">
              <CardContent className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <Label className="text-label-xs font-semibold uppercase text-text-muted flex items-center gap-2">
                    <User className="w-3 h-3" /> {t('name')}
                  </Label>
                  <Input 
                    {...register('name')} 
                    disabled={isAuditor} 
                    dir="auto"
                    className={`h-11 bg-surface-container-highest/30 border-outline-low rounded-sm focus:ring-cyan-500/50 font-bold ${errors.name ? 'border-rose-500' : ''}`}
                  />
                  {errors.name?.message && (
                    <p className="text-label-xxs text-rose-500 font-bold uppercase">
                      {t(errors.name.message as Parameters<typeof t>[0])}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-label-xs font-semibold uppercase text-text-muted flex items-center gap-2">
                    <Mail className="w-3 h-3" /> {t('email')}
                  </Label>
                  <Input 
                    dir="ltr" 
                    {...register('email')} 
                    disabled={isAuditor}
                    className={`h-11 bg-surface-container-highest/30 border-outline-low rounded-sm focus:ring-cyan-500/50 font-mono font-bold ${errors.email ? 'border-rose-500' : ''}`}
                  />
                  {errors.email?.message && (
                    <p className="text-label-xxs text-rose-500 font-bold uppercase">
                      {t(errors.email.message as Parameters<typeof t>[0])}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-label-xs font-semibold uppercase text-text-muted flex items-center gap-2">
                    <Globe className="w-3 h-3" /> {t('language')}
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
                         className="w-full bg-surface-container-highest/30 border border-outline-low text-label-xs font-bold"
                       />
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Scopes Section */}
          <section className="space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-sm bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-cyan-500" />
              </div>
              <div>
                <h2 className="text-title-sm font-semibold uppercase">{t('access_scopes')}</h2>
                <p className="text-label-xs text-muted-foreground/60 uppercase font-bold">{t('organizational_units')}</p>
              </div>
            </div>

            <Card className="bg-surface-container-low border-outline-low rounded-sm shadow-none">
              <CardContent className="p-8 space-y-10">
                <MultiSelect
                  label={t('branch_scope')}
                  icon={<Building2 className="w-3 h-3" />}
                  options={branches.map(b => ({ id: b.id, label: b.name || b.code }))}
                  selected={selectedBranches}
                  onChange={(v) => setValue('branchIds', v)}
                  disabled={isAuditor || isSelf}
                  t={t}
                />

                <MultiSelect
                  label={t('warehouse_scope')}
                  icon={<Warehouse className="w-3 h-3" />}
                  options={filteredWarehouses.map(w => ({ id: w.id, label: w.name || w.code }))}
                  selected={selectedWarehouses}
                  onChange={(v) => setValue('warehouseIds', v)}
                  disabled={isAuditor || isSelf || !selectedBranches.length}
                  t={t}
                />

                <MultiSelect
                  label={t('department_scope')}
                  icon={<Building2 className="w-3 h-3" />}
                  options={filteredDepartments.map(d => ({ id: d.id, label: d.name || d.code }))}
                  selected={selectedDepartments}
                  onChange={(v) => setValue('departmentIds', v)}
                  disabled={isAuditor || isSelf || !selectedBranches.length}
                  t={t}
                />

                {(!selectedBranches.length) && (
                  <div className="p-4 rounded-sm bg-amber-500/5 border border-amber-500/20 flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    <span className="text-label-xs font-bold text-amber-500 uppercase">{t('branch_selection_hint')}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
        </div>

        {/* Sidebar Status & Roles */}
        <div className="md:col-span-4 space-y-10">
          <section className="space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-sm bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                <Shield className="w-5 h-5 text-cyan-500" />
              </div>
              <div>
                <h2 className="text-title-sm font-semibold uppercase">{t('governance')}</h2>
                <p className="text-label-xs text-muted-foreground/60 uppercase font-bold">{t('role_permissions')}</p>
              </div>
            </div>

            <Card className="bg-surface-container-highest/10 border-outline-low rounded-sm shadow-none overflow-hidden">
              <div className="p-1.5 bg-cyan-500/10 border-b border-outline-low flex items-center justify-center gap-2">
                <CheckCircle2 className="w-3 h-3 text-cyan-500" />
                <span className="text-label-xxs font-semibold uppercase text-cyan-500">{t('live_policy')}</span>
              </div>
              <CardContent className="p-6 space-y-8">
                <div className="space-y-2">
                  <Label className="text-label-xs font-semibold uppercase text-text-muted">
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
                         className="w-full bg-surface-container-highest/30 border border-outline-low text-label-xs font-bold"
                       />
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-label-xs font-semibold uppercase text-text-muted flex items-center gap-2">
                    <Power className="w-3 h-3" /> {t('status')}
                  </Label>
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      disabled={isAuditor || isSelf || isLastAdmin}
                      onClick={() => setValue('status', 'ACTIVE')}
                      className={`flex-1 h-11 rounded-sm border text-label-xs font-semibold uppercase transition-all ${ selectedStatus === 'ACTIVE' ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'bg-surface-container-highest/20 border-outline-low text-muted-foreground/40 hover:bg-surface-container-highest/40' }`}
                    >
                      {t('activate')}
                    </button>
                    <button
                      type="button"
                      disabled={isAuditor || isSelf || isLastAdmin}
                      onClick={() => setValue('status', 'INACTIVE')}
                      className={`flex-1 h-11 rounded-sm border text-label-xs font-semibold uppercase transition-all ${ selectedStatus === 'INACTIVE' ? 'bg-rose-500/10 border-rose-500/50 text-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.1)]' : 'bg-surface-container-highest/20 border-outline-low text-muted-foreground/40 hover:bg-surface-container-highest/40' }`}
                    >
                      {t('deactivate')}
                    </button>
                  </div>
                </div>

                {isLastAdmin && (selectedStatus === 'INACTIVE' || selectedRole !== 'ADMIN') && (
                  <div className="p-4 rounded-sm bg-amber-500/5 border border-amber-500/20 space-y-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-3 h-3 text-amber-500" />
                      <span className="text-label-xxs font-semibold uppercase text-amber-500">{t('critical_lockdown')}</span>
                    </div>
                    <p className="text-label-xs text-amber-500/70 leading-tight">
                      {t('cannot_deactivate_last_admin')}
                    </p>
                  </div>
                )}

                {isSelf && (
                  <div className="p-4 rounded-sm bg-rose-500/5 border border-rose-500/20 space-y-1">
                    <span className="text-label-xxs font-semibold uppercase text-rose-500">{t('self_protection')}</span>
                    <p className="text-label-xs text-rose-500/70 leading-tight">
                      {t('cannot_modify_self')}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          <div className="p-6 rounded-sm bg-surface-container-low border border-outline-low border-l-4 border-l-cyan-500 shadow-lg shadow-black/20">
            <h3 className="text-label-sm font-semibold uppercase text-foreground mb-2 flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-cyan-500" />
              {t('security_protocol')}
            </h3>
            <p className="text-label-xs text-muted-foreground/60 leading-relaxed font-medium">
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
    <div className="space-y-3">
      <Label className="text-label-xs font-semibold uppercase text-text-muted flex items-center gap-2">
        {icon} {label}
      </Label>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            disabled={disabled}
            onClick={() => toggle(opt.id)}
            className={`h-9 px-4 text-label-xs font-semibold uppercase rounded-sm border transition-all flex items-center gap-2 ${ selected.includes(opt.id) ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.1)]' : 'bg-surface-container-highest/20 border-outline-low text-muted-foreground/60 hover:bg-surface-container-highest/40' } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {selected.includes(opt.id) && <CheckCircle2 className="w-3 h-3" />}
            <span dir="auto">{opt.label}</span>
          </button>
        ))}
        {options.length === 0 && (
          <span className="text-label-xs italic opacity-20 py-2">{t('no_units_available')}</span>
        )}
      </div>
    </div>
  );
}