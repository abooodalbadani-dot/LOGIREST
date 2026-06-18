'use client';
import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { useAdminRole, type RoleAction } from '@/features/admin/hooks/useAdminRoles';
import { Checkbox } from '@/components/ui/checkbox';
import { PostConfirmDialog } from '@/components/shared/PostConfirmDialog';
import { ShieldCheck, Lock, AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { MasterDataFormLayout } from '@/features/master-data/components/MasterDataFormLayout';
import { useAudioFeedback } from '@/hooks/useAudioFeedback';
import { ROLE_CAPABILITIES, ROLE_METADATA, canRolePerformAction, type DocumentType, type UserRole, type CapabilityAction } from '@logirest/shared-types';
import { PERMISSION_MATRIX, type ResourceType, type ActionType } from '@/types/rbac';

const ACTION_KEYS: RoleAction[] = ['view', 'create', 'edit', 'approve', 'post'];

const ALL_MODULES = ['Admin', 'Operations', 'Procurement', 'Inventory', 'Communications', 'Reports'];

const isResourceInModule = (resource: string, moduleKey: string): boolean => {
  const res = resource.toLowerCase();
  const mod = moduleKey.toLowerCase();
  
  if (res === mod || res.startsWith(mod + '_')) {
    return true;
  }
  
  if (mod === 'procurement') {
    return ['pr', 'po', 'grn'].includes(res);
  }
  
  if (mod === 'operations') {
    return ['issue', 'transfer', 'adjustment', 'stocktake', 'kitchen_request', 'kitchen_requests', 'internal_transfers'].includes(res);
  }
  
  if (mod === 'inventory') {
    return ['inventory', 'barcode_mapping', 'zones'].includes(res);
  }
  
  if (mod === 'admin') {
    return res.startsWith('master_data') || ['audit_log', 'user'].includes(res);
  }
  
  if (mod === 'communications') {
    return ['email_settings'].includes(res);
  }
  
  return false;
};

interface Props {
  locale: string;
  id: string;
  isReadOnly?: boolean;
}

export function RoleDetailClient({ locale: _locale, id, isReadOnly = false }: Props) {
  const t = useTranslations('admin.roles');
  const router = useRouter();
  const { data: role, isLoading } = useAdminRole(id);
  const { playSound } = useAudioFeedback();

  const [edits, setEdits] = useState<Record<string, Partial<Record<RoleAction, boolean>>>>({});
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const isAdmin = id?.toUpperCase() === 'ADMIN';
  const isAuditor = true; // All roles are immutable and managed by system manifest

  const localPermissions = useMemo(() => {
    const roleId = (id?.toUpperCase() as UserRole) || 'VIEWER';
    
    return ALL_MODULES.map(moduleName => {
      let overrideActions = { view: false, create: false, edit: false, approve: false, post: false };
      
      if (roleId === 'ADMIN') {
        overrideActions = { view: true, create: true, edit: true, approve: true, post: true };
      } else {
        const moduleKey = moduleName.toLowerCase();
        const pm = PERMISSION_MATRIX[roleId] || {};
        
        // Map document capabilities and standard RBAC
        const checkAction = (act: ActionType | CapabilityAction) => {
          // Check PERMISSION_MATRIX
          const hasInMatrix = Object.entries(pm).some(([res, actions]) => 
            isResourceInModule(res, moduleKey) && (actions as string[]).includes(act)
          );
          
          if (hasInMatrix) return true;

          // Check ROLE_CAPABILITIES (for document types)
          const docTypes = Object.keys(ROLE_CAPABILITIES) as DocumentType[];
          return docTypes.some(doc => {
            if (isResourceInModule(doc, moduleKey)) {
              return canRolePerformAction(doc, act as CapabilityAction, roleId);
            }
            return false;
          });
        };

        overrideActions = {
          view: checkAction('view'),
          create: checkAction('create'),
          edit: checkAction('edit'),
          approve: checkAction('approve'),
          post: checkAction('post'),
        };
      }

      return {
        module: moduleName,
        actions: { ...overrideActions, ...(edits[moduleName] || {}) },
      };
    });
  }, [id, edits]);

  const handleToggle = (module: string, action: RoleAction, checked: boolean) => {
    if (isAuditor) return;

    setEdits(prev => {
      const currentDiff = { ...(prev[module] || {}) };
      currentDiff[action] = checked;

      if (checked && action !== 'view') {
        currentDiff.view = true;
      }
      if (!checked && action === 'view') {
        currentDiff.create = false;
        currentDiff.edit = false;
        currentDiff.approve = false;
        currentDiff.post = false;
      }

      return { ...prev, [module]: currentDiff };
    });
  };

  const hasChanges = useMemo(() => {
    return Object.keys(edits).length > 0;
  }, [edits]);

  const isValid = useMemo(() => {
    return localPermissions.some(p => p.actions.view);
  }, [localPermissions]);



  if (isLoading) {
    return (
      <MasterDataFormLayout
        title={t('roles_title') || 'Role Details'}
        backHref="/admin/roles"
        isSaving={false}
        resource="admin"
        saveAction="edit"
        hideSave={isAuditor}
      >
        <div className="w-full min-w-0 col-span-12 gap-6 flex-1 space-y-8 flex-col flex animate-pulse">
          <Skeleton className="h-12 w-64 bg-surface-container-highest/40" />
          <Skeleton className="h-[500px] w-full bg-surface-container-highest/40 rounded-xl" />
        </div>
      </MasterDataFormLayout>
    );
  }

  const roleDisplayName = (id && ROLE_METADATA[id.toUpperCase() as UserRole]?.displayName) || role?.name || t('roles_title');
  const roleDescription = (id && ROLE_METADATA[id.toUpperCase() as UserRole]?.description) || role?.description;

  return (
    <MasterDataFormLayout
      title={roleDisplayName}
      backHref="/admin/roles"
      isSaving={false}
      onSubmit={() => { }}
      resource="admin"
      saveAction="edit"
      hideSave={isAuditor}
      saveDisabled={!hasChanges || !isValid}
    >
      <div className="w-full min-w-0 col-span-12 flex flex-col gap-8 p-6 bg-background animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="w-full min-w-0 flex flex-col items-start text-start gap-2 border-b border-border pb-6">
          <div className="flex items-center gap-4">
            {isAdmin ? <Lock className="w-8 h-8 text-rose-500" /> : <ShieldCheck className="w-8 h-8 text-foreground" />}
            <h1 className="text-3xl font-bold text-foreground uppercase tracking-wider">
              {roleDisplayName}
            </h1>
          </div>
          <p className="text-sm text-muted-foreground max-w-3xl leading-relaxed" dir="auto">
            {roleDescription}
          </p>
        </div>

        {isAdmin && (
          <div className="w-full min-w-0 flex flex-row items-center gap-4 bg-destructive/10 border border-destructive/20 p-4 rounded-xl text-start">
            <div className="text-destructive flex-shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div className="flex flex-col gap-1">
              <h4 className="text-sm font-bold text-destructive">{t('admin_role_locked')}</h4>
              <p className="text-xs text-destructive/80">{t('admin_policy_note')}</p>
            </div>
          </div>
        )}

        {isAuditor && !isAdmin && (
          <div className="w-full min-w-0 flex flex-row items-center gap-4 bg-muted/50 border border-cyan-500/10 p-4 rounded-xl text-start">
            <div className="text-foreground flex-shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="flex flex-col gap-1">
              <h4 className="text-sm font-bold text-foreground">{t('read_only_mode')}</h4>
              <p className="text-xs text-foreground/80">{t('read_only_desc')}</p>
            </div>
          </div>
        )}

        {!isValid && !isAdmin && !isReadOnly && (
          <div className="w-full min-w-0 flex flex-row items-center gap-4 bg-amber-500/5 border border-amber-500/10 p-4 rounded-xl text-start">
            <div className="text-amber-500 flex-shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="flex flex-col gap-1">
              <h4 className="text-sm font-bold text-amber-500">{t('at_least_one_view')}</h4>
            </div>
          </div>
        )}

        <div className="w-full min-w-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          {localPermissions.map((perm) => (
            <div key={perm.module} className="w-full min-w-0 p-4 bg-card border border-border rounded-lg flex flex-col items-start text-start gap-1 hover:border-brand-gold/50 transition-colors group">
              <span className="font-bold text-foreground text-lg transition-colors">
                {perm.module}
              </span>
              <span className="text-[10px] text-muted-foreground/40 font-bold uppercase mb-2">
                {t('namespace_label')}: system.{perm.module.toLowerCase()}
              </span>

              <div className="w-full flex flex-col gap-2 mt-2 border-t border-border/50 pt-4">
                {ACTION_KEYS.map(action => {
                  const isChecked = perm.actions[action];
                  const isDisabled = isAuditor || (action !== 'view' && !perm.actions.view);

                  return (
                    <div key={action} className="flex items-center justify-between w-full">
                      <span className="text-xs font-semibold text-muted-foreground uppercase">{t(action)}</span>
                      <div className={`relative flex items-center justify-center w-8 h-8 rounded-sm border transition-all ${
                        isChecked 
                          ? 'bg-operational-cyan/10 border-operational-cyan/30 text-operational-cyan' 
                          : 'bg-muted/50 border-border text-muted-foreground/30'
                      } ${isDisabled ? 'cursor-not-allowed opacity-90' : 'hover:border-operational-cyan/80'}`}>
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={(checked) => handleToggle(perm.module, action, !!checked)}
                          disabled={isDisabled}
                          className="w-4 h-4 border-none shadow-none rounded-none bg-transparent data-checked:bg-transparent data-checked:text-operational-cyan data-checked:opacity-100 disabled:opacity-100"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </MasterDataFormLayout>
  );
}
