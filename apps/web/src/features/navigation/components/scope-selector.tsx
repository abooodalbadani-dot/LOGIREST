'use client';

import { useAuth } from '@/providers/AuthProvider';
import { useLocale } from '@/hooks/useLocale';
import { Select } from '@base-ui/react/select';
import { cn } from '@/lib/utils';
import { Warehouse as WarehouseIcon, Globe, Check, ChevronDown } from 'lucide-react';

const SCOPELESS_ROLES = ['ADMIN', 'GM', 'INV_MGR', 'AUDITOR', 'VIEWER'];

interface ScopeWarehouse {
  id: string;
  name: string;
  warehouseId: string;
}

export function ScopeSelector() {
  const { user, activeScope, setActiveScope } = useAuth();
  const { isRtl } = useLocale();

  if (!user) return null;

  const isGlobal = SCOPELESS_ROLES.includes(user.role);

  const availableWarehouses: ScopeWarehouse[] = user.scopes
    .filter((s): s is typeof s & { warehouseId: string } => !!s.warehouseId)
    .map((s) => {
      const wh = s.warehouse;
      return {
        id: s.warehouseId,
        warehouseId: s.warehouseId,
        name: wh?.name || s.warehouseId,
      };
    });

  const currentWarehouse = availableWarehouses.find(
    (w) => w.warehouseId === activeScope.warehouseId,
  );

  const displayLabel = isGlobal
    ? 'All Warehouses'
    : currentWarehouse?.name || (activeScope.warehouseId ? 'Unknown' : 'Select Warehouse');

  const handleValueChange = (value: string | null) => {
    if (!value) return;
    if (value === '__all__') {
      setActiveScope({ ...activeScope, warehouseId: null });
    } else {
      setActiveScope({ ...activeScope, warehouseId: value });
    }
  };

  return (
    <Select.Root
      value={activeScope.warehouseId || '__all__'}
      onValueChange={handleValueChange}
    >
      <Select.Trigger
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-container-low hover:bg-surface-container transition-all group relative overflow-hidden text-left',
        )}
      >
        <div className="absolute inset-0 bg-operational-cyan/5 opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="p-1.5 bg-operational-cyan/10 rounded-sm text-operational-cyan transition-all shrink-0">
          <WarehouseIcon className="w-3.5 h-3.5 group-hover:rotate-12 transition-transform" />
        </div>
        <div className="flex flex-col items-start leading-tight relative z-10 min-w-0">
          <span className="text-label-xs text-muted-foreground/60 uppercase font-semibold">
            Warehouse
          </span>
          <span className="text-label-sm font-bold text-foreground max-w-[120px] truncate block">
            {displayLabel}
          </span>
        </div>
        <ChevronDown className="w-3 h-3 text-muted-foreground/60 group-hover:text-operational-cyan transition-colors shrink-0" />
      </Select.Trigger>

      <Select.Portal>
        <Select.Positioner side="bottom" align="start" sideOffset={4}>
          <Select.Popup
            className={cn(
              'relative isolate z-50 max-h-64 min-w-[180px] overflow-y-auto rounded-lg bg-surface-container-lowest text-foreground ambient-shadow border border-outline-low',
              'data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95',
              'data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95',
            )}
          >
            <Select.List className="py-1">
              {isGlobal && (
                <Select.Item
                  value="__all__"
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 text-label-sm cursor-pointer outline-none',
                    'data-highlighted:bg-surface-container-high data-highlighted:text-foreground',
                    'data-selected:bg-operational-cyan/10 data-selected:text-operational-cyan',
                  )}
                >
                  <Globe className="w-4 h-4 shrink-0" />
                  <span className="flex-1 truncate">All Warehouses</span>
                  <Select.ItemIndicator>
                    <Check className="w-3.5 h-3.5" />
                  </Select.ItemIndicator>
                </Select.Item>
              )}

              {!isGlobal && availableWarehouses.length === 0 && (
                <div className="px-3 py-4 text-label-sm text-muted-foreground text-center">
                  No warehouses assigned
                </div>
              )}

              {!isGlobal &&
                availableWarehouses.map((wh) => (
                  <Select.Item
                    key={wh.id}
                    value={wh.warehouseId}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 text-label-sm cursor-pointer outline-none',
                      'data-highlighted:bg-surface-container-high data-highlighted:text-foreground',
                      'data-selected:bg-operational-cyan/10 data-selected:text-operational-cyan',
                    )}
                  >
                    <WarehouseIcon className="w-4 h-4 shrink-0 text-muted-foreground/60" />
                    <span className="flex-1 truncate">{wh.name}</span>
                    <Select.ItemIndicator>
                      <Check className="w-3.5 h-3.5" />
                    </Select.ItemIndicator>
                  </Select.Item>
                ))}
            </Select.List>
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}
