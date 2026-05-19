'use client';

import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useLocale } from 'next-intl';
import { Search, ChevronDown, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Item } from '@/types/master-data';

interface SmartComboboxProps {
  items: Item[];
  value?: string;
  onSelect: (item: Item) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  className?: string;
  triggerClassName?: string;
}

export function SmartCombobox({
  items,
  value,
  onSelect,
  placeholder = 'Search item...',
  disabled = false,
  error,
  className,
  triggerClassName,
}: SmartComboboxProps) {
  const locale = useLocale() as 'ar' | 'en';
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Selected item lookup
  const selectedItem = useMemo(() => {
    return items.find((item) => item.id === value);
  }, [items, value]);

  // Filter items based on search query
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const query = searchQuery.toLowerCase().trim();
    return items.filter((item) => {
      const codeMatch = item.code?.toLowerCase().includes(query);
      const barcodeMatch = item.barcode?.toLowerCase().includes(query);
      const nameEnMatch = item.name_en?.toLowerCase().includes(query);
      const nameArMatch = item.name_ar?.toLowerCase().includes(query);
      return codeMatch || barcodeMatch || nameEnMatch || nameArMatch;
    });
  }, [items, searchQuery]);

  // Virtualizer hook
  const rowVirtualizer = useVirtualizer({
    count: filteredItems.length,
    getScrollElement: () => dropdownRef.current,
    estimateSize: () => 56, // height of item select row
    overscan: 5,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();

  // Reset highlighted index when filtered items change or when dropdown opens
  useEffect(() => {
    setHighlightedIndex(0);
  }, [filteredItems, isOpen]);

  // Auto focus input when dropdown opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSelect = useCallback((item: Item) => {
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

  const isRTL = locale === 'ar';

  return (
    <div 
      ref={containerRef} 
      className={cn("relative w-full", className)}
      onKeyDown={handleKeyDown}
    >
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={cn(
          "w-full bg-surface-container-low/40 border border-white/5 rounded-xl h-[52px] px-6 text-body-md font-bold text-start flex items-center justify-between transition-all outline-none hover:bg-surface-container-low focus:ring-2 focus:ring-operational-cyan/20 focus:bg-surface-container-low disabled:opacity-50 disabled:cursor-not-allowed",
          isOpen && "ring-2 ring-operational-cyan/20 bg-surface-container-low",
          error && "ring-2 ring-status-error/20 border-status-error/30",
          triggerClassName
        )}
      >
        {selectedItem ? (
          <div className="flex flex-col items-start gap-0.5 overflow-hidden">
            <span className="text-foreground truncate w-full text-start">
              {isRTL ? selectedItem.name_ar : selectedItem.name_en}
            </span>
            <span className="text-label-xxs font-mono text-muted-foreground/40 font-semibold uppercase tracking-wider">
              {selectedItem.code}
            </span>
          </div>
        ) : (
          <span className="text-muted-foreground/30 font-medium">
            {placeholder}
          </span>
        )}
        <ChevronDown className={cn("w-4 h-4 text-muted-foreground/40 transition-transform duration-200", isOpen && "transform rotate-180")} />
      </button>

      {isOpen && (
        <div 
          className={cn(
            "absolute z-50 mt-2 w-full bg-surface-container-highest rounded-2xl border border-surface-container-high/60 shadow-2xl p-3 flex flex-col gap-3 backdrop-blur-md overflow-hidden max-h-[350px] animate-in fade-in duration-200 slide-in-from-top-2",
            isRTL ? "right-0" : "left-0"
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
              placeholder={isRTL ? "البحث بالاسم، الرمز، أو الباركود..." : "Search by name, SKU, or barcode..."}
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
            {filteredItems.length === 0 ? (
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
                  const item = filteredItems[virtualRow.index];
                  const isSelected = value === item.id;
                  const isHighlighted = highlightedIndex === virtualRow.index;

                  return (
                    <div
                      key={item.id}
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
                      <div className="flex flex-col items-start gap-0.5 overflow-hidden">
                        <span className="text-body-md font-bold truncate max-w-[280px] text-start">
                          {isRTL ? item.name_ar : item.name_en}
                        </span>
                        <span className="text-label-xxs font-mono text-muted-foreground/40 font-semibold">
                          {item.code} {item.barcode && `| ${item.barcode}`}
                        </span>
                      </div>
                      {isSelected && <Check className="w-4 h-4 shrink-0 text-operational-cyan" />}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {error && (
        <p className="text-label-xs font-bold text-status-error uppercase ms-1 mt-1">
          {error}
        </p>
      )}
    </div>
  );
}
