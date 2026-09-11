import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAuth, type UserProfile } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Camera, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  Save, 
  ShieldCheck, 
  Sparkles,
  UploadCloud,
  Lock,
  Eye,
  EyeOff,
  KeyRound,
  Crown,
  Zap,
  Copy,
  Check,
  LogOut,
  Clock,
  ChevronRight,
  Shield
} from 'lucide-react';

export type ProfileModalTab = 'PROFILE' | 'PASSWORD' | 'MEMBERSHIP';

interface UserProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: ProfileModalTab;
  onOpenSubscribeModal?: (plan?: 'FREE' | 'SILVER' | 'GOLD' | 'DIAMOND') => void;
}

export const UserProfileEditModal: React.FC<UserProfileEditModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'PROFILE',
  onOpenSubscribeModal
}) => {
  const { user, updateProfile, changePassword, logout, isSuperAdmin } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [activeTab, setActiveTab] = useState<ProfileModalTab>(initialTab);

  // Profile Details & Address State
  const [fullName, setFullName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [mobile, setMobile] = useState<string>('');
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);
  const [street, setStreet] = useState<string>('');
  const [city, setCity] = useState<string>('');
  const [state, setState] = useState<string>('');
  const [pincode, setPincode] = useState<string>('');
  const [experience, setExperience] = useState<'BEGINNER' | 'INTERMEDIATE' | 'EXPERT'>('INTERMEDIATE');
  const [marketPreferences, setMarketPreferences] = useState<string[]>(['INDEX_OPTIONS', 'STOCK_OPTIONS', 'MCX_COMMODITIES']);

  // Password State
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showCurrentPassword, setShowCurrentPassword] = useState<boolean>(false);
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState<boolean>(false);

  // Status & Feedback State
  const [photoError, setPhotoError] = useState<string>('');
  const [formError, setFormError] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleMarketPref = (pref: string) => {
    setMarketPreferences(prev => 
      prev.includes(pref) ? prev.filter(p => p !== pref) : [...prev, pref]
    );
  };

  // Reset tab and populate form when opening
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      if (user) {
        setFullName(user.fullName || '');
        setEmail(user.email || '');
        setMobile(user.mobile || '');
        setAvatarUrl(user.avatarUrl);
        setStreet(user.address?.street || '');
        setCity(user.address?.city || '');
        setState(user.address?.state || '');
        setPincode(user.address?.pincode || '');
        setExperience(user.traderExperience || user.extendedProfile?.traderExperience || 'INTERMEDIATE');
        setMarketPreferences(user.extendedProfile?.marketPreferences || ['INDEX_OPTIONS', 'STOCK_OPTIONS', 'MCX_COMMODITIES']);
      }
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPhotoError('');
      setFormError('');
      setSuccessMsg('');
    }
  }, [isOpen, initialTab, user]);

  if (!isOpen) return null;

  const currentPlan = (user?.plan || 'FREE').toUpperCase();
  const subscriberId = user?.subscriberId || `SUB${user?.id?.replace(/\D/g, '').padStart(6, '0') || '000101'}`;

  // Photo Upload Handler with strict 250KB limit & format check
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setPhotoError('');
    setSuccessMsg('');

    if (!file) return;

    // Strict 250 KB limit check (250 * 1024 bytes = 256,000 bytes)
    const MAX_BYTES = 250 * 1024;
    if (file.size > MAX_BYTES) {
      const sizeKb = (file.size / 1024).toFixed(2);
      setPhotoError(`Photo size is ${sizeKb} KB, which exceeds the strict 250 KB limit. Please choose a photo under 250 KB.`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      setPhotoError('Invalid format. Only JPG, JPEG, and PNG images are allowed.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setAvatarUrl(event.target.result as string);
        setPhotoError('');
      }
    };
    reader.onerror = () => {
      setPhotoError('Failed to read image file. Please try again.');
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setAvatarUrl(undefined);
    setPhotoError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(subscriberId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  // Profile and Address Submit
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSuccessMsg('');

    if (!fullName.trim() || fullName.trim().length < 2) {
      setFormError('Please enter a valid Full Name (at least 2 characters).');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      setFormError('Please enter a valid Email address.');
      return;
    }

    const cleanMobile = mobile.replace(/[^0-9]/g, '');
    if (cleanMobile.length < 10) {
      setFormError('Please enter a valid 10-digit Mobile Number.');
      return;
    }

    if (pincode.trim() && !/^\d{6}$/.test(pincode.trim())) {
      setFormError('Pincode must be a 6-digit number.');
      return;
    }

    setIsSaving(true);
    try {
      const res = await updateProfile({
        fullName: fullName.trim(),
        email: email.trim(),
        mobile: mobile.trim(),
        avatarUrl,
        traderExperience: experience,
        address: {
          street: street.trim(),
          city: city.trim(),
          state: state.trim(),
          pincode: pincode.trim()
        },
        extendedProfile: {
          ...user?.extendedProfile,
          traderExperience: experience,
          city: city.trim(),
          state: state.trim(),
          avatarUrl,
          marketPreferences
        }
      });

      if (res.success) {
        setSuccessMsg('Profile details & address updated successfully!');
        setTimeout(() => {
          setSuccessMsg('');
        }, 3000);
      } else {
        setFormError(res.error || 'Failed to update profile.');
      }
    } catch (err: any) {
      setFormError(err.message || 'An unexpected error occurred while saving.');
    } finally {
      setIsSaving(false);
    }
  };

  // Password Update Submit
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSuccessMsg('');

    if (!newPassword || newPassword.length < 6) {
      setFormError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setFormError('New password and confirm password do not match.');
      return;
    }

    setIsUpdatingPassword(true);

    try {
      const res = await changePassword(currentPassword, newPassword);
      if (res.success) {
        setSuccessMsg('Password updated successfully! Keep your new credentials safe.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => {
          setSuccessMsg('');
        }, 4000);
      } else {
        setFormError(res.error || 'Failed to update password. Please check your current password.');
      }
    } catch (err: any) {
      setFormError(err.message || 'Network error updating password.');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleModalLogout = () => {
    onClose();
    logout();
  };

  // Password strength calculation
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { level: 0, text: '', color: '' };
    let score = 0;
    if (pass.length >= 6) score++;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;

    if (score <= 2) return { level: 1, text: 'Weak', color: 'bg-rose-500 text-rose-500' };
    if (score <= 4) return { level: 2, text: 'Good', color: 'bg-amber-500 text-amber-500' };
    return { level: 3, text: 'Strong', color: 'bg-emerald-500 text-emerald-500' };
  };

  const pwdStrength = getPasswordStrength(newPassword);

  return createPortal(
    <div className="fixed inset-0 z-[120000] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <style>{`
        .profile-modal-scrollbar::-webkit-scrollbar {
          width: 7px;
        }
        .profile-modal-scrollbar::-webkit-scrollbar-track {
          background: ${isDark ? 'rgba(15, 23, 42, 0.6)' : 'rgba(241, 245, 249, 0.8)'};
          border-radius: 9999px;
          margin: 4px 0;
        }
        .profile-modal-scrollbar::-webkit-scrollbar-thumb {
          background: ${isDark ? 'rgba(71, 85, 105, 0.8)' : 'rgba(148, 163, 184, 0.8)'};
          border-radius: 9999px;
          border: 1px solid ${isDark ? 'rgba(15, 23, 42, 0.5)' : 'rgba(255, 255, 255, 0.8)'};
        }
        .profile-modal-scrollbar::-webkit-scrollbar-thumb:hover {
          background: ${isDark ? 'rgba(148, 163, 184, 0.95)' : 'rgba(100, 116, 139, 0.95)'};
        }
      `}</style>
      
      <div className={`border rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col font-sans select-none ring-1 overflow-hidden shadow-2xl my-auto ${
        isDark 
          ? 'bg-[#0c1220] border-slate-800 text-slate-100 ring-white/10 shadow-black/90' 
          : 'bg-white border-slate-200 text-slate-900 ring-slate-200 shadow-slate-400/40'
      }`}>
        
        {/* Fixed Top Header: Prominent Modal Title and Trader Identity */}
        <div className={`shrink-0 flex items-center justify-between p-4 sm:p-5 border-b z-20 ${
          isDark ? 'border-slate-800 bg-[#0c1220]' : 'border-slate-200 bg-white'
        }`}>
          <div className="flex items-center space-x-3">
            <div className={`p-2.5 rounded-2xl flex items-center justify-center font-bold text-base shadow-md shrink-0 ${
              isSuperAdmin
                ? 'bg-gradient-to-tr from-purple-600 to-indigo-600 text-white'
                : currentPlan === 'GOLD'
                ? 'bg-gradient-to-tr from-amber-500 to-yellow-500 text-black'
                : currentPlan === 'DIAMOND'
                ? 'bg-gradient-to-tr from-purple-600 to-pink-600 text-white'
                : isDark
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'bg-blue-100 text-blue-700 border border-blue-300'
            }`}>
              {isSuperAdmin ? <Crown className="w-5 h-5 text-yellow-300" /> : (user?.fullName?.charAt(0) || 'U').toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-extrabold text-sm sm:text-base tracking-wide flex items-center gap-2">
                  <span>Edit Trader Profile</span>
                </h2>
                <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full border font-bold ${
                  isSuperAdmin
                    ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                    : currentPlan === 'DIAMOND'
                    ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                    : currentPlan === 'GOLD'
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                    : isDark
                    ? 'bg-slate-800 text-slate-300 border-slate-700'
                    : 'bg-slate-100 text-slate-700 border-slate-300'
                }`}>
                  {isSuperAdmin ? 'SUPERADMIN' : currentPlan}
                </span>
              </div>
              <div className="flex items-center flex-wrap gap-2 text-xs opacity-75 font-mono mt-0.5">
                <span className="font-semibold text-cyan-400">{user?.fullName || 'Trader Account'}</span>
                <span>•</span>
                <span>{user?.email}</span>
                <span>•</span>
                <button
                  type="button"
                  onClick={handleCopyId}
                  className="hover:underline flex items-center gap-1 cursor-pointer text-cyan-500"
                  title="Copy Subscriber ID"
                >
                  <span>{subscriberId}</span>
                  {copiedId ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={`p-2 rounded-xl border transition cursor-pointer shrink-0 ${
              isDark 
                ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800' 
                : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
            }`}
            title="Close Profile Modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Fixed Tab Switcher */}
        <div className={`shrink-0 flex items-center border-b px-4 sm:px-6 pt-2 gap-2 text-xs font-bold overflow-x-auto no-scrollbar ${
          isDark ? 'border-slate-800 bg-slate-950/40' : 'border-slate-200 bg-slate-50/70'
        }`}>
          <button
            type="button"
            onClick={() => { setActiveTab('PROFILE'); setFormError(''); setSuccessMsg(''); }}
            className={`flex items-center gap-1.5 py-3 px-3.5 border-b-2 transition cursor-pointer shrink-0 ${
              activeTab === 'PROFILE'
                ? isDark
                  ? 'border-cyan-400 text-cyan-400 font-extrabold'
                  : 'border-blue-600 text-blue-600 font-extrabold'
                : 'border-transparent opacity-70 hover:opacity-100'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Profile Details & Address</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('PASSWORD'); setFormError(''); setSuccessMsg(''); }}
            className={`flex items-center gap-1.5 py-3 px-3.5 border-b-2 transition cursor-pointer shrink-0 ${
              activeTab === 'PASSWORD'
                ? isDark
                  ? 'border-amber-400 text-amber-400 font-extrabold'
                  : 'border-amber-600 text-amber-600 font-extrabold'
                : 'border-transparent opacity-70 hover:opacity-100'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Update Password & Security</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('MEMBERSHIP'); setFormError(''); setSuccessMsg(''); }}
            className={`flex items-center gap-1.5 py-3 px-3.5 border-b-2 transition cursor-pointer shrink-0 ${
              activeTab === 'MEMBERSHIP'
                ? isDark
                  ? 'border-purple-400 text-purple-400 font-extrabold'
                  : 'border-purple-600 text-purple-600 font-extrabold'
                : 'border-transparent opacity-70 hover:opacity-100'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Membership & Plan</span>
          </button>
        </div>

        {/* Global Feedback Messages */}
        {(formError || successMsg) && (
          <div className="shrink-0 px-4 sm:px-6 pt-3">
            {formError && (
              <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}
            {successMsg && (
              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}
          </div>
        )}

        {/* TAB 1: PROFILE DETAILS & ADDRESS */}
        {activeTab === 'PROFILE' && (
          <form onSubmit={handleProfileSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
            
            {/* Scrollable Body with Visible Active Scrollbar */}
            <div 
              className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4 sm:p-6 space-y-6 profile-modal-scrollbar min-w-0"
              style={{
                scrollbarWidth: 'thin',
                scrollbarColor: isDark ? 'rgba(71, 85, 105, 0.8) rgba(15, 23, 42, 0.6)' : 'rgba(148, 163, 184, 0.8) rgba(241, 245, 249, 0.8)'
              }}
            >
              
              {/* 1. PHOTO UPLOAD SECTION */}
              <div className={`p-4 rounded-2xl border space-y-3.5 ${
                isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center justify-between pb-2 border-b border-slate-800/40">
                  <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
                    <Camera className="w-4 h-4" />
                    <span>Profile Photo (Avatar)</span>
                  </span>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                    isDark ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-500'
                  }`}>
                    JPG / PNG • Max 250 KB
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="relative group shrink-0">
                    <div className={`w-20 h-20 rounded-full border-2 overflow-hidden flex items-center justify-center shadow-lg ${
                      isDark ? 'border-cyan-500/50 bg-slate-950' : 'border-blue-400 bg-white'
                    }`}>
                      {avatarUrl ? (
                        <img 
                          src={avatarUrl} 
                          alt="Profile Avatar" 
                          className="w-full h-full object-cover" 
                        />
                      ) : (
                        <div className={`w-full h-full font-black text-2xl flex items-center justify-center ${
                          isDark ? 'bg-cyan-500/15 text-cyan-300' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {(fullName.charAt(0) || user?.fullName?.charAt(0) || 'U').toUpperCase()}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col space-y-2 w-full text-center sm:text-left">
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handlePhotoUpload}
                        accept="image/png, image/jpeg, image/jpg"
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm ${
                          isDark
                            ? 'bg-cyan-500/20 hover:bg-cyan-500/30 border-cyan-500/40 text-cyan-300'
                            : 'bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700'
                        }`}
                      >
                        <UploadCloud className="w-3.5 h-3.5" />
                        <span>Upload New Photo</span>
                      </button>

                      {avatarUrl && (
                        <button
                          type="button"
                          onClick={handleRemovePhoto}
                          className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </button>
                      )}
                    </div>

                    <p className="text-[11px] opacity-70 leading-tight">
                      Strictly up to <strong>250 KB</strong> in size. Keeps your profile optimized and fast.
                    </p>

                    {photoError && (
                      <p className="text-[11px] text-rose-400 font-semibold flex items-center gap-1 justify-center sm:justify-start">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span>{photoError}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* 2. PERSONAL IDENTITY FIELDS */}
              <div className={`p-4 rounded-2xl border space-y-4 ${
                isDark ? 'bg-slate-900/40 border-slate-800/80' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center gap-2 pb-2 border-b border-slate-800/40">
                  <User className="w-4 h-4 text-blue-400" />
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 dark:text-slate-100">
                      Personal & Contact Information
                    </h3>
                    <p className="text-[10px] opacity-60">Verified trader contact details for terminal session & communication</p>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold block mb-1">
                    Full Legal Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Arun Kumar"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className={`w-full border rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none font-sans ${
                        isDark 
                          ? 'bg-slate-900 border-slate-700 text-white focus:border-cyan-400' 
                          : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500'
                      }`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold block mb-1">
                      Email Address <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="email"
                        required
                        placeholder="name@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={`w-full border rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none font-sans ${
                          isDark 
                            ? 'bg-slate-900 border-slate-700 text-white focus:border-cyan-400' 
                            : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500'
                        }`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold block mb-1">
                      Mobile Number <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="tel"
                        required
                        placeholder="+91 98765 43210"
                        value={mobile}
                        onChange={(e) => setMobile(e.target.value)}
                        className={`w-full border rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none font-sans ${
                          isDark 
                            ? 'bg-slate-900 border-slate-700 text-white focus:border-cyan-400' 
                            : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500'
                        }`}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. RESIDENTIAL / CORRESPONDENCE ADDRESS */}
              <div className={`p-4 rounded-2xl border space-y-4 ${
                isDark ? 'bg-slate-900/40 border-slate-800/80' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center gap-2 pb-2 border-b border-slate-800/40">
                  <MapPin className="w-4 h-4 text-cyan-400" />
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 dark:text-slate-100">
                      Residential & Correspondence Address
                    </h3>
                    <p className="text-[10px] opacity-60">Physical billing location used for invoicing and compliance records</p>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold block mb-1">
                    Street Address / Flat / Building
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Flat 402, Dalal Street Commercial Tower"
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none font-sans ${
                      isDark 
                        ? 'bg-slate-900 border-slate-700 text-white focus:border-cyan-400' 
                        : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500'
                    }`}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="text-[11px] font-bold block mb-1">City</label>
                    <input
                      type="text"
                      placeholder="e.g. Mumbai"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none font-sans ${
                        isDark 
                          ? 'bg-slate-900 border-slate-700 text-white focus:border-cyan-400' 
                          : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold block mb-1">State</label>
                    <input
                      type="text"
                      placeholder="e.g. Maharashtra"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none font-sans ${
                        isDark 
                          ? 'bg-slate-900 border-slate-700 text-white focus:border-cyan-400' 
                          : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold block mb-1">Pincode</label>
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="e.g. 400001"
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value)}
                      className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none font-sans ${
                        isDark 
                          ? 'bg-slate-900 border-slate-700 text-white focus:border-cyan-400' 
                          : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* 4. TRADER EXPERIENCE LEVEL */}
              <div className={`p-4 rounded-2xl border space-y-3 ${
                isDark ? 'bg-slate-900/40 border-slate-800/80' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center gap-2 pb-2 border-b border-slate-800/40">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 dark:text-slate-100">
                      Trading Experience Level
                    </h3>
                    <p className="text-[10px] opacity-60">Calibrates risk disclosures, leverage warnings, and terminal telemetry</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs font-semibold">
                  {(['BEGINNER', 'INTERMEDIATE', 'EXPERT'] as const).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setExperience(lvl)}
                      className={`py-2 px-2 rounded-xl border transition cursor-pointer text-center ${
                        experience === lvl
                          ? lvl === 'BEGINNER'
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 font-bold shadow-sm'
                            : lvl === 'INTERMEDIATE'
                            ? 'bg-amber-500/20 text-amber-400 border-amber-500/50 font-bold shadow-sm'
                            : 'bg-purple-500/20 text-purple-400 border-purple-500/50 font-bold shadow-sm'
                          : isDark
                          ? 'bg-slate-900 text-slate-400 hover:text-white border-slate-800'
                          : 'bg-slate-100 text-slate-600 hover:text-slate-900 border-slate-200'
                      }`}
                    >
                      {lvl === 'BEGINNER' ? '🟢 Beginner (<1 Yr)' : lvl === 'INTERMEDIATE' ? '🟡 Interm. (1-3 Yrs)' : '🟣 Expert (3+ Yrs)'}
                    </button>
                  ))}
                </div>
              </div>

              {/* 5. PREFERRED TRADING SEGMENTS */}
              <div className={`p-4 rounded-2xl border space-y-3 ${
                isDark ? 'bg-slate-900/40 border-slate-800/80' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center gap-2 pb-2 border-b border-slate-800/40">
                  <Zap className="w-4 h-4 text-purple-400" />
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 dark:text-slate-100">
                      Preferred Trading Segments & Markets
                    </h3>
                    <p className="text-[10px] opacity-60">Customizes default market radar feeds and high-conviction signal highlights</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {[
                    { id: 'INDEX_OPTIONS', label: '⚡ Index Options (Nifty & BankNifty)' },
                    { id: 'STOCK_OPTIONS', label: '📊 Stock Options & Equity F&O' },
                    { id: 'MCX_COMMODITIES', label: '🛢️ MCX Commodities (Gold, Silver, Crude)' },
                    { id: 'CURRENCY_FUTURES', label: '💹 Currency Derivatives (USDINR)' }
                  ].map((seg) => {
                    const isSelected = marketPreferences.includes(seg.id);
                    return (
                      <button
                        key={seg.id}
                        type="button"
                        onClick={() => toggleMarketPref(seg.id)}
                        className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition cursor-pointer ${
                          isSelected
                            ? isDark
                              ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300 font-bold'
                              : 'bg-blue-50 border-blue-300 text-blue-800 font-bold'
                            : isDark
                            ? 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                            : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <span className="text-[11px]">{seg.label}</span>
                        {isSelected ? <Check className="w-3.5 h-3.5 shrink-0 text-cyan-400" /> : <div className="w-3.5 h-3.5 rounded-full border border-slate-600 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Fixed Action Footer */}
            <div className={`shrink-0 p-4 sm:px-6 py-3.5 border-t flex items-center justify-between gap-2 z-10 ${
              isDark ? 'border-slate-800 bg-[#0c1220]/95' : 'border-slate-200 bg-white/95'
            }`}>
              <button
                type="button"
                onClick={handleModalLogout}
                className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                title="Sign Out from this device"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className={`px-4 py-2 rounded-xl border text-xs font-bold transition cursor-pointer ${
                    isDark 
                      ? 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-400 hover:text-white' 
                      : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  className={`px-5 py-2 rounded-xl text-xs font-bold transition shadow-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                    isDark
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-cyan-500/20'
                      : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-500/25'
                  }`}
                >
                  {isSaving ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Saving Profile...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Save Profile & Address</span>
                    </>
                  )}
                </button>
              </div>
            </div>

          </form>
        )}

        {/* TAB 2: UPDATE PASSWORD & SECURITY */}
        {activeTab === 'PASSWORD' && (
          <form onSubmit={handlePasswordSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
            
            {/* Scrollable Body with Visible Active Scrollbar */}
            <div 
              className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4 sm:p-6 space-y-5 profile-modal-scrollbar min-w-0"
              style={{
                scrollbarWidth: 'thin',
                scrollbarColor: isDark ? 'rgba(71, 85, 105, 0.8) rgba(15, 23, 42, 0.6)' : 'rgba(148, 163, 184, 0.8) rgba(241, 245, 249, 0.8)'
              }}
            >
              {/* Security Advisory Box */}
              <div className={`p-4 rounded-2xl border space-y-1.5 ${
                isDark ? 'bg-amber-500/10 border-amber-500/25 text-amber-200' : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}>
                <div className="flex items-center gap-2 font-bold text-xs">
                  <Lock className="w-4 h-4 text-amber-400" />
                  <span>Account Security & Password Advisory</span>
                </div>
                <p className="text-[11px] leading-relaxed opacity-90">
                  Choose a secure password containing at least 6 characters. If this is your first time updating from a fast subscription OTP login, you can leave current password empty or enter your initial password.
                </p>
              </div>

              {/* Password Credentials Section */}
              <div className={`p-4 rounded-2xl border space-y-4 ${
                isDark ? 'bg-slate-900/40 border-slate-800/80' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center gap-2 pb-2 border-b border-slate-800/40">
                  <KeyRound className="w-4 h-4 text-amber-400" />
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 dark:text-slate-100">
                      Change Authentication Credentials
                    </h3>
                    <p className="text-[10px] opacity-60">Update your account password for secure multi-device terminal login</p>
                  </div>
                </div>

                {/* Current Password */}
                <div>
                  <label className="text-[11px] font-bold block mb-1">
                    Current Password (Optional if newly registered)
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      placeholder="Enter existing password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className={`w-full border rounded-xl pl-9 pr-10 py-2 text-xs focus:outline-none font-sans ${
                        isDark 
                          ? 'bg-slate-900 border-slate-700 text-white focus:border-amber-400' 
                          : 'bg-white border-slate-300 text-slate-900 focus:border-amber-500'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200 cursor-pointer"
                    >
                      {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div>
                  <label className="text-[11px] font-bold block mb-1">
                    New Password <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      placeholder="Enter new password (min. 6 characters)"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className={`w-full border rounded-xl pl-9 pr-10 py-2 text-xs focus:outline-none font-sans ${
                        isDark 
                          ? 'bg-slate-900 border-slate-700 text-white focus:border-amber-400' 
                          : 'bg-white border-slate-300 text-slate-900 focus:border-amber-500'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200 cursor-pointer"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Password Strength Indicator */}
                  {newPassword && (
                    <div className="mt-2 space-y-1">
                      <div className="flex justify-between text-[10px]">
                        <span className="opacity-70">Password Strength:</span>
                        <span className="font-bold">{pwdStrength.text}</span>
                      </div>
                      <div className={`w-full h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`}>
                        <div
                          className={`h-full transition-all duration-300 ${pwdStrength.color}`}
                          style={{ width: `${(pwdStrength.level / 3) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="text-[11px] font-bold block mb-1">
                    Confirm New Password <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      placeholder="Re-enter new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={`w-full border rounded-xl pl-9 pr-10 py-2 text-xs focus:outline-none font-sans ${
                        isDark 
                          ? 'bg-slate-900 border-slate-700 text-white focus:border-amber-400' 
                          : 'bg-white border-slate-300 text-slate-900 focus:border-amber-500'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200 cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {confirmPassword && newPassword !== confirmPassword && (
                    <p className="text-[10px] text-rose-400 mt-1">Passwords do not match.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Fixed Action Footer */}
            <div className={`shrink-0 p-4 sm:px-6 py-3.5 border-t flex items-center justify-between gap-2 z-10 ${
              isDark ? 'border-slate-800 bg-[#0c1220]/95' : 'border-slate-200 bg-white/95'
            }`}>
              <button
                type="button"
                onClick={handleModalLogout}
                className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className={`px-4 py-2 rounded-xl border text-xs font-bold transition cursor-pointer ${
                    isDark 
                      ? 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-400 hover:text-white' 
                      : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isUpdatingPassword || !newPassword || newPassword !== confirmPassword}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-bold text-xs transition shadow-lg shadow-amber-500/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isUpdatingPassword ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                      <span>Updating Password...</span>
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>Update Password</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* TAB 3: MEMBERSHIP & PLAN */}
        {activeTab === 'MEMBERSHIP' && (
          <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
            
            {/* Scrollable Body with Visible Active Scrollbar */}
            <div 
              className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4 sm:p-6 space-y-5 profile-modal-scrollbar min-w-0"
              style={{
                scrollbarWidth: 'thin',
                scrollbarColor: isDark ? 'rgba(71, 85, 105, 0.8) rgba(15, 23, 42, 0.6)' : 'rgba(148, 163, 184, 0.8) rgba(241, 245, 249, 0.8)'
              }}
            >
              {/* Section 1: Membership Overview Card */}
              <div className={`p-4 rounded-2xl border space-y-3.5 ${
                isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center gap-2 pb-2 border-b border-slate-800/40">
                  <ShieldCheck className="w-4 h-4 text-purple-400" />
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 dark:text-slate-100">
                      Current Plan & Subscription Status
                    </h3>
                    <p className="text-[10px] opacity-60">Terminal tier license, billing period, and account validity</p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${
                      isSuperAdmin
                        ? 'bg-purple-500/20 text-purple-300'
                        : currentPlan === 'DIAMOND'
                        ? 'bg-purple-500/20 text-purple-300'
                        : currentPlan === 'GOLD'
                        ? 'bg-amber-500/20 text-amber-400'
                        : isDark
                        ? 'bg-slate-800 text-slate-300'
                        : 'bg-slate-200 text-slate-700'
                    }`}>
                      {isSuperAdmin ? <Crown className="w-6 h-6" /> : <Shield className="w-6 h-6" />}
                    </div>
                    <div>
                      <div className="font-extrabold text-sm sm:text-base">
                        {isSuperAdmin ? 'SuperAdmin Master Access' : `${currentPlan} Plan Membership`}
                      </div>
                      <div className="text-xs opacity-75 font-mono">
                        Subscriber ID: <span className="text-cyan-400 font-semibold">{subscriberId}</span>
                      </div>
                    </div>
                  </div>

                  <span className={`text-xs font-mono font-bold px-3 py-1 rounded-full border ${
                    isSuperAdmin
                      ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                      : currentPlan === 'DIAMOND'
                      ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                      : currentPlan === 'GOLD'
                      ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                      : isDark
                      ? 'bg-slate-800 text-slate-300 border-slate-700'
                      : 'bg-slate-100 text-slate-700 border-slate-300'
                  }`}>
                    {user?.subscriptionStatus || 'ACTIVE'}
                  </span>
                </div>

                {/* Renewal info */}
                {user?.planExpiry && !isSuperAdmin && (
                  <div className={`p-3 rounded-xl border flex items-center justify-between text-xs font-mono ${
                    isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-white border-slate-200'
                  }`}>
                    <span className="flex items-center gap-1.5 opacity-80">
                      <Clock className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Renewal Date: {new Date(user.planExpiry).toLocaleDateString('en-IN')}</span>
                    </span>
                    {user.daysRemaining !== undefined && (
                      <span className="font-bold text-emerald-400">
                        {user.daysRemaining} days remaining
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Section 2: Included Entitlements */}
              <div className={`p-4 rounded-2xl border space-y-3 ${
                isDark ? 'bg-slate-900/40 border-slate-800/80' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center gap-2 pb-2 border-b border-slate-800/40">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 dark:text-slate-100">
                      Active Institutional Entitlements & Features
                    </h3>
                    <p className="text-[10px] opacity-60">Full suite of terminal analytics and trading features enabled for this tier</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {[
                    'Live Indian Market Option Chain (Nifty, BankNifty, FinNifty, Midcp)',
                    'Breakout Pattern Radar & Multitimeframe Confluence',
                    'Option Greeks, Gamma Exposure & Strike Heatmap',
                    'Instant WhatsApp & SMS Signal Alerts',
                    'Broker Terminal Integration (DhanHQ & Fyers v3)',
                    'Trade Journal with Target Hits & Nearness Audit'
                  ].map((feat, idx) => (
                    <div key={idx} className={`p-2.5 rounded-xl border flex items-center gap-2 ${
                      isDark ? 'bg-slate-900/60 border-slate-800/80' : 'bg-white border-slate-200'
                    }`}>
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="opacity-90">{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 3: Upgrade CTA */}
              {!isSuperAdmin && onOpenSubscribeModal && (
                <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-3 ${
                  isDark 
                    ? 'bg-gradient-to-r from-cyan-950/30 via-indigo-950/30 to-purple-950/30 border-cyan-500/30' 
                    : 'bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border-blue-200'
                }`}>
                  <div>
                    <div className="font-bold text-xs flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-yellow-400" />
                      <span>Want higher alpha signals & VIP Greeks?</span>
                    </div>
                    <p className="text-[11px] opacity-75 mt-0.5">
                      Upgrade to Gold or Diamond for institutional orderflow and automated strike execution.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenSubscribeModal();
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition shadow-md shrink-0 flex items-center gap-1 cursor-pointer ${
                      isDark
                        ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-cyan-500/20'
                        : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-500/25'
                    }`}
                  >
                    <span>Upgrade Membership</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Fixed Action Footer */}
            <div className={`shrink-0 p-4 sm:px-6 py-3.5 border-t flex items-center justify-between gap-2 z-10 ${
              isDark ? 'border-slate-800 bg-[#0c1220]/95' : 'border-slate-200 bg-white/95'
            }`}>
              <button
                type="button"
                onClick={handleModalLogout}
                className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className={`px-5 py-2 rounded-xl border text-xs font-bold transition cursor-pointer ${
                  isDark 
                    ? 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-400 hover:text-white' 
                    : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-600 hover:text-slate-900'
                }`}
              >
                Close
              </button>
            </div>
          </div>
        )}

      </div>
    </div>,
    document.body
  );
};
