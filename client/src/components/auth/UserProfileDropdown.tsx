import React, { useState, useRef, useEffect } from 'react';
import {
  User, LogIn, LogOut, Crown, Shield, Zap, Star, Award,
  ChevronDown, Check, Copy, Clock, ExternalLink, Sliders,
  Sparkles, CheckCircle2, AlertCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

interface UserProfileDropdownProps {
  onOpenAuthModal: () => void;
  onOpenSubscribeModal: (plan?: 'FREE' | 'SILVER' | 'GOLD' | 'DIAMOND') => void;
  onOpenAdminDrawer?: () => void;
}

export const UserProfileDropdown: React.FC<UserProfileDropdownProps> = ({
  onOpenAuthModal,
  onOpenSubscribeModal,
  onOpenAdminDrawer
}) => {
  const { user, isAuthenticated, isSuperAdmin, logout } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [isOpen, setIsOpen] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCopySubscriberId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleLogout = () => {
    setIsOpen(false);
    logout();
  };

  // If Guest / Not Logged In: show modern Sign In button
  if (!user || !isAuthenticated) {
    return (
      <button
        type="button"
        onClick={onOpenAuthModal}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 shadow-sm transform hover:scale-[1.02] active:scale-95 cursor-pointer shrink-0 ${
          isDark
            ? 'bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-indigo-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 shadow-cyan-950/40'
            : 'bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-300 shadow-sm'
        }`}
        title="Sign In / Register to access personalized terminal privilege"
      >
        <LogIn className="w-3.5 h-3.5 text-current" />
        <span>Sign In</span>
      </button>
    );
  }

  const currentPlan = (user.plan || 'FREE').toUpperCase();
  const firstName = user.fullName?.trim().split(' ')[0] || (isSuperAdmin ? 'Admin' : 'Trader');
  const subscriberId = user.subscriberId || `SUB${user.id?.replace(/\D/g, '').padStart(6, '0') || '000101'}`;

  // Plan badge color helper
  const getPlanBadge = () => {
    if (isSuperAdmin) {
      return {
        label: 'SUPERADMIN',
        bg: isDark ? 'bg-purple-500/20 text-purple-300 border-purple-500/40' : 'bg-purple-100 text-purple-800 border-purple-300',
        icon: Crown
      };
    }
    switch (currentPlan) {
      case 'DIAMOND':
      case 'PREMIUM':
        return {
          label: 'DIAMOND',
          bg: isDark ? 'bg-purple-500/20 text-purple-300 border-purple-500/40' : 'bg-purple-100 text-purple-800 border-purple-300',
          icon: Crown
        };
      case 'GOLD':
      case 'PRO':
        return {
          label: 'GOLD',
          bg: isDark ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-amber-100 text-amber-800 border-amber-300',
          icon: Zap
        };
      case 'SILVER':
      case 'BASIC':
        return {
          label: 'SILVER',
          bg: isDark ? 'bg-slate-700/40 text-slate-200 border-slate-600' : 'bg-slate-100 text-slate-800 border-slate-300',
          icon: Shield
        };
      default:
        return {
          label: 'FREE',
          bg: isDark ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-slate-100 text-slate-700 border-slate-200',
          icon: Star
        };
    }
  };

  const badge = getPlanBadge();
  const BadgeIcon = badge.icon;

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      {/* Trigger Button: User Account Pill */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-2.5 py-1 rounded-xl text-xs font-bold transition-all duration-200 border cursor-pointer shrink-0 shadow-sm ${
          isDark
            ? 'bg-[#0e1626] border-slate-700/80 hover:border-slate-600 text-white hover:bg-slate-800/80'
            : 'bg-white border-slate-200 hover:border-slate-300 text-slate-900 hover:bg-slate-50'
        }`}
        title={`Logged in as ${user.fullName} (${user.email})`}
      >
        {/* Avatar circle */}
        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
          isSuperAdmin
            ? 'bg-gradient-to-tr from-purple-600 to-indigo-600 text-white'
            : currentPlan === 'GOLD' || currentPlan === 'PRO'
            ? 'bg-gradient-to-tr from-amber-500 to-yellow-500 text-black'
            : currentPlan === 'DIAMOND' || currentPlan === 'PREMIUM'
            ? 'bg-gradient-to-tr from-purple-600 to-pink-600 text-white'
            : isDark
            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
            : 'bg-blue-100 text-blue-700 border border-blue-300'
        }`}>
          {isSuperAdmin ? <Crown className="w-3.5 h-3.5" /> : firstName.charAt(0).toUpperCase()}
        </div>

        <span className="hidden sm:inline-block max-w-[100px] truncate font-medium">
          {firstName}
        </span>

        {/* Plan Pill */}
        <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded border font-bold ${badge.bg}`}>
          {badge.label}
        </span>

        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Flyout Profile & Logout Menu */}
      {isOpen && (
        <div className={`absolute right-0 mt-2 w-80 rounded-2xl shadow-2xl p-4 z-[9999] animate-in fade-in slide-in-from-top-2 duration-150 border ${
          isDark
            ? 'bg-[#0c1220] border-slate-800 text-slate-100 shadow-black/80'
            : 'bg-white border-slate-200 text-slate-800 shadow-slate-400/40'
        }`}>
          {/* Section 1: User Identity */}
          <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-base shadow-md shrink-0 ${
                isSuperAdmin
                  ? 'bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-purple-500/20'
                  : currentPlan === 'GOLD' || currentPlan === 'PRO'
                  ? 'bg-gradient-to-tr from-amber-500 to-yellow-500 text-black shadow-amber-500/20'
                  : currentPlan === 'DIAMOND'
                  ? 'bg-gradient-to-tr from-purple-600 to-pink-600 text-white shadow-purple-500/20'
                  : isDark
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'bg-blue-100 text-blue-700 border border-blue-300'
              }`}>
                {isSuperAdmin ? <Crown className="w-5 h-5 text-yellow-300" /> : firstName.charAt(0).toUpperCase()}
              </div>

              <div className="min-w-0">
                <div className="font-bold text-sm truncate flex items-center gap-1.5">
                  <span className={isDark ? 'text-white' : 'text-slate-900'}>{user.fullName}</span>
                </div>
                <div className={`text-xs truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {user.email}
                </div>
                {user.mobile && (
                  <div className={`text-[10px] font-mono mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                    +91 {user.mobile}
                  </div>
                )}
              </div>
            </div>

            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-bold shrink-0 ${badge.bg}`}>
              {badge.label}
            </span>
          </div>

          {/* Permanent Subscriber ID */}
          <div className={`mt-3 p-2.5 rounded-xl border flex items-center justify-between text-xs ${
            isDark ? 'bg-slate-950/70 border-slate-850' : 'bg-slate-50 border-slate-200'
          }`}>
            <div>
              <div className={`text-[10px] uppercase font-bold tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Permanent Subscriber ID
              </div>
              <div className={`font-mono font-bold text-xs mt-0.5 ${isDark ? 'text-cyan-400' : 'text-blue-700'}`}>
                {subscriberId}
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleCopySubscriberId(subscriberId)}
              className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition cursor-pointer ${
                copiedId
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                  : isDark
                  ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900'
              }`}
              title="Copy Subscriber ID"
            >
              {copiedId ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="text-[10px]">{copiedId ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          {/* Section 2: Membership Privileges & Plan Action */}
          <div className={`mt-3 p-3 rounded-xl border space-y-2 ${
            isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50/80 border-slate-200'
          }`}>
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="flex items-center gap-1.5">
                <BadgeIcon className="w-3.5 h-3.5 text-current" />
                <span className={isDark ? 'text-white' : 'text-slate-900'}>
                  {isSuperAdmin ? 'SuperAdmin Master Access' : `${currentPlan} Membership`}
                </span>
              </span>
              {user.daysRemaining !== undefined && !isSuperAdmin && (
                <span className={`text-[10px] font-mono ${isDark ? 'text-emerald-400' : 'text-emerald-700 font-bold'}`}>
                  {user.daysRemaining} days left
                </span>
              )}
            </div>

            {user.planExpiry && !isSuperAdmin && (
              <div className={`text-[10px] flex items-center gap-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                <Clock className="w-3 h-3" />
                <span>Renewal / Expiry: {new Date(user.planExpiry).toLocaleDateString('en-IN')}</span>
              </div>
            )}

            {/* Profile Progress Bar */}
            <div className="pt-1">
              <div className="flex justify-between text-[10px] mb-1">
                <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Profile Completion</span>
                <span className={`font-mono font-bold ${isDark ? 'text-cyan-400' : 'text-blue-600'}`}>
                  {user.profileCompletionPct || 35}%
                </span>
              </div>
              <div className={`w-full h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`}>
                <div
                  className={`h-full ${isDark ? 'bg-cyan-500' : 'bg-blue-600'}`}
                  style={{ width: `${user.profileCompletionPct || 35}%` }}
                />
              </div>
            </div>

            {/* Action CTA depending on role */}
            <div className="pt-2">
              {isSuperAdmin ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    if (onOpenAdminDrawer) onOpenAdminDrawer();
                  }}
                  className={`w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md ${
                    isDark
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-500/20'
                      : 'bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-600 hover:to-indigo-600 text-white shadow-purple-500/25'
                  }`}
                >
                  <Crown className="w-3.5 h-3.5 text-yellow-300" />
                  <span>Open SuperAdmin Matrix</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onOpenSubscribeModal();
                  }}
                  className={`w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md ${
                    isDark
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-cyan-500/20'
                      : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-500/25'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                  <span>{currentPlan === 'FREE' ? 'Upgrade to Pro Service' : 'Change / Upgrade Plan'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Section 3: Logout Action Button */}
          <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={handleLogout}
              className={`w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                isDark
                  ? 'bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 hover:text-rose-300'
                  : 'bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700'
              }`}
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out / Logout</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
