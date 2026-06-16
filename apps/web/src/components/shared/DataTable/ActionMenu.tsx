"use client"

import React from "react"
import { MoreVertical, Eye, Edit, Trash2 } from "lucide-react"
import {
 DropdownMenu,
 DropdownMenuContent,
 DropdownMenuItem,
 DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useRouter } from "@/i18n/navigation"
import { PermissionGate } from "@/components/shared/PermissionGate"
import { type ResourceType } from "@/types/rbac"

interface ActionMenuProps {
 entityId: string | number
 domId?: string
 resource?: ResourceType
 viewUrl?: string
 editUrl?: string
 onDelete?: () => void
 viewLabel?: string
 editLabel?: string
 deleteLabel?: string
 className?: string
}

/**
 * A premium reusable action menu for DataTables.
 * Provides standard View, Edit, and Delete actions in a 3-dots dropdown.
 */
export function ActionMenu({
 entityId,
 domId,
 resource,
 viewUrl,
 editUrl,
 onDelete,
 viewLabel = "View",
 editLabel = "Edit",
 deleteLabel = "Delete",
 className,
}: ActionMenuProps) {
 const router = useRouter()
 const resolvedDomId = domId ?? `action-menu-${entityId}`

 const viewItem = viewUrl && (
  <DropdownMenuItem 
   className="flex items-center gap-2.5 px-3 py-2 cursor-pointer transition-colors"
   onClick={(e) => {
    e.stopPropagation()
    router.push(viewUrl)
   }}
  >
   <Eye className="h-4 w-4 text-muted-foreground/70" />
   <span className="text-label-sm font-medium">{viewLabel}</span>
  </DropdownMenuItem>
 )

 const editItem = editUrl && (
  <DropdownMenuItem 
   className="flex items-center gap-2.5 px-3 py-2 cursor-pointer transition-colors"
   onClick={(e) => {
    e.stopPropagation()
    router.push(editUrl)
   }}
  >
   <Edit className="h-4 w-4 text-muted-foreground/70" />
   <span className="text-label-sm font-medium">{editLabel}</span>
  </DropdownMenuItem>
 )

 const deleteItem = onDelete && (
  <DropdownMenuItem
   variant="destructive"
   onClick={(e) => {
    e.stopPropagation()
    onDelete()
   }}
   className="flex items-center gap-2.5 px-3 py-2 cursor-pointer transition-colors"
  >
   <Trash2 className="h-4 w-4" />
   <span className="text-label-sm font-medium">{deleteLabel}</span>
  </DropdownMenuItem>
 )

 return (
  <DropdownMenu>
   <div onClick={(e) => e.stopPropagation()}>
    <DropdownMenuTrigger asChild>
     <div className="flex items-center justify-end gap-2">
      <Button 
       id={resolvedDomId}
       variant="ghost" 
       className={cn(
        "p-2 text-gray-400 hover:text-brand-gold dark:hover:text-brand-gold transition-colors rounded-md h-auto w-auto",
        className
       )}
      >
       <MoreVertical className="h-4 w-4" />
       <span className="sr-only">Open menu</span>
      </Button>
     </div>
    </DropdownMenuTrigger>
   </div>
   <DropdownMenuContent align="end" className="w-40 rounded-xl border-surface-variant/10 ambient-shadow p-1.5">
    {resource ? (
     <>
      <PermissionGate action="view" resource={resource}>{viewItem}</PermissionGate>
      <PermissionGate action="edit" resource={resource}>{editItem}</PermissionGate>
      <PermissionGate action="delete" resource={resource}>{deleteItem}</PermissionGate>
     </>
    ) : (
     <>
      {viewItem}
      {editItem}
      {deleteItem}
     </>
    )}
   </DropdownMenuContent>
  </DropdownMenu>
 )
}
