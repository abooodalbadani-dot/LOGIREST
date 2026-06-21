'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { z } from 'zod';
import {
  Package,
  Hash,
  Ruler,
  ArrowRight,
  ImportIcon,
  Users,
  Database,
  Layers,
  Lock,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  Clock,
  Unlock
} from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { cn } from '@/lib/utils';

// Response Schema for /imports/status
const ImportStatusSchema = z.object({
  hasUom: z.boolean(),
  hasCategories: z.boolean(),
  hasSuppliers: z.boolean(),
  hasItems: z.boolean(),
});

type ImportStatus = z.infer<typeof ImportStatusSchema>;

interface ImportLandingClientProps {
  locale: string;
}

// Field descriptions helper
const getFieldDesc = (entity: string, fieldName: string, isAr: boolean) => {
  const descMap: Record<string, Record<string, { en: string; ar: string }>> = {
    uoms: {
      Name: { en: 'UOM name (e.g. Piece, Kilogram)', ar: 'اسم وحدة القياس (مثال: حبة، كيلوجرام)' },
      Code: { en: 'Unique abbreviation (e.g. PCS, KG)', ar: 'رمز اختصار فريد (مثال: PCS, KG)' }
    },
    categories: {
      Name: { en: 'Category name (e.g. Vegetables, Meat)', ar: 'اسم التصنيف (مثال: خضروات، لحوم)' },
      Code: { en: 'Unique classification code (e.g. CAT-01)', ar: 'رمز تصنيف فريد (مثال: CAT-01)' }
    },
    suppliers: {
      code: { en: 'Unique vendor identifier code', ar: 'مُعرف فريد للمورد' },
      name: { en: 'Official commercial name', ar: 'الاسم التجاري الرسمي' },
      contactName: { en: 'Primary contact person name', ar: 'اسم جهة الاتصال الرئيسية' },
      contactEmail: { en: 'Contact email address', ar: 'البريد الإلكتروني للاتصال' },
      contactPhone: { en: 'Contact telephone number', ar: 'رقم هاتف الاتصال' }
    },
    items: {
      Name: { en: 'Item name in catalogs', ar: 'اسم الصنف (مثال: لحم مجمد)' },
      Code: { en: 'Unique SKU code (e.g. SKU-1002)', ar: 'رمز الصنف الفريد SKU (مثال: SKU-1002)' },
      Category: { en: 'Must match an existing Category Code', ar: 'يجب أن يطابق رمز تصنيف مسجل' },
      Unit: { en: 'Must match an existing UOM Code', ar: 'يجب أن يطابق رمز وحدة قياس مسجل' },
      LotTracked: { en: 'True if lot-tracked (for FEFO)', ar: 'صحيح إذا كان الصنف يتطلب تتبع اللوط (لحساب FEFO)' },
      Status: { en: 'ACTIVE or INACTIVE status', ar: 'حالة الصنف: نشط ACTIVE أو غير نشط INACTIVE' }
    },
    barcodes: {
      ItemCode: { en: 'Must match an existing Item SKU Code', ar: 'يجب أن يطابق رمز صنف SKU مسجل' },
      Barcode: { en: 'Unique physical barcode value', ar: 'قيمة الباركود المادي الفريد' }
    },
    openingStock: {
      warehouseCode: { en: 'Must match a registered Warehouse Code', ar: 'يجب أن يطابق رمز مستودع مسجل' },
      itemSku: { en: 'Must match an existing Item SKU Code', ar: 'يجب أن يطابق رمز صنف SKU مسجل' },
      quantity: { en: 'Physical count to initialize', ar: 'الكمية الفعلية لتهيئة المخزون' },
      unitCost: { en: 'Weighted average unit cost', ar: 'متوسط تكلفة الوحدة' },
      lotNumber: { en: 'Required if item is lot-tracked', ar: 'مطلوب إذا كان الصنف يتطلب تتبع اللوط' },
      expiryDate: { en: 'Expiry date in YYYY-MM-DD format (for FEFO)', ar: 'تاريخ الانتهاء بتنسيق YYYY-MM-DD' }
    }
  };
  return descMap[entity]?.[fieldName]?.[isAr ? 'ar' : 'en'] || '';
};

