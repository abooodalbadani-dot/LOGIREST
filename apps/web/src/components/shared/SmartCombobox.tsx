'use client';

import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useLocale } from 'next-intl';
import { Search, ChevronDown, Check, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDebounce } from '@/hooks/useDebounce';

import { Popover as PopoverPrimitive } from '@base-ui/react/popover';

export interface ComboboxItem {
  id: string | number;
  code?: string;
  barcode?: string;
  name?: string;
  nameEn?: string;
  nameAr?: string;
  name_en?: string;
  name_ar?: string;
}

export interface SmartComboboxProps<T extends ComboboxItem> {
  items: T[];
  value?: string | number;
  onSelect: (item: T) => void;
  getId?: (item: T) => string | number;
  getPrimaryLabel?: (item: T) => string;
  getSecondaryLabel?: (item: T) => string | undefined;
  searchFilter?: (item: T, query: string) => boolean;
  onSearchChange?: (query: string) => void;
  isLoading?: boolean;
  hasNextPage?: boolean;
  fetchNextPage?: () => void;
  isFetchingNextPage?: boolean;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  className?: string;
  triggerClassName?: string;
  onAddCustomItem?: (query: string) => void;
  size?: 'sm' | 'md' | 'lg';
}

function parseClassName(className?: string) {
  if (!className) return { layoutClasses: '', styleClasses: '' };
  
  const classes = className.split(/\s+/).filter(Boolean);
  const layoutPatterns = [
    /^w-/, /^flex-/, /^grid-/, /^col-/, /^row-/, /^absolute$/, /^relative$/, /^static$/, /^fixed$/,
    /^m-/, /^mx-/, /^my-/, /^mt-/, /^mr-/, /^mb-/, /^ml-/, /^z-/
  ];
  
  const layoutClasses: string[] = [];
  const styleClasses: string[] = [];
  
  classes.forEach(cls => {
    if (layoutPatterns.some(pattern => pattern.test(cls))) {
      layoutClasses.push(cls);
    } else {
      styleClasses.push(cls);
    }
  });
  
  return {
    layoutClasses: layoutClasses.join(' '),
    styleClasses: styleClasses.join(' ')
  };
}

