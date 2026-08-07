'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  Shield,
  MapPin,
  Globe,
  BadgeCheck,
  Fingerprint,
  Camera,
  Trash2,
  User,
  Mail,
  Phone,
  Lock,
  CheckCircle,
  AlertCircle,
  Sun,
  Moon,
  Loader2,
  Bell,
  Package,
  ShoppingCart
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/providers/AuthProvider';
import { useUserProfile } from '@/providers/UserProfileProvider';
import ChangePasswordClient from './ChangePasswordClient';
import { RelationalName } from '@/components/shared/RelationalName';
import LocaleSwitcher from '@/components/shared/LocaleSwitcher';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useAudioFeedback } from '@/hooks/useAudioFeedback';
import { getMediaUrl } from '@/utils/path';
import { useUnsavedChangesGuard } from '@/lib/unsaved-changes/useUnsavedChangesGuard';

export default function ProfilePage() {
  const t = useTranslations('profile');
  const tc = useTranslations('common');
  const tn = useTranslations('communications.notifications');
  const { user } = useAuth();
  const { avatarUrl, displayName, themePreferences, notificationPreferences, locale, updateProfile, uploadAvatar, isSaving } = useUserProfile();
  const { playSound } = useAudioFeedback();

  // Detail fields editing state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notifPrefs, setNotifPrefs] = useState(notificationPreferences);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [isPasswordDirty, setIsPasswordDirty] = useState(false);

  const [saveSuccess, setSaveSuccess] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const isAdmin = user?.role === 'ADMIN';

  // Unsaved changes guard combining profile fields and change password form
  const isProfileDirty =
    (isAdmin && name !== (displayName || user?.name || '')) ||
    (isAdmin && email !== (user?.email || '')) ||
    phone !== (user?.phone || '') ||
    notifPrefs.lowStock !== notificationPreferences.lowStock ||
    notifPrefs.expiry !== notificationPreferences.expiry ||
    notifPrefs.pendingApproval !== notificationPreferences.pendingApproval ||
    notifPrefs.poFinalized !== notificationPreferences.poFinalized ||
    notifPrefs.security !== notificationPreferences.security;

  useUnsavedChangesGuard(isProfileDirty || isPasswordDirty);

  // Initialize fields once user is loaded
  useEffect(() => {
    if (user) {
       
      setName(displayName || user.name || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
      setNotifPrefs(notificationPreferences);
       
    }
  }, [user, displayName, notificationPreferences]);

  if (!user) return null;

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1.5 * 1024 * 1024) {
      playSound('error');
      setValidationError('Image size must be smaller than 1.5MB');
      return;
    }

    setAvatarUploading(true);
    const url = await uploadAvatar(file);
    setAvatarUploading(false);

    if (url) {
      playSound('success');
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      setValidationError(null);
    } else {
      playSound('error');
      setValidationError('Failed to upload avatar image');
    }
  };

  const handleRemoveAvatar = async () => {
    try {
      await updateProfile({ avatarUrl: null });
      playSound('success');
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      setValidationError(null);
    } catch (err) {
      playSound('error');
      setValidationError('Failed to remove avatar image');
    }
  };

  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isAdmin && !name.trim()) {
      playSound('error');
      setValidationError('Name cannot be empty');
      return;
    }
    if (isAdmin && (!email.trim() || !email.includes('@'))) {
      playSound('error');
      setValidationError('Please enter a valid email address');
      return;
    }

    try {
      const updatePayload: { displayName?: string; email?: string; phone?: string } = { phone };
      if (isAdmin) {
        updatePayload.displayName = name;
        updatePayload.email = email;
      }
      await updateProfile(updatePayload);
      playSound('success');
      setSaveSuccess(true);
      setValidationError(null);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      playSound('error');
      setValidationError('Failed to save changes');
    }
  };

  const handleThemeChange = async (themeVal: 'light' | 'dark') => {
    try {
      await updateProfile({ themePreferences: themeVal });
      playSound('success');
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      setValidationError(null);
    } catch (err) {
      playSound('error');
      setValidationError('Failed to apply theme preferences');
    }
  };

  return (
    <div className="min-w-0 gap-6 flex-1 fade-in space-y-8 slide-in-from-bottom-4 mx-auto animate-in flex-col flex duration-700 w-full max-w-5xl">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 min-w-0">

        <div className="flex items-center gap-3 p-1.5 bg-card border border-border shadow-sm/50 backdrop-blur-md border border-border-muted/50 rounded-2xl shadow-xl">
          <div className="p-2 bg-operational-cyan/10 rounded-xl text-operational-cyan">
            <Globe className="w-4 h-4" />
          </div>
          <div className="flex flex-col pe-4 border-e border-border-muted/50 min-w-0">
            <span className="text-label-xs font-semibold text-muted-foreground uppercase leading-none mb-1">{t('language_preference') || 'Language'}</span>
            <LocaleSwitcher />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Account Details & Avatar Update */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-border-muted/50 bg-card border border-border shadow-sm/50 backdrop-blur-md relative overflow-hidden group">
            {/* Ambient Border Glow */}
            <div className="absolute -top-[1px] start-1/2 -translate-x-1/2 w-1/2 h-[2px] bg-gradient-to-r from-transparent via-operational-cyan/40 to-transparent shadow-[0_0_15px_rgba(var(--operational-cyan-rgb),0.2)]" />

            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-operational-cyan/10 rounded-lg">
                    <Fingerprint className="w-5 h-5 text-operational-cyan" />
                  </div>
                  <CardTitle className="text-title-lg">{t('details') || 'Profile Settings'}</CardTitle>
                </div>
                <div className="px-3 py-1 bg-card border border-border shadow-sm border border-border-muted/50 rounded-full flex items-center gap-1.5">
                  <BadgeCheck className="w-3.5 h-3.5 text-operational-cyan" />
                  <span className="text-label-xs font-semibold text-foreground uppercase">{t('verified_identity') || 'Verified'}</span>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-8">
              {/* Alert Status Banners */}
              {saveSuccess && (
                <div className="p-4 bg-muted/50 border border-emerald-500/20 text-foreground rounded-2xl flex items-center gap-3 text-xs font-bold uppercase tracking-wider animate-in fade-in duration-300">
                  <CheckCircle className="w-5 h-5 shrink-0" />
                  Profile updated successfully / تم تحديث الملف الشخصي بنجاح
                </div>
              )}
              {validationError && (
                <div className="p-4 bg-status-error/10 border border-status-error/20 text-status-error rounded-2xl flex items-center gap-3 text-xs font-bold uppercase tracking-wider animate-in shake duration-300">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  {validationError}
                </div>
              )}

              {/* Avatar upload block */}
              <div className="flex flex-col sm:flex-row items-center gap-6 p-6 rounded-3xl bg-card border border-border shadow-sm/40 border border-white/5 min-w-0">
                <div className="relative group/avatar">
                  <div className="w-24 h-24 rounded-2xl bg-surface-container-high border-2 border-white/10 flex items-center justify-center text-3xl font-extrabold text-operational-cyan shadow-xl overflow-hidden relative">
                    {avatarUrl ? (
                      <img src={getMediaUrl(avatarUrl)} alt="Profile Photo" className="w-full h-full object-cover" />
                    ) : (
                      (displayName || user.name || '').charAt(0).toUpperCase()
                    )}
                  </div>
                  <label
                    htmlFor="avatar-file"
                    className="absolute -bottom-2 -right-2 p-2 bg-operational-cyan text-black rounded-xl cursor-pointer hover:scale-105 active:scale-95 shadow-sm transition-transform"
                    title="Change Photo"
                  >
                    <Camera className="w-4 h-4 stroke-[2.5px]" />
                    <Input
                      id="avatar-file"
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="space-y-1.5 text-center sm:text-start flex-1">
                  <h3 className="text-sm font-bold text-foreground">Profile Picture / الصورة الشخصية</h3>
                  <p className="text-[10px] text-muted-foreground/60 leading-relaxed uppercase tracking-wider font-semibold">
                    Accepts PNG, JPG, or GIF (max. 1.5MB). Realtime topbar sync is fully active.
                  </p>
                  {avatarUrl && (
                    <button
                      type="button"
                      onClick={handleRemoveAvatar}
                      className="text-[10px] font-black text-status-error/80 hover:text-status-error uppercase tracking-widest flex items-center gap-1 mt-2.5 mx-auto sm:mx-0 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Remove Image
                    </button>
                  )}
                </div>
              </div>

              {/* Account details modification form */}
              <form onSubmit={handleSaveChanges} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="grid gap-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="profile-name" className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/80 ms-1">
                        {t('name') || 'Full Name'}
                      </Label>
                      {!isAdmin && (
                        <span className="text-[9px] font-bold text-amber-500/90 flex items-center gap-1 uppercase tracking-wider">
                          <Lock className="w-3 h-3" /> Read Only Field
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <Input
                        id="profile-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        disabled={!isAdmin}
                        className="h-12 ps-11 bg-card border border-border shadow-sm/80 border border-outline-low rounded-2xl focus-visible:ring-operational-cyan focus-visible:border-operational-cyan transition-all text-xs font-semibold disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-muted/30"
                      />
                      <User className="w-4 h-4 text-muted-foreground/45 absolute left-4 top-1/2 -translate-y-1/2" />
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="profile-email" className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/80 ms-1">
                        {t('email') || 'Email Address'}
                      </Label>
                      {!isAdmin && (
                        <span className="text-[9px] font-bold text-amber-500/90 flex items-center gap-1 uppercase tracking-wider">
                          <Lock className="w-3 h-3" /> Read Only Field
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <Input
                        id="profile-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={!isAdmin}
                        className="h-12 ps-11 bg-card border border-border shadow-sm/80 border border-outline-low rounded-2xl focus-visible:ring-operational-cyan focus-visible:border-operational-cyan transition-all text-xs font-semibold disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-muted/30"
                      />
                      <Mail className="w-4 h-4 text-muted-foreground/45 absolute left-4 top-1/2 -translate-y-1/2" />
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="profile-phone" className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/80 ms-1">
                      Phone Number / رقم الهاتف
                    </Label>
                    <div className="relative">
                      <Input
                        id="profile-phone"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+966 50 000 0000"
                        dir="ltr"
                        className="h-12 ps-11 bg-card border border-border shadow-sm/80 border border-outline-low rounded-2xl focus-visible:ring-operational-cyan focus-visible:border-operational-cyan transition-all text-xs font-semibold text-right"
                      />
                      <Phone className="w-4 h-4 text-muted-foreground/45 absolute left-4 top-1/2 -translate-y-1/2" />
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/80 ms-1">
                      {t('role') || 'System Role'}
                    </Label>
                    <div className="h-12 bg-card border border-border shadow-sm/40 border border-white/5 rounded-2xl px-5 flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-operational-cyan bg-operational-cyan/10 px-3 py-1 rounded-xl border border-operational-cyan/20 uppercase">
                        {user.role}
                      </span>
                      <span className="text-[8px] font-black text-muted-foreground/45 uppercase tracking-widest">Read Only Field</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <Button
                    type="submit"
                    disabled={isSaving}
                    className="h-12 px-8 bg-gradient-to-r from-operational-cyan to-cyan-400 text-black hover:brightness-110 font-black uppercase text-[10px] tracking-widest rounded-xl shadow-[0_4px_15px_rgba(var(--operational-cyan-rgb),0.15)] flex items-center gap-2"
                  >
                    {isSaving && <Loader2 className="w-4 h-4 animate-spin text-black" />}
                    Save Profile Changes
                  </Button>
                </div>
              </form>

              <Separator className="bg-border-muted/50" />

              <div className="space-y-5">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="w-4 h-4 text-operational-cyan" />
                  <p className="text-label-sm font-semibold uppercase text-muted-foreground">{t('assigned_scopes') || 'Assigned Scopes'}</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(() => {
                    const specificBranchIds = new Set(
                      user.scopes
                        .filter((s) => s.warehouseId || s.departmentId)
                        .map((s) => s.branchId || s.branch?.id || s.warehouse?.branch?.id || s.department?.branch?.id)
                        .filter(Boolean)
                    );

                    const filteredScopes = user.scopes.filter((s) => {
                      const bId = s.branchId || s.branch?.id || s.warehouse?.branch?.id || s.department?.branch?.id;
                      if (!s.warehouseId && !s.departmentId && bId && specificBranchIds.has(bId)) {
                        return false;
                      }
                      return true;
                    });

                    const seen = new Set<string>();
                    const uniqueScopes = filteredScopes.filter((s) => {
                      const key = `${s.branchId || ''}:${s.warehouseId || ''}:${s.departmentId || ''}`;
                      if (seen.has(key)) return false;
                      seen.add(key);
                      return true;
                    });

                    return uniqueScopes.map((scope, idx) => {
                      const branchObj = scope.branch || scope.warehouse?.branch || scope.department?.branch;
                      const branchTitle = branchObj?.name
                        ? `${branchObj.name}${branchObj.code ? ` (${branchObj.code})` : ''}`
                        : scope.branchId
                          ? (tc('actions.assigned_branch') || 'Assigned Branch')
                          : (tc('actions.all_branches') || 'All Branches');

                      const warehouseObj = scope.warehouse;
                      const warehouseText = warehouseObj?.name
                        ? `${warehouseObj.name}${warehouseObj.code ? ` (${warehouseObj.code})` : ''}`
                        : scope.warehouseId
                          ? (tc('warehouses.assigned_warehouse') || 'Assigned Warehouse')
                          : null;

                      const departmentObj = scope.department;
                      const departmentText = departmentObj?.name
                        ? `${departmentObj.name}${departmentObj.code ? ` (${departmentObj.code})` : ''}`
                        : scope.departmentId
                          ? (tc('departments.assigned_dept') || 'Assigned Dept')
                          : null;

                      return (
                        <div
                          key={idx}
                          className="flex items-center gap-3 p-3 rounded-xl border border-border-muted/50 bg-card border border-border shadow-sm/30 hover:border-operational-cyan/30 hover:bg-card border border-border shadow-sm/50 transition-all group/scope"
                        >
                          <div className="w-2 h-2 rounded-full bg-operational-cyan group-hover:shadow-[0_0_8px_rgba(var(--operational-cyan-rgb),0.6)] transition-all" />
                          <div className="flex flex-col min-w-0">
                            <span className="text-label-sm font-bold text-foreground">
                              {branchTitle}
                            </span>
                            <span className="text-label-xs text-muted-foreground font-medium flex items-center flex-wrap gap-1">
                              {warehouseText ? (
                                <>
                                  <span className="me-1">{tc('warehouses.warehouses') || 'Warehouse'}:</span>
                                  <span>{warehouseText}</span>
                                </>
                              ) : (
                                <span>{t('global_access') || 'All Warehouses & Departments'}</span>
                              )}
                              {departmentText && (
                                <>
                                  <span className="mx-1">•</span>
                                  <span>Dept: {departmentText}</span>
                                </>
                              )}
                            </span>
                          </div>
                        </div>
                      );
                    });
                  })()}
                  {user.scopes.length === 0 && (
                    <div className="col-span-full py-8 text-center border-2 border-dashed border-border-muted/50 rounded-2xl">
                      <p className="text-body-md text-muted-foreground italic">{t('global_access') || 'Global Access'}</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Theme Settings & Password & Security */}
        <div className="space-y-6">
          {/* Swiss-Style Theme Selection segment picker */}
          <Card className="border-border-muted/50 bg-card border border-border shadow-sm/50 backdrop-blur-md relative overflow-hidden group">
            <div className="absolute -top-[1px] start-1/2 -translate-x-1/2 w-3/4 h-[2px] bg-gradient-to-r from-transparent via-operational-cyan/50 to-transparent shadow-[0_0_20px_rgba(var(--operational-cyan-rgb),0.4)] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-operational-cyan/10 rounded-lg">
                  {themePreferences === 'dark' ? (
                    <Moon className="w-5 h-5 text-operational-cyan" />
                  ) : (
                    <Sun className="w-5 h-5 text-operational-cyan" />
                  )}
                </div>
                <div className="flex flex-col gap-1 items-start text-start">
                  <h3 className="text-sm font-black uppercase tracking-widest text-foreground">Theme Preferences</h3>
                  <p className="text-lg font-bold text-muted-foreground">مظهر النظام</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider font-semibold leading-relaxed text-start">
                Choose system theme. Updates are instantly synchronized to all UI components.
              </p>
              <div className="flex p-1 bg-card border border-border shadow-sm border border-outline-low rounded-xl">
                <button
                  type="button"
                  onClick={() => handleThemeChange('light')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${themePreferences === 'light'
                      ? 'bg-operational-cyan text-black'
                      : 'text-muted-foreground/60 hover:text-foreground'
                    }`}
                >
                  <Sun className="w-4 h-4" />
                  Light / مضيء
                </button>
                <button
                  type="button"
                  onClick={() => handleThemeChange('dark')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${themePreferences === 'dark'
                      ? 'bg-operational-cyan text-black'
                      : 'text-muted-foreground/60 hover:text-foreground'
                    }`}
                >
                  <Moon className="w-4 h-4" />
                  Dark / داكن
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Notification Preferences Card */}
          <Card className="border-border-muted/50 bg-card border border-border shadow-sm/50 backdrop-blur-md relative overflow-hidden group">
            <div className="absolute -top-[1px] start-1/2 -translate-x-1/2 w-3/4 h-[2px] bg-gradient-to-r from-transparent via-operational-cyan/50 to-transparent" />
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-operational-cyan/10 rounded-lg">
                  <Bell className="w-5 h-5 text-operational-cyan" />
                </div>
                <div className="flex flex-col gap-1 items-start text-start">
                  <h3 className="text-sm font-black uppercase tracking-widest text-foreground">Notification Preferences</h3>
                  <p className="text-lg font-bold text-muted-foreground">تفضيلات التنبيهات</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="w-3.5 h-3.5 text-muted-foreground/60" />
                  <span className="text-[10px] font-bold uppercase">{tn('low_stock_alert') || 'Low Stock'}</span>
                </div>
                <Switch
                  checked={notifPrefs.lowStock}
                  onCheckedChange={(val) => setNotifPrefs(p => ({ ...p, lowStock: val }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="w-3.5 h-3.5 text-muted-foreground/60" />
                  <span className="text-[10px] font-bold uppercase">{tn('expiry_alert') || 'Expiry'}</span>
                </div>
                <Switch
                  checked={notifPrefs.expiry}
                  onCheckedChange={(val) => setNotifPrefs(p => ({ ...p, expiry: val }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-3.5 h-3.5 text-muted-foreground/60" />
                  <span className="text-[10px] font-bold uppercase">{tn('pending_approval') || 'Approvals'}</span>
                </div>
                <Switch
                  checked={notifPrefs.pendingApproval}
                  onCheckedChange={(val) => setNotifPrefs(p => ({ ...p, pendingApproval: val }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-3.5 h-3.5 text-muted-foreground/60" />
                  <span className="text-[10px] font-bold uppercase">{tn('po_finalized') || 'PO Finalized'}</span>
                </div>
                <Switch
                  checked={notifPrefs.poFinalized}
                  onCheckedChange={(val) => setNotifPrefs(p => ({ ...p, poFinalized: val }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5 text-muted-foreground/60" />
                  <span className="text-[10px] font-bold uppercase">{tn('security_alert') || 'Security'}</span>
                </div>
                <Switch
                  checked={notifPrefs.security}
                  onCheckedChange={(val) => setNotifPrefs(p => ({ ...p, security: val }))}
                />
              </div>
              <Button
                type="button"
                disabled={isSaving}
                onClick={async () => {
                  try {
                    await updateProfile({ notificationPreferences: notifPrefs });
                    playSound('success');
                    setSaveSuccess(true);
                    setTimeout(() => setSaveSuccess(false), 3000);
                  } catch {
                    playSound('error');
                    setValidationError('Failed to save notification preferences');
                  }
                }}
                className="w-full h-9 mt-2 bg-card/5 border border-white/10 hover:border-operational-cyan/30 rounded-none text-[9px] font-bold uppercase tracking-widest"
              >
                {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                Save Notification Prefs
              </Button>
            </CardContent>
          </Card>

          <ChangePasswordClient onDirtyChange={setIsPasswordDirty} />

          <Card className="border-border-muted/50 bg-card border border-border shadow-sm/50 border-dashed backdrop-blur-sm group/security">
            <CardHeader className="pb-3">
              <CardTitle className="text-body-md font-semibold flex items-center gap-2 text-muted-foreground uppercase">
                <Shield className="w-4 h-4 group-hover:text-operational-cyan transition-colors" />
                {t('enterprise_security') || 'Security Credentials'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border shadow-sm/20 border border-border-muted/50 opacity-50 grayscale">
                <div className="w-8 h-8 rounded bg-surface-container-high flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-muted-foreground rounded-sm" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-label-sm font-bold">{t('two_fa') || '2FA Authentication'}</span>
                  <span className="text-label-xs">{t('phase_requirement', { phase: 12 }) || 'Phase requirement'}</span>
                </div>
              </div>
              <p className="text-label-xs text-muted-foreground leading-relaxed">
                {tc('security_standard_desc') || 'Your login session is secured with standard encryption and enterprise scope protection.'}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