// Spreadsheet headers config
const expectedHeaders = {
  uoms: [
    { name: 'Name', required: true },
    { name: 'Code', required: true }
  ],
  categories: [
    { name: 'Name', required: true },
    { name: 'Code', required: true }
  ],
  suppliers: [
    { name: 'code', required: true },
    { name: 'name', required: true },
    { name: 'contactName', required: false },
    { name: 'contactEmail', required: false },
    { name: 'contactPhone', required: false }
  ],
  items: [
    { name: 'Name', required: true },
    { name: 'Code', required: true },
    { name: 'Category', required: true },
    { name: 'Unit', required: true },
    { name: 'LotTracked', required: false },
    { name: 'Status', required: false }
  ],
  barcodes: [
    { name: 'ItemCode', required: true },
    { name: 'Barcode', required: true }
  ],
  openingStock: [
    { name: 'warehouseCode', required: true },
    { name: 'itemSku', required: true },
    { name: 'quantity', required: true },
    { name: 'unitCost', required: true },
    { name: 'lotNumber', required: false },
    { name: 'expiryDate', required: false }
  ]
};

type TimelineKey = 
  | 'step_1_title' | 'step_1_desc'
  | 'step_2_title' | 'step_2_desc'
  | 'step_3_title' | 'step_3_desc'
  | 'step_4_title' | 'step_4_desc'
  | 'step_5_title' | 'step_5_desc'
  | 'step_6_title' | 'step_6_desc';

interface TimelineStep {
  num: number;
  titleKey: TimelineKey;
  descKey: TimelineKey;
}

const timelineSteps: TimelineStep[] = [
  { num: 1, titleKey: 'step_1_title', descKey: 'step_1_desc' },
  { num: 2, titleKey: 'step_2_title', descKey: 'step_2_desc' },
  { num: 3, titleKey: 'step_3_title', descKey: 'step_3_desc' },
  { num: 4, titleKey: 'step_4_title', descKey: 'step_4_desc' },
  { num: 5, titleKey: 'step_5_title', descKey: 'step_5_desc' },
  { num: 6, titleKey: 'step_6_title', descKey: 'step_6_desc' },
];

