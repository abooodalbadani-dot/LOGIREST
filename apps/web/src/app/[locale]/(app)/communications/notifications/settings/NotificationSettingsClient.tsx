'use client';

import React, { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Bell, Shield, Package, ShoppingCart, Save, ArrowLeft, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Link } from '@/i18n/navigation';
import { useUserProfile } from '@/providers/UserProfileProvider';
import { useAudioFeedback } from '@/hooks/useAudioFeedback';

export function NotificationSettingsClient() {
 const t = useTranslations('communications.notifications');
 const tc = useTranslations('common');
 const { notificationPreferences, updateProfile, isSaving } = useUserProfile();
 const { playSound } = useAudioFeedback();

 const [settings, setSettings] = React.useState(notificationPreferences);
 const [saveSuccess, setSaveSuccess] = React.useState(false);
 const [saveError, setSaveError] = React.useState<string | null>(null);

 useEffect(() => {
  setSettings(notificationPreferences);
 }, [notificationPreferences]);

 const handleSave = async () => {
  try {
   await updateProfile({ notificationPreferences: settings });
   playSound('success');
   setSaveSuccess(true);
   setSaveError(null);
   setTimeout(() => setSaveSuccess(false), 3000);
  } catch {
   playSound('error');
   setSaveError('Failed to save notification preferences');
  }
 };

 return (
  <div className="min-w-0 gap-6 flex-1 max-w-4xl fade-in slide-in-from-bottom-4 p-8 mx-auto animate-in flex-col flex duration-700 space-y-12 w-full">
   <div className="flex flex-col gap-4 border-b border-outline-low pb-8 min-w-0">
    <Link 
     href="/communications/notifications"
     className="inline-flex items-center gap-2 text-label-xs font-semibold uppercase text-muted-foreground hover:text-operational-cyan transition-colors"
    >
     <ArrowLeft className="w-3 h-3 rtl:rotate-180" />
     {t('return_to_notifications') || 'Back to Notifications'}
    </Link>
    <div className="flex items-center justify-between">
     <div className="space-y-1">
      <h1 className="text-headline-lg font-semibold uppercase text-foreground flex items-center gap-4">
       <Bell className="w-10 h-10 text-operational-cyan" />
       {t('settings_title') || 'Notification Settings'}
      </h1>
      <p className="text-label-sm text-muted-foreground/60 uppercase font-bold">
       Manage your operational alerts and system preferences
      </p>
     </div>
     <Button
      onClick={handleSave}
      disabled={isSaving}
      className="h-12 px-8 bg-operational-cyan text-white hover:bg-operational-cyan/90 transition-all font-semibold uppercase text-label-xs gap-2 rounded-sm"
     >
      {isSaving ? (
       <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
       <Save className="w-4 h-4" />
      )}
      {tc('save')}
     </Button>
    </div>
    {saveSuccess && (
     <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-sm flex items-center gap-2 text-[10px] font-bold uppercase">
      <CheckCircle className="w-4 h-4" />
      Preferences saved successfully
     </div>
    )}
    {saveError && (
     <div className="p-3 bg-status-error/10 border border-status-error/20 text-status-error rounded-sm flex items-center gap-2 text-[10px] font-bold uppercase">
      <AlertCircle className="w-4 h-4" />
      {saveError}
     </div>
    )}
   </div>

   <div className="space-y-10">
    {/* Inventory Alerts */}
    <section className="space-y-6">
     <div className="flex items-center gap-3 border-s-4 border-operational-cyan ps-4">
      <Package className="w-5 h-5 text-operational-cyan" />
      <h2 className="text-body-md font-semibold uppercase text-foreground">
       {t('inventory_alerts') || 'Inventory Alerts'}
      </h2>
     </div>
     <div className="bg-card border border-border shadow-sm rounded-lg border border-outline-low divide-y divide-outline-low/10 overflow-hidden shadow-sm">
      <div className="flex flex-row items-center justify-between w-full rounded-lg border border-border p-4 shadow-sm bg-transparent transition-colors hover:bg-muted/30">
        <div className="flex flex-col space-y-1 text-start min-w-0">
         <span className="text-sm font-medium text-text-main dark:text-white">{t('low_stock_alert') || 'Low Stock Alerts'}</span>
         <span className="text-xs text-muted-foreground dark:text-gray-400">{t('low_stock_desc') || 'Notify when items fall below minimum thresholds'}</span>
        </div>
       <Switch 
        checked={settings.lowStock} 
        onCheckedChange={(val) => setSettings(s => ({ ...s, lowStock: val }))} 
       />
      </div>
      <div className="flex flex-row items-center justify-between w-full rounded-lg border border-border p-4 shadow-sm bg-transparent transition-colors hover:bg-muted/30">
        <div className="flex flex-col space-y-1 text-start min-w-0">
         <span className="text-sm font-medium text-text-main dark:text-white">{t('expiry_alert') || 'Expiration Warnings'}</span>
         <span className="text-xs text-muted-foreground dark:text-gray-400">{t('expiry_desc') || 'Alert when lots are approaching their use-by date'}</span>
        </div>
       <Switch 
        checked={settings.expiry} 
        onCheckedChange={(val) => setSettings(s => ({ ...s, expiry: val }))} 
       />
      </div>
     </div>
    </section>

    {/* Procurement Alerts */}
    <section className="space-y-6">
     <div className="flex items-center gap-3 border-s-4 border-amber-500 ps-4">
      <ShoppingCart className="w-5 h-5 text-amber-500" />
      <h2 className="text-body-md font-semibold uppercase text-foreground">
       {t('procurement_alerts') || 'Procurement & Approvals'}
      </h2>
     </div>
     <div className="bg-card border border-border shadow-sm rounded-lg border border-outline-low divide-y divide-outline-low/10 overflow-hidden shadow-sm">
      <div className="flex flex-row items-center justify-between w-full rounded-lg border border-border p-4 shadow-sm bg-transparent transition-colors hover:bg-muted/30">
        <div className="flex flex-col space-y-1 text-start min-w-0">
         <span className="text-sm font-medium text-text-main dark:text-white">{t('pending_approval') || 'Pending Approvals'}</span>
         <span className="text-xs text-muted-foreground dark:text-gray-400">{t('pending_desc') || 'Receive notifications for requests requiring your action'}</span>
        </div>
       <Switch 
        checked={settings.pendingApproval} 
        onCheckedChange={(val) => setSettings(s => ({ ...s, pendingApproval: val }))} 
       />
      </div>
      <div className="flex flex-row items-center justify-between w-full rounded-lg border border-border p-4 shadow-sm bg-transparent transition-colors hover:bg-muted/30">
        <div className="flex flex-col space-y-1 text-start min-w-0">
         <span className="text-sm font-medium text-text-main dark:text-white">{t('po_finalized') || 'Purchase Finalization'}</span>
         <span className="text-xs text-muted-foreground dark:text-gray-400">{t('po_desc') || 'Notify when a PO is fully received or cancelled'}</span>
        </div>
       <Switch 
        checked={settings.poFinalized} 
        onCheckedChange={(val) => setSettings(s => ({ ...s, poFinalized: val }))} 
       />
      </div>
     </div>
    </section>

    {/* System Alerts */}
    <section className="space-y-6">
     <div className="flex items-center gap-3 border-s-4 border-muted-foreground/40 ps-4">
      <Shield className="w-5 h-5 text-muted-foreground/40" />
      <h2 className="text-body-md font-semibold uppercase text-foreground">
       {t('system_security') || 'Security & System'}
      </h2>
     </div>
     <div className="bg-card border border-border shadow-sm rounded-lg border border-outline-low divide-y divide-outline-low/10 overflow-hidden shadow-sm">
      <div className="flex flex-row items-center justify-between w-full rounded-lg border border-border p-4 shadow-sm bg-transparent transition-colors hover:bg-muted/30">
        <div className="flex flex-col space-y-1 text-start min-w-0">
         <span className="text-sm font-medium text-text-main dark:text-white">{t('security_alert') || 'Login Security'}</span>
         <span className="text-xs text-muted-foreground dark:text-gray-400">{t('security_desc') || 'Alert on logins from new devices or locations'}</span>
        </div>
       <Switch 
        checked={settings.security} 
        onCheckedChange={(val) => setSettings(s => ({ ...s, security: val }))} 
       />
      </div>
     </div>
    </section>
   </div>
  </div>
 );
}