export function SmartCombobox<T extends ComboboxItem>({
  items,
  value,
  onSelect,
  getId = (item) => item.id,
  getPrimaryLabel,
  getSecondaryLabel,
  searchFilter,
  onSearchChange,
  isLoading = false,
  hasNextPage = false,
  fetchNextPage,
  isFetchingNextPage = false,
  placeholder = 'Search item...',
  disabled = false,
  error,
  className,
  triggerClassName,
  onAddCustomItem,
  size = 'lg',
}: SmartComboboxProps<T>) {
  const locale = useLocale() as 'ar' | 'en';
  const isRTL = locale === 'ar';
  
  const defaultGetPrimaryLabel = useCallback((item: T) => {
    const legacyName = isRTL 
      ? item.nameAr || item.name_ar || item.nameEn || item.name_en
      : item.nameEn || item.name_en || item.nameAr || item.name_ar;
    return item.name || legacyName || item.code || '';
  }, [isRTL]);
  
  const defaultGetSecondaryLabel = useCallback((item: T) => {
    const code = item.code;
    const barcode = item.barcode;
    if (code && barcode) return `${code} | ${barcode}`;
    return code || barcode || undefined;
  }, []);
  
  const defaultSearchFilter = useCallback((item: T, query: string) => {
    const q = query.toLowerCase().trim();
    const code = item.code?.toLowerCase() || '';
    const barcode = item.barcode?.toLowerCase() || '';
    const name = item.name?.toLowerCase() || '';
    const nameEn = item.nameEn?.toLowerCase() || item.name_en?.toLowerCase() || '';
    const nameAr = item.nameAr?.toLowerCase() || item.name_ar?.toLowerCase() || '';
    return code.includes(q) || barcode.includes(q) || name.includes(q) || nameEn.includes(q) || nameAr.includes(q);
  }, []);

  const actualGetPrimaryLabel = getPrimaryLabel || defaultGetPrimaryLabel;
  const actualGetSecondaryLabel = getSecondaryLabel || defaultGetSecondaryLabel;
  const actualSearchFilter = searchFilter || defaultSearchFilter;

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Notify parent of search changes if remote searching is enabled
  useEffect(() => {
    if (onSearchChange) {
      onSearchChange(debouncedSearchQuery);
    }
  }, [debouncedSearchQuery, onSearchChange]);

  // Selected item lookup
  const selectedItem = useMemo(() => {
    return items.find((item) => getId(item) === value);
  }, [items, value, getId]);

  // Filter items based on search query (if doing local filtering)
  const filteredItems = useMemo(() => {
    // If onSearchChange is provided, we assume the parent handles the filtering
    if (onSearchChange || !searchQuery.trim()) return items;
    return items.filter((item) => actualSearchFilter(item, searchQuery));
  }, [items, searchQuery, actualSearchFilter, onSearchChange]);

  const hasExactMatch = useMemo(() => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase().trim();
    return items.some((item) => {
      const primary = actualGetPrimaryLabel(item).toLowerCase();
      const code = item.code?.toLowerCase() || '';
      const barcode = item.barcode?.toLowerCase() || '';
      return primary === query || code === query || barcode === query;
    });
  }, [items, searchQuery, actualGetPrimaryLabel]);

  // Virtualizer hook
  const rowVirtualizer = useVirtualizer({
    count: hasNextPage ? filteredItems.length + 1 : filteredItems.length,
    getScrollElement: () => dropdownRef.current,
    estimateSize: () => 56, // height of item select row
    overscan: 5,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();

  // Load more items when scrolling to bottom
  useEffect(() => {
    const lastItem = virtualItems[virtualItems.length - 1];
    if (!lastItem) return;

    if (
      lastItem.index >= filteredItems.length - 1 &&
      hasNextPage &&
      !isFetchingNextPage &&
      fetchNextPage
    ) {
      fetchNextPage();
    }
  }, [
    virtualItems,
    filteredItems.length,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  ]);

  // Reset highlighted index when filtered items change or when dropdown opens
  useEffect(() => {
    setHighlightedIndex(0);
  }, [filteredItems.length, isOpen]);

  // Auto focus input when dropdown opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSelect = useCallback((item: T) => {
    onSelect(item);
    setIsOpen(false);
    setSearchQuery('');
  }, [onSelect]);

  // Handle Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'Enter' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) => {
          const next = prev + 1 >= filteredItems.length ? 0 : prev + 1;
          rowVirtualizer.scrollToIndex(next, { align: 'auto' });
          return next;
        });
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => {
          const next = prev - 1 < 0 ? filteredItems.length - 1 : prev - 1;
          rowVirtualizer.scrollToIndex(next, { align: 'auto' });
          return next;
        });
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredItems[highlightedIndex]) {
          handleSelect(filteredItems[highlightedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        triggerRef.current?.focus();
        break;
      case 'Tab':
        setIsOpen(false);
        break;
    }
  }, [isOpen, highlightedIndex, filteredItems, disabled, rowVirtualizer, handleSelect]);

  const { layoutClasses, styleClasses } = parseClassName(className);

  const combinedStyleAndTrigger = `${styleClasses} ${triggerClassName || ''}`.trim();
  const styleTokens = combinedStyleAndTrigger.split(/\s+/).filter(Boolean);

  const hasHeight = styleTokens.some(c => c.startsWith('h-') || c.startsWith('min-h-') || c.startsWith('max-h-'));
  const hasBg = styleTokens.some(c => c.startsWith('bg-'));
  const hasBorder = styleTokens.some(c => c.startsWith('border'));
  const hasRounded = styleTokens.some(c => c.startsWith('rounded-'));
  const hasPadding = styleTokens.some(c => c.startsWith('p-') || c.startsWith('px-') || c.startsWith('py-') || c.startsWith('ps-') || c.startsWith('pe-'));
  const hasText = styleTokens.some(c => c.startsWith('text-'));
  const hasFont = styleTokens.some(c => c.startsWith('font-'));

  const defaultHeight = size === 'sm' ? 'h-10' : size === 'md' ? 'h-12' : 'h-[52px]';
  const defaultPadding = size === 'sm' ? 'px-3' : size === 'md' ? 'px-4' : 'px-6';
  const defaultText = size === 'sm' ? 'text-label-xs' : size === 'md' ? 'text-label-sm' : 'text-body-md';
  const defaultFont = size === 'sm' ? 'font-semibold' : 'font-bold';
  const defaultRounded = size === 'sm' ? 'rounded-lg' : 'rounded-xl';

  const finalTriggerClasses = cn(
    "flex-1 w-full min-w-[200px] justify-between text-start flex items-center transition-all outline-none disabled:opacity-50 disabled:cursor-not-allowed",
    !hasHeight && defaultHeight,
    !hasBg && "bg-surface-container-low/40 hover:bg-surface-container-low focus:bg-surface-container-low",
    !hasBorder && "border border-white/5",
    !hasRounded && defaultRounded,
    !hasPadding && defaultPadding,
    !hasText && defaultText,
    !hasFont && defaultFont,
    "focus:ring-2 focus:ring-operational-cyan/20",
    isOpen && "ring-2 ring-operational-cyan/20 bg-surface-container-low",
    error && "ring-2 ring-status-error/20 border-status-error/30",
    styleClasses,
    triggerClassName
  );

  return (
    <div 
      ref={containerRef} 
      className={cn("relative w-full flex-1 min-w-[200px]", layoutClasses)}
      onKeyDown={handleKeyDown}
    >
      <PopoverPrimitive.Root open={isOpen} onOpenChange={setIsOpen}>
        <PopoverPrimitive.Trigger
          className="flex-1 w-full min-w-[200px]"
          render={
            <button
              ref={triggerRef}
              type="button"
              disabled={disabled || isLoading}
              aria-haspopup="listbox"
              aria-expanded={isOpen}
              className={finalTriggerClasses}
            >
              {isLoading ? (
                  <div className="flex items-center gap-2 text-muted-foreground/50">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{isRTL ? 'جاري التحميل...' : 'Loading...'}</span>
                  </div>
              ) : selectedItem ? (
                <div className="flex flex-col items-start gap-0.5 overflow-hidden flex-1 min-w-0">
                  <span className="text-foreground truncate w-full text-start">
                    {actualGetPrimaryLabel(selectedItem)}
                  </span>
                  {actualGetSecondaryLabel(selectedItem) && (
                    <span className="text-label-xxs font-mono text-muted-foreground/40 font-semibold uppercase tracking-wider truncate w-full text-start">
                      {actualGetSecondaryLabel(selectedItem)}
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-muted-foreground/30 font-medium truncate w-full text-start">
                  {placeholder}
                </span>
              )}
              <ChevronDown className={cn("w-4 h-4 text-muted-foreground/40 transition-transform duration-200 shrink-0", isOpen && "transform rotate-180")} />
            </button>
          }
        />

        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Positioner align="center" side="bottom" sideOffset={8} className="z-[9999]">
            <PopoverPrimitive.Popup
              style={{ width: 'var(--anchor-width, var(--radix-popover-trigger-width, auto))', minWidth: '280px' }}
              className={cn(
                "z-[9999] w-[var(--radix-popover-trigger-width)] bg-surface-container-highest rounded-2xl border border-surface-container-high/60 shadow-2xl p-3 flex flex-col gap-3 backdrop-blur-md overflow-hidden max-h-[350px] outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
                isRTL ? "origin-top-right" : "origin-top-left"
              )}
            >
              {/* Search Header */}
              <div className="relative flex items-center">
                <Search className={cn("absolute w-4 h-4 text-muted-foreground/30", isRTL ? "right-4" : "left-4")} />
                <input
                  ref={inputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={isRTL ? "البحث بالاسم، الرمز..." : "Search by name, code..."}
                  className={cn(
                    "w-full bg-surface-container-low/40 rounded-xl h-11 text-body-md font-medium border-none outline-none focus:bg-surface-container-low/80 transition-all",
                    isRTL ? "pr-11 pl-10 text-right" : "pl-11 pr-10 text-left"
                  )}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className={cn("absolute p-1 rounded-full text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors", isRTL ? "left-3" : "right-3")}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* List Options */}
              <div
                ref={dropdownRef}
                role="listbox"
                className="overflow-auto flex-1 rounded-xl max-h-[240px] pr-1.5 scrollbar-thin"
              >
                {filteredItems.length === 0 && !isLoading ? (
                  <div className="py-8 text-center text-label-xs text-muted-foreground/30 italic uppercase font-bold tracking-wider">
                    {isRTL ? "لا توجد نتائج مطابقة" : "No items found"}
                  </div>
                ) : (
                  <div
                    style={{
                      height: `${totalSize}px`,
                      width: '100%',
                      position: 'relative',
                    }}
                  >
                    {virtualItems.map((virtualRow) => {
                      const isLoaderRow = virtualRow.index > filteredItems.length - 1;

                      if (isLoaderRow) {
                        return (
                            <div
                            key="loader-row"
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: `${virtualRow.size}px`,
                                transform: `translateY(${virtualRow.start}px)`,
                            }}
                            className="flex items-center justify-center"
                            >
                            <Loader2 className="w-5 h-5 animate-spin text-operational-cyan/50" />
                            </div>
                        );
                      }

                      const item = filteredItems[virtualRow.index];
                      const itemId = getId(item);
                      const isSelected = value === itemId;
                      const isHighlighted = highlightedIndex === virtualRow.index;
                      const primaryLabel = actualGetPrimaryLabel(item);
                      const secondaryLabel = actualGetSecondaryLabel(item);

                      return (
                        <div
                          key={itemId}
                          role="option"
                          aria-selected={isSelected}
                          onClick={() => handleSelect(item)}
                          onMouseEnter={() => setHighlightedIndex(virtualRow.index)}
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: `${virtualRow.size}px`,
                            transform: `translateY(${virtualRow.start}px)`,
                          }}
                          className={cn(
                            "flex items-center justify-between px-4 py-2 rounded-xl cursor-pointer transition-all duration-75 select-none",
                            isHighlighted ? "bg-operational-cyan/10 text-operational-cyan" : "text-foreground hover:bg-surface-container-low/30",
                            isSelected && "bg-operational-cyan/20 text-operational-cyan font-bold"
                          )}
                        >
                          <div className="flex flex-col items-start gap-0.5 overflow-hidden flex-1 min-w-0">
                            <span className="text-body-md font-bold truncate w-full text-start">
                              {primaryLabel}
                            </span>
                            {secondaryLabel && (
                              <span className="text-label-xxs font-mono text-muted-foreground/40 font-semibold truncate w-full text-start">
                                {secondaryLabel}
                              </span>
                            )}
                          </div>
                          {isSelected && <Check className="w-4 h-4 shrink-0 text-operational-cyan" />}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {onAddCustomItem && searchQuery.trim() && !hasExactMatch && (
                <button
                  type="button"
                  onClick={() => {
                    onAddCustomItem(searchQuery);
                    setIsOpen(false);
                    setSearchQuery('');
                  }}
                  className="w-full flex items-center gap-2 px-4 py-3 rounded-xl border border-dashed border-operational-cyan/30 text-operational-cyan hover:bg-operational-cyan/5 transition-all text-body-md font-bold mt-1 shrink-0 justify-center"
                >
                  <span>+</span>
                  <span>
                    {isRTL 
                      ? `إضافة "${searchQuery}" كعنصر مخصص` 
                      : `Add "${searchQuery}" as a custom item`}
                  </span>
                </button>
              )}
            </PopoverPrimitive.Popup>
          </PopoverPrimitive.Positioner>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>

      {error && (
        <p className="text-label-xs font-bold text-status-error uppercase ms-1 mt-1">
          {error}
        </p>
      )}
    </div>
  );
}
