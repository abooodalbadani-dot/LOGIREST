'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAdminUser } from '@/features/admin/hooks/useAdminUsers';
import { useAuth } from '@/providers/AuthProvider';
import { type UserRole } from '@/types/rbac';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { MasterDataFormLayout } from '@/features/master-data/components/MasterDataFormLayout';
import { Card, CardContent } from '@/components/ui/card';
import { User, Mail, Shield, MapPin, Warehouse, Building2, CheckCircle2 } from 'lucide-react';

const ALL_ROLES: UserRole[] = ['ADMIN', 'INV_MGR', 'APPROVER', 'WH_KEEPER', 'PROC_OFFICER', 'AUDITOR', 'VIEWER'];

const MOCK_BRANCHES = [
  { id: 'br-1', name_ar: 'الفرع الرئيسي', name_en: 'Main Branch' },
  { id: 'br-2', name_ar: 'فرع الشمال', name_en: 'North Branch' },
];

const MOCK_WAREHOUSES = [
  { id: 'wh-1', name_ar: 'المستودع الرئيسي', name_en: 'Main Warehouse' },
  { id: 'wh-2', name_ar: 'مستودع التبريد', name_en: 'Cold Storage' },
  { id: 'wh-3', name_ar: 'المستودع الجاف', name_en: 'Dry Storage' },
];

const MOCK_DEPARTMENTS = [
  { id: 'dep-1', name_ar: 'المطبخ', name_en: 'Kitchen' },
  { id: 'dep-2', name_ar: 'الخدمة', name_en: 'Service' },
];

interface Props {
  id: string | null;
  createTitle: string;
  editTitle: string;
  locale: string;
}

