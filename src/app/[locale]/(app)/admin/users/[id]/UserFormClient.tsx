'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/shared/PageHeader';
import { useAdminUser } from '@/features/admin/hooks/useAdminUsers';
import { useAuth } from '@/providers/AuthProvider';
import { type UserRole } from '@/types/rbac';
import { Can } from '@/components/auth/Can';

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
    <div className="space-y-6">
      <PageHeader title={id ? editTitle : createTitle} />

      <form onSubmit={onSubmit} className="max-w-2xl space-y-4">
        <div className="grid gap-1.5">
          <Label htmlFor="user-name">{t('name')}</Label>
          <Input id="user-name" {...register('name')} disabled={isAuditor} dir="rtl" />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="user-email">{t('email')}</Label>
          <Input id="user-email" dir="ltr" {...register('email')} disabled={isAuditor} />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="user-role">{t('role')}</Label>
          <select
            id="user-role"
            className="w-full rounded border border-surface-3 bg-surface-2 px-3 py-2 text-sm text-on-surface"
            {...register('role')}
            disabled={isAuditor}
          >
            {ALL_ROLES.map((role) => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>
        </div>

        <MultiSelect
          label={t('branch_scope')}
          options={MOCK_BRANCHES.map(b => ({ id: b.id, label: b.name_en }))}
          // eslint-disable-next-line react-hooks/incompatible-library
          selected={watch('branch_ids')}
          onChange={(v) => setValue('branch_ids', v)}
          disabled={isAuditor}
        />

        <MultiSelect
          label={t('warehouse_scope')}
          options={MOCK_WAREHOUSES.map(w => ({ id: w.id, label: w.name_en }))}
          selected={watch('warehouse_ids')}
          onChange={(v) => setValue('warehouse_ids', v)}
          disabled={isAuditor}
        />

        <MultiSelect
          label={t('department_scope')}
          options={MOCK_DEPARTMENTS.map(d => ({ id: d.id, label: d.name_en }))}
          selected={watch('department_ids')}
          onChange={(v) => setValue('department_ids', v)}
          disabled={isAuditor}
        />

        <Can perform={id ? "edit" : "create"} on="admin">
          <div className="flex gap-2">
            <button type="submit" className="px-4 py-2 bg-cyan-500 text-surface-0 rounded font-medium hover:bg-cyan-500/80 transition-colors">
              {id ? (t('edit_user').includes('تعديل') ? 'حفظ' : 'Save') : (t('create_user').includes('إنشاء') ? 'إنشاء' : 'Create')}
            </button>
            <button type="button" onClick={() => router.push(`/${locale}/admin/users`)} className="px-4 py-2 bg-surface-3 text-on-surface rounded hover:bg-surface-2 transition-colors">
              {t('name').includes('الاسم') ? 'إلغاء' : 'Cancel'}
            </button>
          </div>
        </Can>
      </form>
    </div>
  );
}

function MultiSelect({ label, options, selected, onChange, disabled }: {
  label: string;
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
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            disabled={disabled}
            onClick={() => toggle(opt.id)}
            className={`px-3 py-1.5 text-sm rounded border transition-colors ${
              selected.includes(opt.id)
                ? 'bg-cyan-500/20 border-cyan-500 text-cyan-500'
                : 'bg-surface-2 border-surface-3 text-on-surface-muted hover:bg-surface-3'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <span dir="ltr">{opt.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}