import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles, Zap, ChevronDown, Check, Shield, Clock,
  ArrowRight, UserCheck, Star, Award, Crown, CheckCircle2, Lock, Gift
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { FastSubscriptionModal } from './FastSubscriptionModal';

export const TopSubscribeDropdown: React.FC = () => {
  const { user, isAuthenticated, refreshSubscription } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [isOpen, setIsOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalInitialPlan, setModalInitialPlan] = useState<'FREE' | 'SILVER' | 'GOLD' | 'DIAMOND'>('FREE');
  const [modalInitialCycle, setModalInitialCycle] = useState<'MONTHLY' | 'QUARTERLY' | 'ANNUAL'>('MONTHLY');

  // Quick switcher inside dropdown
  const [previewPlan, setPreviewPlan] = useState<'FREE' | 'SILVER' | 'GOLD' | 'DIAMOND'>('FREE');

  const dropdownRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Mouse over (hover) handlers with smooth debounce grace period
  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 220);
  };

  const isSuperAdmin = user?.role === 'SUPERADMIN';
  const currentPlan = (user?.plan || 'FREE').toUpperCase() as 'FREE' | 'SILVER' | 'GOLD' | 'DIAMOND' | 'BASIC' | 'PRO' | 'PREMIUM';
  const isMemberActive = isAuthenticated && (user?.daysRemaining === undefined || user.daysRemaining > 0);

  const handleOpenSubscribe = (plan: 'FREE' | 'SILVER' | 'GOLD' | 'DIAMOND' = 'FREE') => {
    setModalInitialPlan(plan);
    setModalInitialCycle('MONTHLY');
    setIsOpen(false);
    setModalOpen(true);
  };

  return (
    <>
      <div 
        className="relative inline-block" 
        ref={dropdownRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Top Middle 'Become a Member!' Button */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`group flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 rounded-full text-[11px] sm:text-xs font-bold transition-all duration-300 shadow-md transform hover:scale-[1.02] active:scale-95 shrink-0 cursor-pointer ${
            isDark
              ? 'bg-gradient-to-r from-purple-700 via-indigo-600 to-purple-800 hover:from-purple-600 hover:to-indigo-500 text-white shadow-purple-900/40 border border-purple-400/50'
              : 'bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-500 hover:to-purple-500 text-white shadow-indigo-900/30 border border-purple-300/60'
          }`}
          title="Become a Member! (Fayda Beta Special — All Facilities Unlocked)"
        >
          <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-yellow-300 animate-pulse shrink-0" />
          <span className="tracking-tight font-extrabold text-white whitespace-nowrap">
            Become a Member!
          </span>
          <ChevronDown className={`w-3 h-3 text-white/80 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Interactive Dropdown Panel (Opens on Mouse Over or Click) */}
        {isOpen && (
          <div 
            className={`absolute left-1/2 -translate-x-1/2 mt-2 w-[calc(100vw-1.5rem)] sm:w-[410px] max-w-md rounded-2xl shadow-2xl p-3.5 sm:p-4 z-[9999] animate-in fade-in slide-in-from-top-2 duration-150 border ${
              isDark
                ? 'bg-[#0c1220] border-purple-500/40 shadow-purple-950/60 text-slate-100'
                : 'bg-white border-purple-200 shadow-slate-400/40 text-slate-800'
            }`}
          >
            {/* Header info */}
            <div className={`flex items-center justify-between pb-3 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <div>
                <div className="flex items-center gap-1.5">
                  <Gift className="w-3.5 h-3.5 text-amber-400" />
                  <span className={`text-[10px] uppercase font-bold tracking-wider ${isDark ? 'text-cyan-400' : 'text-blue-600'}`}>
                    Fayda Membership Portal
                  </span>
                </div>
                <div className={`text-sm font-extrabold flex items-center gap-1.5 mt-0.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  <span>Become a Member!</span>
                  <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-mono font-bold px-1.5 py-0.2 rounded">
                    BETA ACCESS
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  isMemberActive
                    ? isDark
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-300 font-semibold'
                    : isDark
                    ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                    : 'bg-purple-100 text-purple-800 border-purple-200'
                }`}>
                  {isMemberActive ? 'MEMBER ACTIVE' : '2 MONTHS FREE'}
                </span>
                {user?.daysRemaining !== undefined && (
                  <div className={`text-[10px] mt-1 flex items-center gap-1 justify-end font-mono ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                    <Clock className="w-3 h-3" />
                    <span>{user.daysRemaining} days remaining</span>
                  </div>
                )}
              </div>
            </div>

            {/* BETA SPECIAL BANNER: 2 Months Free with ALL Facilities */}
            <div className={`my-3 p-3 rounded-2xl border ${
              isDark
                ? 'bg-gradient-to-br from-indigo-950/60 via-purple-950/40 to-slate-900 border-indigo-500/40 shadow-inner'
                : 'bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50 border-indigo-200 shadow-xs'
            }`}>
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-indigo-500/20">
                <div className="flex items-center gap-1.5 font-extrabold text-xs text-indigo-400 dark:text-indigo-300">
                  <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Free Beta Member (2 Months All Facilities)</span>
                </div>
                <span className="bg-emerald-500/20 text-emerald-400 dark:text-emerald-300 border border-emerald-500/40 text-[9px] font-black font-mono px-1.5 py-0.5 rounded-full uppercase">
                  100% FREE
                </span>
              </div>

              <div className="mt-2 text-xs space-y-1.5">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-black text-emerald-500 dark:text-emerald-400">₹0</span>
                  <span className={`text-[11px] font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    / 2 Months (60 Days Full Access)
                  </span>
                </div>
                <p className={`text-[11px] leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                  Enjoy <strong>all institutional facilities</strong> unlocked with zero payment or credit card required during our official Beta launch!
                </p>

                {/* 6 Unlocked Facilities List */}
                <div className="grid grid-cols-2 gap-x-2 gap-y-1 pt-1.5 text-[10px] font-medium">
                  <div className="flex items-center gap-1 text-emerald-500 dark:text-emerald-400">
                    <CheckCircle2 className="w-3 h-3 shrink-0" />
                    <span className={isDark ? 'text-slate-200' : 'text-slate-800'}>Live NSE/MCX Greeks Chain</span>
                  </div>
                  <div className="flex items-center gap-1 text-emerald-500 dark:text-emerald-400">
                    <CheckCircle2 className="w-3 h-3 shrink-0" />
                    <span className={isDark ? 'text-slate-200' : 'text-slate-800'}>75%+ Confluence Signals</span>
                  </div>
                  <div className="flex items-center gap-1 text-emerald-500 dark:text-emerald-400">
                    <CheckCircle2 className="w-3 h-3 shrink-0" />
                    <span className={isDark ? 'text-slate-200' : 'text-slate-800'}>0DTE Hero-Zero Squeeze</span>
                  </div>
                  <div className="flex items-center gap-1 text-emerald-500 dark:text-emerald-400">
                    <CheckCircle2 className="w-3 h-3 shrink-0" />
                    <span className={isDark ? 'text-slate-200' : 'text-slate-800'}>10-Indicator Quant Radar</span>
                  </div>
                  <div className="flex items-center gap-1 text-emerald-500 dark:text-emerald-400">
                    <CheckCircle2 className="w-3 h-3 shrink-0" />
                    <span className={isDark ? 'text-slate-200' : 'text-slate-800'}>1-Min OI Surge Flash Alerts</span>
                  </div>
                  <div className="flex items-center gap-1 text-emerald-500 dark:text-emerald-400">
                    <CheckCircle2 className="w-3 h-3 shrink-0" />
                    <span className={isDark ? 'text-slate-200' : 'text-slate-800'}>Dhan & Fyers 1-Click Order</span>
                  </div>
                </div>
              </div>

              {/* Primary Action Button: Free Module Activation */}
              <div className="mt-3 pt-2 border-t border-indigo-500/20">
                <button
                  type="button"
                  onClick={() => handleOpenSubscribe('FREE')}
                  className="w-full py-2 px-3 rounded-xl font-bold text-xs text-white flex items-center justify-center gap-1.5 transition-all transform hover:scale-[1.01] active:scale-95 shadow-md bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                  <span>
                    {isMemberActive 
                      ? 'View My 2-Month Free Membership Details' 
                      : 'Activate Free Module (2 Months All Facilities)'}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Other Subscriptions: Beta Notice (Amounts & Purchase Buttons Hidden) */}
            <div className="mt-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className={`font-bold text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  Other Subscription Tiers
                </span>
                <span className="text-[9px] font-mono text-amber-500 dark:text-amber-400 font-semibold flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" />
                  <span>Beta Version • Pricing TBA</span>
                </span>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                {(['SILVER', 'GOLD', 'DIAMOND'] as const).map(p => {
                  const isSelected = previewPlan === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPreviewPlan(isSelected ? 'FREE' : p)}
                      className={`p-2 rounded-xl text-center border transition-all cursor-pointer ${
                        isSelected
                          ? isDark
                            ? 'bg-slate-900 border-purple-500/60 text-white shadow-sm'
                            : 'bg-purple-50 border-purple-400 text-purple-950 font-bold'
                          : isDark
                          ? 'bg-slate-950/80 border-slate-800 text-slate-400 hover:border-slate-700'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <div className="text-[10px] font-bold">{p}</div>
                      <div className="text-[9px] font-mono text-cyan-400 mt-0.5 truncate">
                        Free in Beta
                      </div>
                    </button>
                  );
                })}
              </div>

              {previewPlan !== 'FREE' && (
                <div className={`mt-2 p-2.5 rounded-xl border text-xs space-y-1 animate-in fade-in duration-150 ${
                  isDark ? 'bg-slate-950/90 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-center justify-between font-bold text-[11px]">
                    <span className={isDark ? 'text-white' : 'text-slate-900'}>{previewPlan} Tier Facilities</span>
                    <span className="text-[10px] font-mono text-cyan-400 font-bold">Amounts Hidden in Beta</span>
                  </div>
                  <p className={`text-[10px] leading-tight ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    All {previewPlan} tier capabilities (Signals, Greeks, Webhooks & Alerts) are already enabled for free under your 2-Month Free Beta Pass. Paid checkout buttons are disabled until public V1.0 launch.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Full Modal Box */}
      <FastSubscriptionModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        initialPlan={modalInitialPlan}
        initialCycle={modalInitialCycle}
      />
    </>
  );
};