export function UserFormClient({ id, createTitle, editTitle, locale }: Props) {
  const t = useTranslations('admin');
  const tc = useTranslations('masterData.common');
  const router = useRouter();
  const { data, isLoading } = useAdminUser(id);
  const { user: currentUser } = useAuth();
  const isAuditor = currentUser?.role === 'AUDITOR';

  const { register, handleSubmit, reset, watch, setValue } = useForm({
    defaultValues: {
      name: '',
      email: '',
      role: 'WH_KEEPER' as UserRole,
      branch_ids: [] as string[],
      warehouse_ids: [] as string[],
      department_ids: [] as string[],
    },
  });

  useEffect(() => {
    if (data) {
      reset({
        name: data.name,
        email: data.email,
        role: data.role as UserRole,
        branch_ids: data.scopes.filter(s => s.branch_id).map(s => s.branch_id!),
        warehouse_ids: data.scopes.filter(s => s.warehouse_id).map(s => s.warehouse_id!),
        department_ids: data.scopes.filter(s => s.department_id).map(s => s.department_id!),
      });
    }
  }, [data, reset]);

  const onSubmit = handleSubmit(() => {
    router.push(`/${locale}/admin/users`);
  });

  if (isLoading && id) {
    return <div className="flex items-center justify-center h-48"><div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <MasterDataFormLayout
      title={id ? editTitle : createTitle}
      backHref={`/${locale}/admin/users`}
      isSaving={false} // Hook this up to a mutation if available
      onSubmit={onSubmit}
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
                <h2 className="text-lg font-black uppercase tracking-tight">{t('user_identity')}</h2>
                <p className="text-[10px] text-muted-foreground/60 uppercase tracking-[0.2em] font-bold">Profile credentials and metadata</p>
              </div>
            </div>

            <Card className="bg-surface-container-low border-outline-low rounded-sm shadow-none">
              <CardContent className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted flex items-center gap-2">
                    <User className="w-3 h-3" /> {t('name')}
                  </Label>
                  <Input 
                    id="user-name" 
                    {...register('name')} 
                    disabled={isAuditor} 
                    dir="rtl"
                    className="h-11 bg-surface-container-highest/30 border-outline-low rounded-sm focus:ring-cyan-500/50"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted flex items-center gap-2">
                    <Mail className="w-3 h-3" /> {t('email')}
                  </Label>
                  <Input 
                    id="user-email" 
                    dir="ltr" 
                    {...register('email')} 
                    disabled={isAuditor}
                    className="h-11 bg-surface-container-highest/30 border-outline-low rounded-sm focus:ring-cyan-500/50"
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
                <h2 className="text-lg font-black uppercase tracking-tight">{t('access_scopes')}</h2>
                <p className="text-[10px] text-muted-foreground/60 uppercase tracking-[0.2em] font-bold">Organizational unit boundaries</p>
              </div>
            </div>

            <Card className="bg-surface-container-low border-outline-low rounded-sm shadow-none">
              <CardContent className="p-8 space-y-10">
                <MultiSelect
                  label={t('branch_scope')}
                  icon={<Building2 className="w-3 h-3" />}
                  options={MOCK_BRANCHES.map(b => ({ id: b.id, label: b.name_en }))}
                  selected={watch('branch_ids')}
                  onChange={(v) => setValue('branch_ids', v)}
                  disabled={isAuditor}
                />

                <MultiSelect
                  label={t('warehouse_scope')}
                  icon={<Warehouse className="w-3 h-3" />}
                  options={MOCK_WAREHOUSES.map(w => ({ id: w.id, label: w.name_en }))}
                  selected={watch('warehouse_ids')}
                  onChange={(v) => setValue('warehouse_ids', v)}
                  disabled={isAuditor}
                />

                <MultiSelect
                  label={t('department_scope')}
                  icon={<Building2 className="w-3 h-3" />}
                  options={MOCK_DEPARTMENTS.map(d => ({ id: d.id, label: d.name_en }))}
                  selected={watch('department_ids')}
                  onChange={(v) => setValue('department_ids', v)}
                  disabled={isAuditor}
                />
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
                <h2 className="text-lg font-black uppercase tracking-tight">{t('governance')}</h2>
                <p className="text-[10px] text-muted-foreground/60 uppercase tracking-[0.2em] font-bold">System role & Permissions</p>
              </div>
            </div>

            <Card className="bg-surface-container-highest/10 border-outline-low rounded-sm shadow-none overflow-hidden">
              <div className="p-1.5 bg-cyan-500/10 border-b border-outline-low flex items-center justify-center gap-2">
                <CheckCircle2 className="w-3 h-3 text-cyan-500" />
                <span className="text-[9px] font-black uppercase tracking-widest text-cyan-500">Live Permissions Policy</span>
              </div>
              <CardContent className="p-6 space-y-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">
                    {t('role')}
                  </Label>
                  <select
                    id="user-role"
                    className="h-11 px-4 bg-surface-container-highest/30 border border-outline-low rounded-sm w-full text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500/50 transition-all appearance-none"
                    {...register('role')}
                    disabled={isAuditor}
                  >
                    {ALL_ROLES.map((role) => (
                      <option key={role} value={role} className="bg-surface-container-low text-foreground">{role}</option>
                    ))}
                  </select>
                </div>

                <div className="p-4 rounded-sm bg-surface-container-low border border-outline-low space-y-3">
                  <div className="flex justify-between items-center border-b border-outline-low pb-2">
                    <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">Admin Access</span>
                    <div className={`w-2 h-2 rounded-full ${watch('role') === 'ADMIN' ? 'bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.6)]' : 'bg-outline-low'}`} />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">Audit Log Visibility</span>
                    <div className="w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.6)]" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          <div className="p-6 rounded-sm bg-surface-container-low border border-outline-low border-l-4 border-l-cyan-500">
            <h3 className="text-xs font-black uppercase tracking-widest text-foreground mb-2">Security Note</h3>
            <p className="text-[11px] text-muted-foreground/60 leading-relaxed">
              Scope-based restrictions apply immediately upon save. Users must refresh their session to reflect new permissions.
            </p>
          </div>
        </div>
      </div>
    </MasterDataFormLayout>
  );
}

function MultiSelect({ label, icon, options, selected, onChange, disabled }: {
  label: string;
  icon?: React.ReactNode;
  options: { id: string; label: string }[];
  selected: string[];
  onChange: (v: string[]) => void;
  disabled?: boolean;
}) {
  const toggle = (id: string) => {
    if (disabled) return;
    onChange(selected.includes(id) ? selected.filter(s => s !== id) : [...selected, id]);
  };

  return (
    <div className="space-y-3">
      <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted flex items-center gap-2">
        {icon} {label}
      </Label>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            disabled={disabled}
            onClick={() => toggle(opt.id)}
            className={`h-9 px-4 text-[10px] font-black uppercase tracking-widest rounded-sm border transition-all flex items-center gap-2 ${
              selected.includes(opt.id)
                ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.1)]'
                : 'bg-surface-container-highest/20 border-outline-low text-muted-foreground/60 hover:bg-surface-container-highest/40'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {selected.includes(opt.id) && <CheckCircle2 className="w-3 h-3" />}
            <span dir="ltr">{opt.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}