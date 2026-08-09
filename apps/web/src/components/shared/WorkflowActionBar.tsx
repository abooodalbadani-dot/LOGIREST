'use client';

import * as React from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { 
  CheckCircle2, 
  XCircle, 
  Send, 
  Ban, 
  CheckCheck, 
  ShoppingCart, 
  Edit3, 
  Trash2, 
  PackageCheck, 
  Truck, 
  Loader2 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ActionGuard } from '@/core/workflow/ActionGuard';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { type DocumentType, type DocumentStatus } from '@logirest/shared-types';
import { type ResourceType } from '@/types/rbac';
import { cn } from '@/lib/utils';

const DEFAULT_RESOURCE_MAP: Record<string, ResourceType> = {
  pr: 'pr',
  PR: 'pr',
  po: 'po',
  PO: 'po',
  grn: 'grn',
  GRN: 'grn',
  issue: 'issue',
  ISSUE: 'issue',
  transfer: 'transfer',
  TRANSFER: 'transfer',
  adjustment: 'adjustment',
  ADJUSTMENT: 'adjustment',
  stocktake: 'stocktake',
  STOCKTAKE: 'stocktake',
  kitchen_request: 'kitchen_requests',
  KITCHEN_REQUEST: 'kitchen_requests',
};

export interface WorkflowActionBarProps {
  documentType: DocumentType;
  status: DocumentStatus;
  documentCreatorId?: string | null;
  currentUserId?: string | null;
  userRole?: string | null;
  resource?: ResourceType;
  
  // Action Handlers & Loading States
  onApprove?: () => void | Promise<void>;
  isApprovePending?: boolean;
  
  onReject?: () => void | Promise<void>;
  isRejectPending?: boolean;
  
  onSubmit?: () => void | Promise<void>;
  isSubmitPending?: boolean;
  
  onCancel?: () => void | Promise<void>;
  isCancelPending?: boolean;
  
  onPost?: () => void | Promise<void>;
  isPostPending?: boolean;
  
  onConvertToPO?: () => void | Promise<void>;
  isConvertToPOPending?: boolean;
  
  onEdit?: () => void | Promise<void>;
  isEditPending?: boolean;
  
  onDelete?: () => void | Promise<void>;
  isDeletePending?: boolean;
  
  onVoid?: () => void | Promise<void>;
  isVoidPending?: boolean;
  
  onFulfill?: () => void | Promise<void>;
  isFulfillPending?: boolean;
  
  onShip?: () => void | Promise<void>;
  isShipPending?: boolean;
  
  onReceive?: () => void | Promise<void>;
  isReceivePending?: boolean;
  
  extraActions?: React.ReactNode;
  className?: string;
}

/**
 * Universal Sticky Workflow Action Bar
 * Implements the Two-Tier Guard Pattern (<ActionGuard> + <PermissionGate>)
 * and strictly enforces Anti-Self-Approval logic for Approve and Reject operations.
 */
