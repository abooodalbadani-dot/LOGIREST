'use client';

import { useState, useMemo } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { 
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Plus,
  Trash2,
  Lock,
  Check,
  AlertCircle,
  Search,
  Database,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAudioFeedback } from '@/hooks/useAudioFeedback';
import { motion, AnimatePresence } from 'framer-motion';
import { z } from 'zod';
import { useTriggerEvents, useParameterRegistry } from '@/features/notifications/hooks/useNotificationTemplates';

export function TemplateCreateClient({ locale }: { locale: string }) {
  const t = useTranslations('notifications');
  const t_common = useTranslations('common');
  const router = useRouter();
  const qc = useQueryClient();
  const { playSound } = useAudioFeedback();
  const { data: triggerEventsData, isLoading: eventsLoading } = useTriggerEvents();
  const { data: parameterRegistry, isLoading: registryLoading } = useParameterRegistry();

  const triggerEvents = useMemo(() => (triggerEventsData as { data?: Array<{ code: string; name_ar: string; name_en: string; entity_type: string; description: string; suggested_fields: string[] }> })?.data || (triggerEventsData as Array<{ code: string; name_ar: string; name_en: string; entity_type: string; description: string; suggested_fields: string[] }>) || [], [triggerEventsData]);

  const getSuggestedParams = (eventCode: string) => {
    const event = triggerEvents.find((e: { code: string }) => e.code === eventCode);
    if (!event || !parameterRegistry) return [];
    const entityFields = (parameterRegistry as Record<string, Array<{ entity: string; field: string; type: string; label_ar: string; label_en: string; sample_value: string }>>)[event.entity_type];
    if (!entityFields) return [];
    const result: Array<{ name: string; label_ar: string; label_en: string; sample_value: string; entity: string; field_path: string }> = [];
    event.suggested_fields.forEach((fieldName: string) => {
      const match = entityFields.find((f: { field: string }) => f.field === fieldName);
      if (match) {
        result.push({
          name: `${match.entity.toLowerCase()}_${match.field}`,
          label_ar: match.label_ar,
          label_en: match.label_en,
          sample_value: match.sample_value,
          entity: match.entity,
          field_path: match.field,
        });
      }
    });
    return result;
  };

  const [step, setStep] = useState(1);
  const [template, setTemplate] = useState({
    code: '',
    trigger_event: 'LOW_STOCK',
    subject_ar: '',
    subject_en: '',
    body_ar: '',
    body_en: '',
    allowed_parameters: [] as Array<{ name: string; label_ar: string; label_en: string; sample_value: string; entity?: string; field_path?: string }>,
    is_active: true,
  });

  const [paramForm, setParamForm] = useState({
    name: '',
    label_ar: '',
    label_en: '',
    sample_value: '',
  });

  const [entitySearch, setEntitySearch] = useState('');
  const [selectedEntity, setSelectedEntity] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: (body: unknown) => apiClient.post('/notifications/templates', z.unknown(), body),
    onSuccess: (data: unknown) => {
      playSound('success');
      qc.invalidateQueries({ queryKey: ['notifications/templates'] });
      // Redirect to the newly created template detail page
      const createdId = (data as { id?: string })?.id || 'tmpl-1';
      router.push(`/communications/notifications/templates/${createdId}`);
    },
    onError: (err: unknown) => {
      playSound('error');
      setError((err as { message?: string })?.message || 'Failed to create template');
    }
  });

  const handleTriggerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    const suggested = getSuggestedParams(val);
    setTemplate(prev => ({
      ...prev,
      trigger_event: val,
      allowed_parameters: [...suggested]
    }));
    setSelectedEntity(null);
  };

  const addRegistryField = (field: { entity: string; field: string; label_ar: string; label_en: string; sample_value: string }) => {
    const paramName = `${field.entity.toLowerCase()}_${field.field}`;
    if (template.allowed_parameters.some(p => p.name === paramName)) return;
    setTemplate(prev => ({
      ...prev,
      allowed_parameters: [
        ...prev.allowed_parameters,
        {
          name: paramName,
          label_ar: field.label_ar,
          label_en: field.label_en,
          sample_value: field.sample_value,
          entity: field.entity,
          field_path: field.field,
        }
      ]
    }));
    playSound('click');
  };

  const addCustomParam = () => {
    if (!paramForm.name || !paramForm.label_en || !paramForm.sample_value) return;
    const nameSanitized = paramForm.name.toLowerCase().replace(/[^a-z0-9_]/g, '');

    if (template.allowed_parameters.some(p => p.name === nameSanitized)) {
      setError('Parameter name already exists');
      return;
    }

    setTemplate(prev => ({
      ...prev,
      allowed_parameters: [
        ...prev.allowed_parameters,
        {
          name: nameSanitized,
          label_ar: paramForm.label_ar || paramForm.label_en,
          label_en: paramForm.label_en,
          sample_value: paramForm.sample_value
        }
      ]
    }));
    setParamForm({ name: '', label_ar: '', label_en: '', sample_value: '' });
    setError(null);
  };

  const removeParam = (name: string) => {
    setTemplate(prev => ({
      ...prev,
      allowed_parameters: prev.allowed_parameters.filter(p => p.name !== name)
    }));
  };

  const executeCreate = () => {
    if (!template.code || !template.trigger_event) {
      setError('Please fill in the template code');
      return;
    }
    createMutation.mutate(template);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-8 relative">
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-operational-cyan/5 rounded-full blur-[120px] pointer-events-none -z-10" />

      {/* Header section */}
      <div className="space-y-4">
        <button
          onClick={() => router.push('/communications/notifications/templates')}
          className="group inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground hover:text-operational-cyan transition-all"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform rtl:rotate-180" />
          {t_common('actions.back') || 'Back to templates'}
        </button>
        
        <div className="flex items-center justify-between border-b border-white/10 pb-6">
          <div className="space-y-1">
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight">
              CREATE TEMPLATE
            </h1>
            <p className="text-[10px] text-muted-foreground/60 uppercase font-bold tracking-[0.2em] mt-1.5 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-operational-cyan animate-pulse" />
              Dynamic Notification Registration Pipeline
            </p>
          </div>
          <div className="text-right font-mono text-3xl font-black text-muted-foreground/20">
            0{step} / 03
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-none bg-neutral-900/50 dark:bg-black/50 border border-status-error/20 flex items-start gap-3 text-status-error text-xs font-bold leading-normal">
          <AlertCircle className="w-4.5 h-4.5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Wizard steps content */}
      <div className="min-h-[350px]">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.15 }}
              className="space-y-6"
            >
              <div className="grid gap-4">
                <Label htmlFor="code" className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/80">
                  TEMPLATE CODE
                </Label>
                <Input
                  id="code"
                  value={template.code}
                  onChange={(e) => {
                    setTemplate(prev => ({ ...prev, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '') }));
                    setError(null);
                  }}
                  placeholder="E.G. INVENTORY_LOW_STOCK_MAIL"
                  className="h-14 font-mono font-semibold rounded-none bg-surface-container border border-white/10 px-5 focus-visible:ring-operational-cyan text-sm"
                />
                <span className="text-[9px] text-muted-foreground/45 font-medium ml-1">
                  UPPERCASE ALPHANUMERIC LETTERS AND UNDERSCORES ONLY.
                </span>
              </div>

              <div className="grid gap-4">
                <Label htmlFor="trigger_event" className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/80">
                  EVENT TRIGGER
                </Label>
                {eventsLoading ? (
                  <div className="flex items-center gap-2 h-14 bg-surface-container border border-white/10 rounded-none px-5 text-sm text-muted-foreground/60">
                    <Loader2 className="w-4 h-4 animate-spin text-operational-cyan" />
                    Loading trigger events...
                  </div>
                ) : (
                  <div className="relative">
                    <select
                      id="trigger_event"
                      value={template.trigger_event}
                      onChange={handleTriggerChange}
                      className="w-full h-14 bg-surface-container border border-white/10 rounded-none px-5 focus:outline-none focus:ring-1 focus:ring-operational-cyan text-sm font-semibold transition-all appearance-none cursor-pointer"
                    >
                      {triggerEvents.map((evt: { code: string; name_en: string; entity_type: string }) => (
                        <option key={evt.code} value={evt.code}>
                          {evt.name_en.toUpperCase()} ({evt.code}) — {evt.entity_type}
                        </option>
                      ))}
                      <option value="CUSTOM">FULLY CUSTOM EVENT TEMPLATE (CUSTOM)</option>
                    </select>
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground/45">
                      ▼
                    </div>
                    {template.trigger_event !== 'CUSTOM' && (() => {
                      const evt = triggerEvents.find((e: { code: string }) => e.code === template.trigger_event);
                      return evt ? (
                        <p className="text-[9px] text-muted-foreground/45 font-medium mt-1.5 ml-1">
                          {evt.description} — Entity: <span className="font-mono text-operational-cyan">{evt.entity_type}</span>
                        </p>
                      ) : null;
                    })()}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.15 }}
              className="space-y-6"
            >
              {/* Current Parameters List */}
              <div className="space-y-3">
                <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/80 block">
                  ALLOWED PARAMETERS FOR TRIGGER: {template.trigger_event}
                  <span className="ml-2 text-[9px] font-mono text-muted-foreground/45 bg-white/5 px-1.5 py-0.5">
                    {template.allowed_parameters.length} TOKENS
                  </span>
                </Label>
                
                <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                  {template.allowed_parameters.length === 0 ? (
                    <div className="py-8 border border-dashed border-white/10 rounded-none flex flex-col items-center justify-center text-center text-muted-foreground/40 gap-2">
                      <p className="text-xs italic font-medium">No parameters defined yet. Add from the entity browser below or create custom tokens.</p>
                    </div>
                  ) : (
                    template.allowed_parameters.map((param) => {
                      const isEntityBound = !!(param.entity && param.field_path);
                      return (
                        <div 
                          key={param.name}
                          className="flex items-center justify-between p-3 bg-surface-container border border-white/10 rounded-none"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="font-mono text-[10px] font-bold text-operational-cyan px-2 py-0.5 rounded-none bg-operational-cyan/10 border border-operational-cyan/20 shrink-0">
                              {"{{"}{param.name}{"}}"}
                            </span>
                            <div className="flex flex-col gap-0.5 min-w-0">
                              <span className="text-[10px] font-bold text-foreground/80 truncate">
                                {param.label_en} / {param.label_ar}
                              </span>
                              <span className="text-[9px] font-mono text-muted-foreground/45 truncate">
                                Sample: {param.sample_value}
                                {isEntityBound && (
                                  <span className="ml-2 text-[8px] uppercase tracking-wider text-operational-cyan/60">
                                    · {param.entity}.{param.field_path}
                                  </span>
                                )}
                              </span>
                            </div>
                          </div>

                          {isEntityBound ? (
                            <div className="flex items-center gap-1 text-[8px] font-black uppercase text-muted-foreground/35 bg-white/5 border border-white/5 rounded-none px-1.5 py-0.5 tracking-wider shrink-0">
                              <Database className="w-2.5 h-2.5 stroke-[2.5px]" />
                              DB
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => removeParam(param.name)}
                              className="p-1.5 rounded-none text-status-error/60 hover:text-status-error hover:bg-status-error/15 transition-colors shrink-0"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Entity Field Browser Panel */}
              {!registryLoading && parameterRegistry && (
                <div className="border border-white/10 rounded-none bg-surface-container/30 overflow-hidden">
                  <div className="p-3 border-b border-white/10 flex items-center justify-between">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 flex items-center gap-1.5">
                      <Database className="w-3.5 h-3.5" /> ENTITY FIELD BROWSER
                    </div>
                    <div className="relative w-48">
                      <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/40" />
                      <input
                        type="text"
                        value={entitySearch}
                        onChange={(e) => setEntitySearch(e.target.value)}
                        placeholder="Search fields..."
                        className="w-full h-7 text-[10px] bg-surface-container-lowest border border-white/10 rounded-none pl-7 pr-2 outline-none focus:border-operational-cyan/40 text-foreground placeholder:text-muted-foreground/30 font-mono"
                      />
                    </div>
                  </div>
                  <div className="flex">
                    {/* Entity Sidebar */}
                    <div className="w-28 shrink-0 border-r border-white/10 max-h-[250px] overflow-y-auto">
                      {Object.keys(parameterRegistry as Record<string, unknown>).map((entity) => {
                        const entityIcon = entity === 'Item' || entity === 'Lot' ? '📦' : entity === 'User' ? '👤' : entity === 'Order' || entity === 'Transfer' ? '📋' : entity === 'Adjustment' ? '⚖️' : entity === 'Branch' ? '📍' : '📊';
                        return (
                          <button
                            key={entity}
                            type="button"
                            onClick={() => setSelectedEntity(selectedEntity === entity ? null : entity)}
                            className={`w-full text-left px-3 py-2 text-[10px] font-bold uppercase tracking-wider transition-all ${
                              selectedEntity === entity
                                ? 'bg-operational-cyan/10 text-operational-cyan border-l-2 border-operational-cyan'
                                : 'text-muted-foreground/60 hover:bg-surface-container-low hover:text-foreground border-l-2 border-transparent'
                            }`}
                          >
                            <span className="mr-1">{entityIcon}</span>
                            {entity}
                          </button>
                        );
                      })}
                    </div>
                    {/* Fields List */}
                    <div className="flex-1 max-h-[250px] overflow-y-auto p-2">
                      {selectedEntity ? (
                        <div className="space-y-1">
                          {(parameterRegistry as Record<string, Array<{ entity: string; field: string; type: string; label_ar: string; label_en: string; sample_value: string }>>)[selectedEntity]
                            .filter((f) =>
                              !entitySearch ||
                              f.field.toLowerCase().includes(entitySearch.toLowerCase()) ||
                              f.label_en.toLowerCase().includes(entitySearch.toLowerCase()) ||
                              f.label_ar.includes(entitySearch)
                            )
                            .map((field) => {
                              const alreadyAdded = template.allowed_parameters.some(
                                p => p.name === `${field.entity.toLowerCase()}_${field.field}`
                              );
                              return (
                                <button
                                  key={field.field}
                                  type="button"
                                  disabled={alreadyAdded}
                                  onClick={() => addRegistryField(field)}
                                  className={`w-full text-left px-3 py-2 rounded-none text-[10px] transition-all flex items-center justify-between gap-2 ${
                                    alreadyAdded
                                      ? 'bg-surface-container-low text-muted-foreground/30 cursor-not-allowed'
                                      : 'hover:bg-surface-container-lowest text-foreground/80 hover:text-operational-cyan'
                                  }`}
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className="font-mono font-bold text-[9px]">
                                      {field.field}
                                    </span>
                                    <span className="text-muted-foreground/40 truncate">
                                      {locale === 'ar' ? field.label_ar : field.label_en}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <span className={`text-[7px] uppercase font-black tracking-widest px-1 py-0.5 rounded-none ${
                                      field.type === 'string' ? 'bg-emerald-500/10 text-emerald-500/70' :
                                      field.type === 'number' ? 'bg-amber-500/10 text-amber-500/70' :
                                      field.type === 'date' ? 'bg-sky-500/10 text-sky-500/70' :
                                      'bg-purple-500/10 text-purple-500/70'
                                    }`}>
                                      {field.type}
                                    </span>
                                    {alreadyAdded ? (
                                      <Check className="w-3 h-3 text-emerald-500/50" />
                                    ) : (
                                      <Plus className="w-3 h-3 text-muted-foreground/40" />
                                    )}
                                  </div>
                                </button>
                              );
                            })}
                          {(parameterRegistry as Record<string, Array<{ field: string }>>)[selectedEntity].filter((f) =>
                            !entitySearch ||
                            f.field.toLowerCase().includes(entitySearch.toLowerCase())
                          ).length === 0 && (
                            <p className="text-[10px] text-muted-foreground/40 italic p-3 text-center">
                              No fields match your search.
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground/40 gap-2 py-8">
                          <Database className="w-6 h-6" />
                          <p className="text-[10px] italic font-medium">Select an entity on the left to browse its fields.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Add custom parameter subform */}
              <div className="p-4 border border-white/10 rounded-none bg-surface-container/30 space-y-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5" /> ADD CUSTOM TOKEN VARIABLE
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="p_name" className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/60">
                      Token Name
                    </Label>
                    <Input
                      id="p_name"
                      value={paramForm.name}
                      onChange={(e) => setParamForm(prev => ({ ...prev, name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') }))}
                      placeholder="e.g. order_id"
                      className="h-9 text-[11px] font-mono rounded-none bg-surface-container border border-white/10 px-3"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="p_sample" className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/60">
                      Sample Value
                    </Label>
                    <Input
                      id="p_sample"
                      value={paramForm.sample_value}
                      onChange={(e) => setParamForm(prev => ({ ...prev, sample_value: e.target.value }))}
                      placeholder="e.g. ORD-1002"
                      className="h-9 text-[11px] rounded-none bg-surface-container border border-white/10 px-3"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="p_en" className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/60">
                      English Label
                    </Label>
                    <Input
                      id="p_en"
                      value={paramForm.label_en}
                      onChange={(e) => setParamForm(prev => ({ ...prev, label_en: e.target.value }))}
                      placeholder="e.g. Order ID"
                      className="h-9 text-[11px] rounded-none bg-surface-container border border-white/10 px-3"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="p_ar" className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/60">
                      Arabic Label
                    </Label>
                    <Input
                      id="p_ar"
                      value={paramForm.label_ar}
                      onChange={(e) => setParamForm(prev => ({ ...prev, label_ar: e.target.value }))}
                      placeholder="e.g. رقم الطلب"
                      className="h-9 text-[11px] rounded-none bg-surface-container border border-white/10 px-3"
                    />
                  </div>
                </div>
                <Button
                  type="button"
                  onClick={addCustomParam}
                  disabled={!paramForm.name || !paramForm.label_en || !paramForm.sample_value}
                  className="w-full h-9 border border-white/10 hover:border-operational-cyan/35 bg-surface-container-lowest rounded-none font-bold uppercase text-[9px] tracking-widest transition-all"
                >
                  Register Variable to List
                </Button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step-3"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.15 }}
              className="space-y-6"
            >
              {/* Arabic Content */}
              <div className="space-y-4 p-5 bg-surface-container border border-white/10 rounded-none">
                <span className="text-[10px] font-bold uppercase tracking-wider text-operational-cyan flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-operational-cyan" />
                  ARABIC TEMPLATE CONTENT (RTL)
                </span>
                
                <div className="grid gap-2">
                  <Label htmlFor="sub_ar" className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground/60">Subject (Arabic)</Label>
                  <Input
                    id="sub_ar"
                    value={template.subject_ar}
                    onChange={(e) => setTemplate(prev => ({ ...prev, subject_ar: e.target.value }))}
                    placeholder="تنبيه نقص المخزون: {{item_name}}"
                    dir="rtl"
                    className="h-11 text-xs rounded-none bg-surface-container border border-white/10 px-3"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="body_ar" className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground/60">Message Body (Arabic)</Label>
                  <Textarea
                    id="body_ar"
                    value={template.body_ar}
                    onChange={(e) => setTemplate(prev => ({ ...prev, body_ar: e.target.value }))}
                    placeholder="الصنف {{item_name}} وصل إلى كمية {{qty}}..."
                    dir="rtl"
                    className="min-h-[80px] text-xs rounded-none bg-surface-container border border-white/10 px-3 py-2"
                  />
                </div>
              </div>

              {/* English Content */}
              <div className="space-y-4 p-5 bg-surface-container border border-white/10 rounded-none">
                <span className="text-[10px] font-bold uppercase tracking-wider text-operational-cyan flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-operational-cyan" />
                  ENGLISH TEMPLATE CONTENT (LTR)
                </span>
                
                <div className="grid gap-2">
                  <Label htmlFor="sub_en" className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground/60">Subject (English)</Label>
                  <Input
                    id="sub_en"
                    value={template.subject_en}
                    onChange={(e) => setTemplate(prev => ({ ...prev, subject_en: e.target.value }))}
                    placeholder="Low Stock Alert: {{item_name}}"
                    dir="ltr"
                    className="h-11 text-xs rounded-none bg-surface-container border border-white/10 px-3"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="body_en" className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground/60">Message Body (English)</Label>
                  <Textarea
                    id="body_en"
                    value={template.body_en}
                    onChange={(e) => setTemplate(prev => ({ ...prev, body_en: e.target.value }))}
                    placeholder="Item {{item_name}} reached low quantity of {{qty}}..."
                    dir="ltr"
                    className="min-h-[80px] text-xs rounded-none bg-surface-container border border-white/10 px-3 py-2"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between border-t border-white/10 pt-6">
        <div>
          {step > 1 && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => setStep(prev => prev - 1)}
              className="h-12 px-6 border border-white/10 rounded-none text-[10px] font-bold uppercase tracking-widest gap-2 hover:bg-white/5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              {t_common('actions.back') || 'Back'}
            </Button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.push('/communications/notifications/templates')}
            className="h-12 px-5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground rounded-none"
          >
            {t_common('actions.cancel') || 'Cancel'}
          </Button>

          {step < 3 ? (
            <Button
              type="button"
              disabled={step === 1 && !template.code}
              onClick={() => setStep(prev => prev + 1)}
              className="h-12 px-6 bg-white/5 border border-white/10 hover:border-white/20 rounded-none text-[10px] font-bold uppercase tracking-widest gap-2 text-foreground"
            >
              Next Step
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={executeCreate}
              disabled={createMutation.isPending}
              className="h-12 px-8 bg-operational-cyan text-black hover:brightness-110 font-bold uppercase text-[10px] tracking-widest gap-2 rounded-none transition-all duration-300"
            >
              {createMutation.isPending ? 'CREATING...' : 'CREATE TEMPLATE'}
              <Check className="w-4 h-4 stroke-[3px]" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