export function ImportLandingClient({ locale }: ImportLandingClientProps) {
  const t = useTranslations('master_data.import');
  const tc = useTranslations('common');
  const router = useRouter();
  const isRtl = locale === 'ar';

  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  // Fetch status dynamically
  const { data: status, isLoading } = useQuery<ImportStatus>({
    queryKey: ['import-status'],
    queryFn: async () => {
      try {
        return await apiClient.get('/imports/status', ImportStatusSchema);
      } catch (err) {
        console.warn('Failed to fetch import status:', err);
        return {
          hasUom: false,
          hasCategories: false,
          hasSuppliers: false,
          hasItems: false,
        };
      }
    },
    staleTime: 5000, // Refresh status frequently during import lifecycle
  });

  // Strict Phases Configuration
  const cards = [
    {
      id: 'uoms',
      phase: 1,
      title: t('uoms'),
      description: t('uoms_desc'),
      icon: Ruler,
      href: '/master-data/import/uoms',
      color: 'emerald',
      isLocked: false,
      dependencies: [],
      isInitialized: !!status?.hasUom,
    },
    {
      id: 'categories',
      phase: 2,
      title: t('categories'),
      description: t('categories_desc'),
      icon: Layers,
      href: '/master-data/import/categories',
      color: 'indigo',
      isLocked: false,
      dependencies: [],
      isInitialized: !!status?.hasCategories,
    },
    {
      id: 'suppliers',
      phase: 3,
      title: t('suppliers'),
      description: t('suppliers_desc'),
      icon: Users,
      href: '/master-data/import/suppliers',
      color: 'amber',
      isLocked: false,
      dependencies: [],
      isInitialized: !!status?.hasSuppliers,
    },
    {
      id: 'items',
      phase: 4,
      title: t('items'),
      description: t('items_desc'),
      icon: Package,
      href: '/master-data/import/items',
      color: 'cyan',
      isLocked: isLoading ? true : (!status?.hasUom || !status?.hasCategories),
      dependencies: ['uoms', 'categories'],
      isInitialized: !!status?.hasItems,
    },
    {
      id: 'barcodes',
      phase: 5,
      title: t('barcodes'),
      description: t('barcodes_desc'),
      icon: Hash,
      href: '/master-data/import/barcodes',
      color: 'blue',
      isLocked: isLoading ? true : !status?.hasItems,
      dependencies: ['items'],
      isInitialized: false,
    },
    {
      id: 'openingStock',
      phase: 6,
      title: t('openingStock'),
      description: t('openingStock_desc'),
      icon: Database,
      href: '/master-data/import/opening-stock',
      color: 'orange',
      isLocked: isLoading ? true : !status?.hasItems,
      dependencies: ['items'],
      isInitialized: false,
    },
  ];

  const getDependencyNames = (deps: string[]) => {
    return deps
      .map((d) => {
        if (d === 'uoms') return t('uom_dependency');
        if (d === 'categories') return t('category_dependency');
        if (d === 'items') return t('item_dependency');
        return d;
      })
      .join(isRtl ? '، ' : ', ');
  };

  return (
    <div className="min-w-0 gap-6 flex-1 max-w-6xl fade-in p-8 duration-200 mx-auto gap-8 animate-in flex-col flex w-full">
      <Breadcrumb
        items={[
          { label: tc('navigation.master_data'), href: '/master-data' },
          { label: t('title') }
        ]}
      />

      <PageHeader
        title={t('title')}
        subtitle={t('select_type')}
        icon={<ImportIcon className="w-6 h-6 text-cyan-500" />}
      />

      {/* Grid of Phases */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
        {isLoading ? (
          // Beautiful Skeleton Loading State
          Array.from({ length: 6 }).map((_, idx) => (
            <div
              key={idx}
              className="flex flex-col items-start p-8 rounded-2xl bg-card border border-border shadow-sm/50 h-[280px] animate-pulse"
            >
              <div className="w-10 h-6 bg-muted rounded mb-4" />
              <div className="w-16 h-16 bg-muted rounded-2xl mb-6" />
              <div className="w-3/4 h-6 bg-muted rounded mb-2" />
              <div className="w-full h-4 bg-muted rounded mb-1" />
              <div className="w-2/3 h-4 bg-muted rounded" />
            </div>
          ))
        ) : (
          cards.map((card, idx) => {
            const Icon = card.icon;
            const isCardExpanded = expandedCard === card.id;
            const depNames = getDependencyNames(card.dependencies);

            return (
              <div
                key={card.id}
                style={{ animationDelay: `${idx * 100}ms` }}
                className={cn(
                  "group relative flex flex-col items-start text-start p-8 rounded-2xl bg-card border shadow-sm/50 transition-all duration-300 shadow-xl overflow-hidden animate-in slide-in-from-bottom-8 fill-mode-both min-w-0 border-border",
                  card.isLocked 
                    ? "opacity-60 saturate-50 cursor-not-allowed hover:border-border" 
                    : "hover:scale-[1.02] hover:bg-surface-container-high hover:border-cyan-500/20"
                )}
              >
                {/* Background Glow (unlocked only) */}
                {!card.isLocked && (
                  <div className={cn(
                    "absolute -top-24 -right-24 w-48 h-48 rounded-full blur-3xl transition-colors duration-300",
                    card.color === 'indigo' && "bg-indigo-500/5 group-hover:bg-indigo-500/10",
                    card.color === 'cyan' && "bg-cyan-500/5 group-hover:bg-cyan-500/10",
                    card.color === 'emerald' && "bg-emerald-500/5 group-hover:bg-emerald-500/10",
                    card.color === 'blue' && "bg-blue-500/5 group-hover:bg-blue-500/10",
                    card.color === 'amber' && "bg-amber-500/5 group-hover:bg-amber-500/10",
                    card.color === 'orange' && "bg-orange-500/5 group-hover:bg-orange-500/10"
                  )} />
                )}

                {/* Top Badge: Phase and Status Indicator */}
                <div className="flex justify-between items-center w-full mb-6 z-10">
                  <span className="text-label-xs font-bold uppercase tracking-wider text-muted-foreground/60">
                    {t('phase', { number: card.phase })}
                  </span>
                  
                  {card.isLocked ? (
                    <div className="flex items-center gap-1 text-rose-500 bg-rose-500/10 px-2.5 py-1 rounded-full text-label-xs font-bold">
                      <Lock className="w-3.5 h-3.5" />
                      <span>{t('locked')}</span>
                    </div>
                  ) : card.isInitialized ? (
                    <div className="flex items-center gap-1 text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-full text-label-xs font-bold">
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>{tc('active') || 'Initialized'}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-cyan-500 bg-cyan-500/10 px-2.5 py-1 rounded-full text-label-xs font-bold">
                      <Unlock className="w-3.5 h-3.5" />
                      <span>{t('unlocked')}</span>
                    </div>
                  )}
                </div>
                
                {/* Large Entity Icon */}
                <div className={cn(
                  "w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-all duration-300 group-hover:scale-105",
                  card.isLocked
                    ? "bg-muted text-muted-foreground/40"
                    : cn(
                        card.color === 'indigo' && "bg-indigo-500/10 text-indigo-500",
                        card.color === 'cyan' && "bg-cyan-500/10 text-cyan-500",
                        card.color === 'emerald' && "bg-emerald-500/10 text-emerald-500",
                        card.color === 'blue' && "bg-blue-500/10 text-blue-500",
                        card.color === 'amber' && "bg-amber-500/10 text-amber-500",
                        card.color === 'orange' && "bg-orange-500/10 text-orange-500"
                      )
                )}>
                  <Icon className="w-8 h-8" />
                </div>

                {/* Title & Description */}
                <div className="space-y-2 relative z-10 w-full">
                  <h3 className={cn(
                    "text-title-lg font-bold transition-colors duration-200",
                    card.isLocked ? "text-muted-foreground/60" : "text-foreground group-hover:text-cyan-500"
                  )}>
                    {card.title}
                  </h3>
                  <p className="text-body-md text-muted-foreground/80 font-medium leading-relaxed opacity-75 min-h-[48px]">
                    {card.description}
                  </p>
                </div>

                {/* Prerequisite Missing Warning Alert */}
                {card.isLocked && (
                  <div className="mt-4 p-3 rounded-xl bg-rose-500/5 border border-rose-500/10 flex items-start gap-2 w-full text-rose-500/90">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div className="text-label-xs font-semibold leading-relaxed">
                      <p className="font-bold">{t('prerequisites_required')}</p>
                      <p className="opacity-80">{t('prerequisite_warning', { dependencies: depNames })}</p>
                    </div>
                  </div>
                )}

                {/* Expandable Excel Columns Detail */}
                <div className="w-full mt-4 border-t border-border/40 pt-4 z-10">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedCard(isCardExpanded ? null : card.id);
                    }}
                    className="flex items-center justify-between w-full text-label-xs font-bold text-muted-foreground/75 hover:text-foreground transition-colors py-1"
                  >
                    <span className="flex items-center gap-1.5">
                      <HelpCircle className="w-3.5 h-3.5 text-cyan-500/70" />
                      {t('expected_columns')}
                    </span>
                    {isCardExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                  
                  {isCardExpanded && (
                    <div className="mt-3 space-y-2 max-h-[160px] overflow-y-auto pr-1 select-text scrollbar-thin">
                      <div className="grid grid-cols-1 gap-1.5">
                        {expectedHeaders[card.id as keyof typeof expectedHeaders]?.map((header) => (
                          <div 
                            key={header.name}
                            className="flex flex-col p-2 bg-muted/30 rounded-lg border border-border/20 text-label-xs"
                          >
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-foreground">{header.name}</span>
                              {header.required ? (
                                <span className="text-[10px] px-1.5 py-0.5 bg-rose-500/10 text-rose-500 rounded font-bold uppercase">
                                  {isRtl ? 'مطلوب' : 'Required'}
                                </span>
                              ) : (
                                <span className="text-[10px] px-1.5 py-0.5 bg-muted text-muted-foreground rounded font-bold uppercase">
                                  {isRtl ? 'اختياري' : 'Optional'}
                                </span>
                              )}
                            </div>
                            <span className="text-muted-foreground/80 mt-1 leading-normal font-medium">
                              {getFieldDesc(card.id, header.name, isRtl)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom Trigger Action */}
                <button
                  disabled={card.isLocked}
                  onClick={() => {
                    if (!card.isLocked) {
                      router.push(card.href);
                    }
                  }}
                  className={cn(
                    "mt-6 flex items-center justify-between w-full text-label-xs font-semibold px-4 py-2.5 rounded-xl transition-all duration-200",
                    card.isLocked
                      ? "bg-muted text-muted-foreground/30 border border-border/20 cursor-not-allowed"
                      : "bg-muted/50 text-cyan-500/80 hover:bg-cyan-500 hover:text-white border border-border/50 group-hover:border-cyan-500/30 hover:scale-[1.01]"
                  )}
                >
                  <span>{t('start_import')}</span>
                  <ArrowRight className={cn(
                    "w-4 h-4 transition-transform",
                    isRtl ? "rotate-180 group-hover:-translate-x-1" : "group-hover:translate-x-1"
                  )} />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Quick Start & Initialization Guide (دليل التهيئة والتشغيل السريع) */}
      <div className="mt-12 p-8 rounded-3xl bg-card border border-border shadow-sm/50 w-full animate-in fade-in duration-300">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-500 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-title-lg font-bold text-foreground">
              {t('quick_start_title')}
            </h2>
            <p className="text-body-md text-muted-foreground/80 font-medium">
              {t('quick_start_subtitle')}
            </p>
          </div>
        </div>

        {/* Timeline representation */}
        <div className={cn(
          "relative border-border/60 mt-8 pl-8 space-y-8",
          isRtl ? "border-r mr-6 pr-8 pl-0 border-l-0" : "border-l ml-6 pl-8"
        )}>
          {timelineSteps.map((step) => {
            const stepTitle = t(step.titleKey);
            const stepDesc = t(step.descKey);
            
            // Map step to DB readiness flag
            let isDone = false;
            if (status) {
              if (step.num === 1) isDone = status.hasUom;
              if (step.num === 2) isDone = status.hasCategories;
              if (step.num === 3) isDone = status.hasSuppliers;
              if (step.num === 4) isDone = status.hasItems;
            }

            return (
              <div key={step.num} className="relative">
                {/* Timeline badge indicator */}
                <span className={cn(
                  "absolute top-0.5 w-8 h-8 rounded-full flex items-center justify-center text-label-xs font-bold border transition-colors duration-300 shadow-md",
                  isRtl ? "-right-[45px]" : "-left-[45px]",
                  isDone 
                    ? "bg-emerald-500 border-emerald-500 text-white"
                    : "bg-card border-border text-muted-foreground"
                )}>
                  {isDone ? (
                    <CheckCircle className="w-4 h-4 text-white" />
                  ) : (
                    step.num
                  )}
                </span>

                <div className="space-y-1.5">
                  <h3 className={cn(
                    "text-title-sm font-bold flex items-center gap-2",
                    isDone ? "text-emerald-500" : "text-foreground"
                  )}>
                    {stepTitle}
                    {isDone && (
                      <span className="text-[10px] px-2 py-0.5 bg-emerald-500/10 text-emerald-500 rounded font-bold uppercase">
                        {isRtl ? 'مكتمل' : 'Initialized'}
                      </span>
                    )}
                  </h3>
                  <p className="text-body-md text-muted-foreground/75 font-medium leading-relaxed max-w-3xl">
                    {stepDesc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
