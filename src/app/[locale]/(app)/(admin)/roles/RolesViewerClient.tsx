'use client';

import { PERMISSION_MATRIX, type ResourceType, type ActionType, type UserRole } from '@/types/rbac';
import { Check, Minus } from 'lucide-react';

const ROLES: UserRole[] = ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'PROC_OFFICER', 'AUDITOR'];
const RESOURCES: ResourceType[] = ['grn', 'pr', 'po', 'issue', 'transfer', 'adjustment', 'stocktake', 'inventory', 'master_data', 'admin', 'reports'];
const ACTIONS: ActionType[] = ['view', 'create', 'edit', 'delete', 'post', 'approve'];

export function RolesViewerClient() {
  return (
    <div className="overflow-x-auto border border-surface-3 rounded bg-surface-1">
      <table className="w-full text-sm text-left rtl:text-right">
        <thead className="bg-surface-2 text-on-surface-muted border-b border-surface-3">
          <tr>
            <th className="px-4 py-3 font-medium">{/* Resource / Action header */}</th>
            {ROLES.map((role) => (
              <th key={role} className="px-4 py-3 font-medium text-center" colSpan={ACTIONS.length}>
                {role}
              </th>
            ))}
          </tr>
          <tr>
            <th className="px-4 py-2 bg-surface-2 border-b border-surface-3" />
            {ROLES.map((role) =>
              ACTIONS.map((action) => (
                <th key={`${role}-${action}`} className="px-2 py-2 text-xs font-medium bg-surface-2 border-b border-surface-3 text-center">
                  {action}
                </th>
              ))
            )}
          </tr>
        </thead>
        <tbody>
          {RESOURCES.map((resource) => (
            <tr key={resource} className="border-b border-surface-3 hover:bg-surface-2 transition-colors">
              <td className="px-4 py-3 font-mono text-on-surface">{resource}</td>
              {ROLES.map((role) =>
                ACTIONS.map((action) => {
                  const allowed = (PERMISSION_MATRIX[role]?.[resource] ?? []).includes(action);
                  return (
                    <td key={`${role}-${resource}-${action}`} className="px-2 py-3 text-center">
                      {allowed ? (
                        <Check className="w-4 h-4 text-neon-green mx-auto" />
                      ) : (
                        <Minus className="w-4 h-4 text-surface-3 mx-auto" />
                      )}
                    </td>
                  );
                })
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}