'use client';

import { Input } from '@/components/ui/input';
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
  const [scrollElement, setScrollElement] = useState<HTMLDivElement | null>(null);

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
    getScrollElement: () => scrollElement,
    estimateSize: () => 64, // height of item select row
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

  const defaultHeight = size === 'sm' ? 'h-9' : 'h-10';
  const defaultPadding = 'px-3 py-2';
  const defaultText = 'text-body-sm';
  const defaultFont = 'font-medium';
  const defaultRounded = size === 'sm' ? 'rounded-md' : 'rounded-lg';

  const isBorderNone = styleTokens.includes('border-none') || styleTokens.includes('border-transparent');
  const finalTriggerClasses = cn(
    "flex items-center justify-between gap-2 w-full transition-all outline-none disabled:opacity-50 disabled:cursor-not-allowed shadow-sm select-none",
    !hasHeight && defaultHeight,
    !hasBg && "bg-background",
    !hasBorder && "border border-[rgba(196,162,118,0.4)] hover:border-[rgba(196,162,118,0.7)]",
    !hasRounded && defaultRounded,
    !hasPadding && defaultPadding,
    !hasText && defaultText,
    !hasFont && defaultFont,
    !isBorderNone && "transition-colors duration-200 focus:ring-1 focus:ring-[rgba(196,162,118,0.6)] focus:border-[rgba(196,162,118,0.8)]",
    (!isBorderNone && isOpen) && "ring-1 ring-[rgba(196,162,118,0.6)] border-[rgba(196,162,118,0.8)] bg-background",
    error && "ring-1 ring-red-500/50 border-red-500",
    styleClasses,
    triggerClassName
  );

  return (
    <div
      ref={containerRef}
      className={cn("relative w-full min-w-0", layoutClasses)}
      onKeyDown={handleKeyDown}
    >
      <PopoverPrimitive.Root open={isOpen} onOpenChange={setIsOpen}>
        <PopoverPrimitive.Trigger
          className="w-full min-w-0"
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
                <div className="flex items-center gap-2 text-muted-foreground/50 truncate min-w-0">
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                  <span className="truncate">{isRTL ? 'جاري التحميل...' : 'Loading...'}</span>
                </div>
              ) : selectedItem ? (
                <div className="flex items-center gap-2 truncate min-w-0 flex-1 text-start">
                  <span className="text-body-sm font-medium truncate text-foreground text-start">
                    {actualGetPrimaryLabel(selectedItem)}
                  </span>
                  {actualGetSecondaryLabel(selectedItem) && (
                    <span className="text-label-xs text-muted-foreground bg-muted-bg px-1.5 py-0.5 rounded-sm font-mono uppercase max-w-[60%] truncate shrink-0">
                      {actualGetSecondaryLabel(selectedItem)}
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-muted-foreground font-medium truncate w-full text-start flex-1 min-w-0">
                  {placeholder}
                </span>
              )}
              <ChevronDown className={cn("w-4 h-4 text-muted-foreground/50 transition-transform duration-200 shrink-0", isOpen && "transform rotate-180")} />
            </button>
          }
        />

        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Positioner align="center" side="bottom" sideOffset={8} className="z-[9999]">
            <PopoverPrimitive.Popup
              style={{ width: 'var(--anchor-width, var(--radix-popover-trigger-width, auto))', minWidth: 'max(280px, min(92vw, 420px))' }}
              className={cn(
                "z-[9999] w-[var(--radix-popover-trigger-width)] bg-card text-card-foreground rounded-2xl border border-border/80 shadow-2xl p-3 flex flex-col gap-3 backdrop-blur-xl overflow-hidden max-h-[420px] sm:max-h-[480px] outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
                isRTL ? "origin-top-right" : "origin-top-left"
              )}
            >
              {/* Search Header */}
              <div className="relative flex items-center">
                <Search className={cn("absolute w-4 h-4 text-muted-foreground/50", isRTL ? "right-4" : "left-4")} />
                <Input
                  ref={inputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={isRTL ? "البحث بالاسم، الرمز..." : "Search by name, code..."}
                  className={cn(
                    "w-full bg-muted/40 border border-border shadow-sm rounded-xl h-11 text-body-md font-medium outline-none focus:border-brand-gold transition-all",
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
                ref={setScrollElement}
                role="listbox"
                className="overflow-auto flex-1 rounded-xl max-h-[300px] sm:max-h-[360px] pr-1 scrollbar-thin"
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
                            paddingBottom: '4px',
                          }}
                          className="px-0.5"
                        >
                          <div
                            className={cn(
                              "w-full h-full flex items-center justify-between gap-2 px-3.5 py-2 rounded-xl cursor-pointer transition-all duration-150 select-none text-start border group/opt",
                              isHighlighted
                                ? "bg-gradient-to-r from-operational-cyan/15 via-operational-cyan/5 to-transparent border-operational-cyan/40 text-operational-cyan shadow-sm"
                                : "bg-card/60 hover:bg-muted/30 border-border/20 text-foreground",
                              isSelected && "bg-operational-cyan/20 border-operational-cyan text-operational-cyan font-bold shadow-md"
                            )}
                          >
                            <div className="min-w-0 flex-1 flex items-center gap-2 text-start truncate">
                              <span className="text-body-sm font-semibold truncate max-w-full text-foreground group-hover/opt:text-operational-cyan transition-colors">
                                {primaryLabel}
                              </span>
                              {secondaryLabel && (
                                <span className="text-label-xs font-mono text-muted-foreground bg-muted-bg px-1.5 py-0.5 rounded-sm uppercase shrink-0 truncate max-w-[60%]">
                                  {secondaryLabel}
                                </span>
                              )}
                            </div>
                            {isSelected && <Check className="w-4 h-4 shrink-0 text-operational-cyan" />}
                          </div>
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
