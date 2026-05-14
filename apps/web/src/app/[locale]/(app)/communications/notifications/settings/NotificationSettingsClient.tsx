'use client';

import { useTranslations } from 'next-intl';
import { Bell, Shield, Package, ShoppingCart, Save, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Link } from '@/i18n/navigation';

export function NotificationSettingsClient() {
  const t = useTranslations('communications.notifications');
  const tc = useTranslations('common');

  const [settings, setSettings] = React.useState({
    lowStock: true,
    expiry: true,
    pendingApproval: true,
    poFinalized: false,
    security: true,
  });

  return (
    <div className="max-w-4xl mx-auto p-8 space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col gap-4 border-b border-outline-low pb-8">
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
            className="h-12 px-8 bg-operational-cyan text-white hover:bg-operational-cyan/90 transition-all font-semibold uppercase text-label-xs gap-2 rounded-sm"
          >
            <Save className="w-4 h-4" />
            {tc('save')}
          </Button>
        </div>
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
          <div className="bg-surface-container-low rounded-lg border border-outline-low divide-y divide-outline-low/10 overflow-hidden shadow-sm">
            <div className="flex items-center justify-between p-6 bg-surface-container-lowest/40">
              <div className="space-y-0.5">
                <Label className="text-label-sm font-bold uppercase">{t('low_stock_alert') || 'Low Stock Alerts'}</Label>
                <p className="text-label-xs text-muted-foreground/60 uppercase">{t('low_stock_desc') || 'Notify when items fall below minimum thresholds'}</p>
              </div>
              <Switch 
                checked={settings.lowStock} 
                onCheckedChange={(val) => setSettings(s => ({ ...s, lowStock: val }))} 
              />
            </div>
            <div className="flex items-center justify-between p-6 bg-surface-container-lowest/40">
              <div className="space-y-0.5">
                <Label className="text-label-sm font-bold uppercase">{t('expiry_alert') || 'Expiration Warnings'}</Label>
                <p className="text-label-xs text-muted-foreground/60 uppercase">{t('expiry_desc') || 'Alert when lots are approaching their use-by date'}</p>
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
          <div className="bg-surface-container-low rounded-lg border border-outline-low divide-y divide-outline-low/10 overflow-hidden shadow-sm">
            <div className="flex items-center justify-between p-6 bg-surface-container-lowest/40">
              <div className="space-y-0.5">
                <Label className="text-label-sm font-bold uppercase">{t('pending_approval') || 'Pending Approvals'}</Label>
                <p className="text-label-xs text-muted-foreground/60 uppercase">{t('pending_desc') || 'Receive notifications for requests requiring your action'}</p>
              </div>
              <Switch 
                checked={settings.pendingApproval} 
                onCheckedChange={(val) => setSettings(s => ({ ...s, pendingApproval: val }))} 
              />
            </div>
            <div className="flex items-center justify-between p-6 bg-surface-container-lowest/40">
              <div className="space-y-0.5">
                <Label className="text-label-sm font-bold uppercase">{t('po_finalized') || 'Purchase Finalization'}</Label>
                <p className="text-label-xs text-muted-foreground/60 uppercase">{t('po_desc') || 'Notify when a PO is fully received or cancelled'}</p>
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
          <div className="bg-surface-container-low rounded-lg border border-outline-low divide-y divide-outline-low/10 overflow-hidden shadow-sm">
            <div className="flex items-center justify-between p-6 bg-surface-container-lowest/40">
              <div className="space-y-0.5">
                <Label className="text-label-sm font-bold uppercase">{t('security_alert') || 'Login Security'}</Label>
                <p className="text-label-xs text-muted-foreground/60 uppercase">{t('security_desc') || 'Alert on logins from new devices or locations'}</p>
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