export function WorkflowActionBar({
  documentType,
  status,
  documentCreatorId,
  currentUserId,
  userRole,
  resource,
  onApprove,
  isApprovePending = false,
  onReject,
  isRejectPending = false,
  onSubmit,
  isSubmitPending = false,
  onCancel,
  isCancelPending = false,
  onPost,
  isPostPending = false,
  onConvertToPO,
  isConvertToPOPending = false,
  onEdit,
  isEditPending = false,
  onDelete,
  isDeletePending = false,
  onVoid,
  isVoidPending = false,
  onFulfill,
  isFulfillPending = false,
  onShip,
  isShipPending = false,
  onReceive,
  isReceivePending = false,
  extraActions,
  className,
}: WorkflowActionBarProps) {
  const tc = useTranslations('common');
  const locale = useLocale() as 'ar' | 'en';

  const targetResource = resource || DEFAULT_RESOURCE_MAP[documentType] || 'pr';
  const role = userRole ?? undefined;

  // Separation of Duties: Anti-Self-Approval Rule (Exempt for STOCKTAKE, ADJUSTMENT, and ADMIN role)
  const isSelfApproval = Boolean(
    documentType !== 'STOCKTAKE' &&
    documentType !== 'ADJUSTMENT' &&
    role !== 'ADMIN' &&
    documentCreatorId && currentUserId && documentCreatorId === currentUserId
  );

  const antiSelfApprovalMsg =
    (tc.has('errors.anti_self_approval') ? tc('errors.anti_self_approval') : null) ||
    (locale === 'ar'
      ? 'فصل المهام: لا يمكنك اعتماد أو رفض مستند قمت بإنشائه.'
      : 'Separation of Duties: You cannot approve or reject a document you created.');

  return (
    <div
      className={cn(
        'sticky bottom-0 z-50 w-full bg-background/95 backdrop-blur-md border-t border-border shadow-lg p-3.5 sm:p-4 flex flex-wrap items-center justify-center md:justify-between gap-3 sm:gap-4 print:hidden transition-all',
        className
      )}
    >
      {/* Left Slot: Extra Actions (e.g. Export Dropdowns, Custom Tools) */}
      {extraActions && (
        <div className="flex items-center justify-center gap-2">
          {extraActions}
        </div>
      )}

      {/* Right Slot: Workflow Action Buttons */}
      <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3 mx-auto md:ms-auto md:mx-0">
        {/* 1. EDIT ACTION */}
        {onEdit && (
          <ActionGuard documentType={documentType} status={status} action="EDIT" role={role}>
            <PermissionGate action="edit" resource={targetResource}>
              <Button
                type="button"
                onClick={onEdit}
                disabled={isEditPending}
                variant="outline"
                className="h-10 px-4 rounded-xl border-border text-label-xs font-bold uppercase transition-all flex items-center"
              >
                {isEditPending ? (
                  <Loader2 className="w-4 h-4 animate-spin me-2" />
                ) : (
                  <Edit3 className="w-4 h-4 me-2" />
                )}
                {(tc.has('actions.edit') ? tc('actions.edit') : null) || (locale === 'ar' ? 'تعديل' : 'Edit')}
              </Button>
            </PermissionGate>
          </ActionGuard>
        )}

        {/* 2. DELETE ACTION */}
        {onDelete && (
          <PermissionGate action="delete" resource={targetResource}>
            <Button
              type="button"
              variant="destructive"
              onClick={onDelete}
              disabled={isDeletePending}
              className="h-10 px-4 rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 text-label-xs font-bold uppercase shadow-sm transition-all flex items-center"
            >
              {isDeletePending ? (
                <Loader2 className="w-4 h-4 animate-spin me-2" />
              ) : (
                <Trash2 className="w-4 h-4 me-2" />
              )}
              {(tc.has('actions.delete') ? tc('actions.delete') : null) || (locale === 'ar' ? 'حذف' : 'Delete')}
            </Button>
          </PermissionGate>
        )}

        {/* 3. SUBMIT ACTION */}
        {onSubmit && (
          <ActionGuard documentType={documentType} status={status} action="SUBMIT" role={role}>
            <PermissionGate action="submit" resource={targetResource}>
              <Button
                type="button"
                onClick={onSubmit}
                disabled={isSubmitPending}
                className="h-10 px-5 rounded-xl bg-operational-cyan hover:brightness-110 text-white text-label-xs font-bold uppercase shadow-md shadow-operational-cyan/20 transition-all active:scale-95 border-none flex items-center"
              >
                {isSubmitPending ? (
                  <Loader2 className="w-4 h-4 animate-spin me-2" />
                ) : (
                  <Send className="w-4 h-4 me-2" />
                )}
                {(tc.has('actions.submit') ? tc('actions.submit') : null) || (locale === 'ar' ? 'تقديم' : 'Submit')}
              </Button>
            </PermissionGate>
          </ActionGuard>
        )}

        {/* 4. APPROVE ACTION (WITH ANTI-SELF-APPROVAL GUARD) */}
        {onApprove && (
          <ActionGuard documentType={documentType} status={status} action="APPROVE" role={role}>
            <PermissionGate action="approve" resource={targetResource}>
              {isSelfApproval ? (
                <span title={antiSelfApprovalMsg} className="inline-block cursor-not-allowed">
                  <Button
                    type="button"
                    disabled={true}
                    className="h-10 px-5 rounded-xl bg-emerald-600/40 text-white/70 text-label-xs font-bold uppercase border-none cursor-not-allowed opacity-60 flex items-center"
                  >
                    <CheckCircle2 className="w-4 h-4 me-2" />
                    {(tc.has('actions.approve') ? tc('actions.approve') : null) || (locale === 'ar' ? 'اعتماد' : 'Approve')}
                  </Button>
                </span>
              ) : (
                <Button
                  type="button"
                  onClick={onApprove}
                  disabled={isApprovePending}
                  className="h-10 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-label-xs font-bold uppercase shadow-md shadow-emerald-600/20 transition-all active:scale-95 border-none flex items-center"
                >
                  {isApprovePending ? (
                    <Loader2 className="w-4 h-4 animate-spin me-2" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 me-2" />
                  )}
                  {(tc.has('actions.approve') ? tc('actions.approve') : null) || (locale === 'ar' ? 'اعتماد' : 'Approve')}
                </Button>
              )}
            </PermissionGate>
          </ActionGuard>
        )}

        {/* 5. REJECT ACTION (WITH ANTI-SELF-APPROVAL GUARD) */}
        {onReject && (
          <ActionGuard documentType={documentType} status={status} action="REJECT" role={role}>
            <PermissionGate action="reject" resource={targetResource}>
              {isSelfApproval ? (
                <span title={antiSelfApprovalMsg} className="inline-block cursor-not-allowed">
                  <Button
                    type="button"
                    disabled={true}
                    className="h-10 px-5 rounded-xl bg-rose-600/40 text-white/70 text-label-xs font-bold uppercase border-none cursor-not-allowed opacity-60 flex items-center"
                  >
                    <XCircle className="w-4 h-4 me-2" />
                    {(tc.has('actions.reject') ? tc('actions.reject') : null) || (locale === 'ar' ? 'رفض' : 'Reject')}
                  </Button>
                </span>
              ) : (
                <Button
                  type="button"
                  onClick={onReject}
                  disabled={isRejectPending}
                  className="h-10 px-5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-label-xs font-bold uppercase shadow-md shadow-rose-600/20 transition-all active:scale-95 border-none flex items-center"
                >
                  {isRejectPending ? (
                    <Loader2 className="w-4 h-4 animate-spin me-2" />
                  ) : (
                    <XCircle className="w-4 h-4 me-2" />
                  )}
                  {(tc.has('actions.reject') ? tc('actions.reject') : null) || (locale === 'ar' ? 'رفض' : 'Reject')}
                </Button>
              )}
            </PermissionGate>
          </ActionGuard>
        )}

        {/* 6. CONVERT TO PO ACTION */}
        {onConvertToPO && (
          <ActionGuard documentType={documentType} status={status} action="CONVERT_TO_PO" role={role}>
            <PermissionGate action="create" resource="po">
              <Button
                type="button"
                onClick={onConvertToPO}
                disabled={isConvertToPOPending}
                className="h-10 px-5 rounded-xl bg-brand-gold hover:bg-brand-gold/90 text-white text-label-xs font-bold uppercase shadow-md shadow-brand-gold/20 transition-all active:scale-95 border-none flex items-center"
              >
                {isConvertToPOPending ? (
                  <Loader2 className="w-4 h-4 animate-spin me-2" />
                ) : (
                  <ShoppingCart className="w-4 h-4 me-2" />
                )}
                {(tc.has('actions.convert_to_po') ? tc('actions.convert_to_po') : null) || (locale === 'ar' ? 'تحويل لأمر شراء' : 'Convert to PO')}
              </Button>
            </PermissionGate>
          </ActionGuard>
        )}

        {/* 7. POST ACTION */}
        {onPost && (
          <ActionGuard documentType={documentType} status={status} action="POST" role={role}>
            <PermissionGate action="post" resource={targetResource}>
              <Button
                type="button"
                onClick={onPost}
                disabled={isPostPending}
                className="h-10 px-5 rounded-xl bg-[#b48e67] hover:bg-[#b5952f] text-[#0B1220] font-bold uppercase text-label-xs shadow-md transition-all active:scale-95 border-none flex items-center"
              >
                {isPostPending ? (
                  <Loader2 className="w-4 h-4 animate-spin me-2" />
                ) : (
                  <CheckCheck className="w-4 h-4 me-2" />
                )}
                {(tc.has('actions.post') ? tc('actions.post') : null) || (locale === 'ar' ? 'ترحيل' : 'Post')}
              </Button>
            </PermissionGate>
          </ActionGuard>
        )}

        {/* 8. SHIP ACTION */}
        {onShip && (
          <ActionGuard documentType={documentType} status={status} action="SHIP" role={role}>
            <PermissionGate action="ship" resource={targetResource}>
              <Button
                type="button"
                onClick={onShip}
                disabled={isShipPending}
                className="h-10 px-5 rounded-xl bg-brand-gold hover:bg-brand-gold/90 text-white text-label-xs font-bold uppercase shadow-md transition-all flex items-center"
              >
                {isShipPending ? (
                  <Loader2 className="w-4 h-4 animate-spin me-2" />
                ) : (
                  <Truck className="w-4 h-4 me-2" />
                )}
                {(tc.has('actions.ship') ? tc('actions.ship') : null) || (locale === 'ar' ? 'شحن' : 'Ship')}
              </Button>
            </PermissionGate>
          </ActionGuard>
        )}

        {/* 9. RECEIVE ACTION */}
        {onReceive && (
          <ActionGuard documentType={documentType} status={status} action="RECEIVE" role={role}>
            <PermissionGate action="receive" resource={targetResource}>
              <Button
                type="button"
                onClick={onReceive}
                disabled={isReceivePending}
                className="h-10 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-label-xs font-bold uppercase shadow-md transition-all flex items-center"
              >
                {isReceivePending ? (
                  <Loader2 className="w-4 h-4 animate-spin me-2" />
                ) : (
                  <PackageCheck className="w-4 h-4 me-2" />
                )}
                {(tc.has('actions.receive') ? tc('actions.receive') : null) || (locale === 'ar' ? 'استلام' : 'Receive')}
              </Button>
            </PermissionGate>
          </ActionGuard>
        )}

        {/* 10. FULFILL ACTION */}
        {onFulfill && (
          <ActionGuard documentType={documentType} status={status} action="FULFILL" role={role}>
            <PermissionGate action="fulfill" resource={targetResource}>
              <Button
                type="button"
                onClick={onFulfill}
                disabled={isFulfillPending}
                className="h-10 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-label-xs font-bold uppercase shadow-md transition-all flex items-center"
              >
                {isFulfillPending ? (
                  <Loader2 className="w-4 h-4 animate-spin me-2" />
                ) : (
                  <PackageCheck className="w-4 h-4 me-2" />
                )}
                {(tc.has('actions.fulfill') ? tc('actions.fulfill') : null) || (locale === 'ar' ? 'تلبية / تنفيذ' : 'Fulfill')}
              </Button>
            </PermissionGate>
          </ActionGuard>
        )}

        {/* 11. VOID ACTION */}
        {onVoid && (
          <ActionGuard documentType={documentType} status={status} action="VOID" role={role}>
            <Button
              type="button"
              variant="destructive"
              onClick={onVoid}
              disabled={isVoidPending}
              className="h-10 px-5 rounded-xl text-label-xs font-bold uppercase transition-all flex items-center"
            >
              {isVoidPending ? (
                <Loader2 className="w-4 h-4 animate-spin me-2" />
              ) : (
                <Ban className="w-4 h-4 me-2" />
              )}
              {(tc.has('actions.void') ? tc('actions.void') : null) || (locale === 'ar' ? 'إلغاء نهائي (إبطال)' : 'Void Document')}
            </Button>
          </ActionGuard>
        )}

        {/* 12. CANCEL ACTION */}
        {onCancel && (
          <ActionGuard documentType={documentType} status={status} action="CANCEL" role={role}>
            <PermissionGate action="cancel" resource={targetResource}>
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isCancelPending}
                className="h-10 px-4 rounded-xl border-border hover:bg-destructive/10 hover:text-destructive text-label-xs font-bold uppercase transition-all flex items-center"
              >
                {isCancelPending ? (
                  <Loader2 className="w-4 h-4 animate-spin me-2" />
                ) : (
                  <Ban className="w-4 h-4 me-2" />
                )}
                {(tc.has('actions.cancel') ? tc('actions.cancel') : null) || (locale === 'ar' ? 'إلغاء' : 'Cancel')}
              </Button>
            </PermissionGate>
          </ActionGuard>
        )}
      </div>
    </div>
  );
}
