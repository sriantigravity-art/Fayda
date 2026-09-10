import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles, Zap, ChevronDown, Check, Shield, Clock,
  ArrowRight, UserCheck, Star, Award, Crown, CheckCircle2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { FastSubscriptionModal } from './FastSubscriptionModal';

export const TopSubscribeDropdown: React.FC = () => {
  const { user, isAuthenticated, refreshSubscription } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalInitialPlan, setModalInitialPlan] = useState<'FREE' | 'SILVER' | 'GOLD' | 'DIAMOND'>('GOLD');
  const [modalInitialCycle, setModalInitialCycle] = useState<'MONTHLY' | 'QUARTERLY' | 'ANNUAL'>('MONTHLY');

  // Quick switcher inside dropdown
  const [previewPlan, setPreviewPlan] = useState<'FREE' | 'SILVER' | 'GOLD' | 'DIAMOND'>('GOLD');
  const [previewCycle, setPreviewCycle] = useState<'MONTHLY' | 'ANNUAL'>('MONTHLY');

  const dropdownRef = useRef<HTMLDivElement>(null);

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

  const currentPlan = (user?.plan || 'FREE').toUpperCase() as 'FREE' | 'SILVER' | 'GOLD' | 'DIAMOND' | 'BASIC' | 'PRO' | 'PREMIUM';
  const isPaid = currentPlan !== 'FREE';

  const PLAN_PRICES = {
    FREE: { MONTHLY: 0, ANNUAL: 0, tag: 'Starter' },
    SILVER: { MONTHLY: 999, ANNUAL: 7999, tag: 'Momentum' },
    GOLD: { MONTHLY: 2499, ANNUAL: 19999, tag: 'High-Alpha' },
    DIAMOND: { MONTHLY: 5999, ANNUAL: 49999, tag: 'VIP Elite' }
  };

  const handleOpenSubscribe = (plan?: 'FREE' | 'SILVER' | 'GOLD' | 'DIAMOND') => {
    if (plan) setModalInitialPlan(plan);
    else setModalInitialPlan(previewPlan);
    setModalInitialCycle(previewCycle === 'ANNUAL' ? 'ANNUAL' : 'MONTHLY');
    setIsOpen(false);
    setModalOpen(true);
  };

  return (
    <>
      <div className="relative inline-block" ref={dropdownRef}>
        {/* Top Middle Subscribe Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`group flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-300 shadow-md transform hover:scale-[1.02] active:scale-95 ${
            isPaid
              ? currentPlan === 'DIAMOND' || currentPlan === 'PREMIUM'
                ? 'bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 text-white shadow-purple-900/40 border border-purple-400/40'
                : currentPlan === 'GOLD' || currentPlan === 'PRO'
                ? 'bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 text-black shadow-amber-900/30 border border-yellow-300/40'
                : 'bg-gradient-to-r from-slate-700 via-slate-600 to-slate-800 text-white shadow-slate-900/40 border border-slate-500/40'
              : 'bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 text-white shadow-cyan-900/40 hover:shadow-cyan-500/30 border border-cyan-400/40 animate-pulse'
          }`}
          title="Fayda Membership & Subscription Center"
        >
          {isPaid ? (
            <>
              {currentPlan === 'DIAMOND' ? <Crown className="w-3.5 h-3.5 text-yellow-300" /> : <Award className="w-3.5 h-3.5 text-current" />}
              <span>{currentPlan} MEMBER</span>
              {user?.daysRemaining !== undefined && (
                <span className="opacity-90 font-mono text-[11px] bg-black/20 px-1.5 py-0.5 rounded-full">
                  {user.daysRemaining}d left
                </span>
              )}
            </>
          ) : (
            <>
              <Zap className="w-3.5 h-3.5 text-yellow-300 fill-yellow-300 animate-bounce" />
              <span className="tracking-wide">SUBSCRIBE NOW</span>
              <span className="hidden md:inline-block bg-white/20 px-1.5 py-0.2 rounded text-[10px] font-semibold">
                PLANS
              </span>
            </>
          )}
          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Interactive Dropdown Panel */}
        {isOpen && (
          <div className="absolute left-1/2 -translate-x-1/2 mt-2 w-80 sm:w-96 bg-[#0c1220] border border-cyan-500/30 rounded-2xl shadow-2xl shadow-cyan-950/60 p-4 z-[999] text-slate-100 animate-in fade-in slide-in-from-top-2 duration-150">
            {/* Header info */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <div className="text-[10px] uppercase font-bold tracking-wider text-cyan-400">
                  {user ? 'Subscriber 360°' : 'Fayda Terminal Access'}
                </div>
                <div className="text-sm font-bold text-white flex items-center gap-1.5 mt-0.5">
                  <span>{user ? user.fullName : 'Guest Trader'}</span>
                  {user?.subscriberId && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                      {user.subscriberId}
                    </span>
                  )}
                </div>
              </div>

              <div className="text-right">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  isPaid ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-300'
                }`}>
                  {currentPlan} PLAN
                </span>
                {user?.planExpiry && (
                  <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1 justify-end">
                    <Clock className="w-3 h-3 text-slate-500" />
                    <span>Exp: {new Date(user.planExpiry).toLocaleDateString('en-IN')}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Non-blocking profile progress bar */}
            {user && (
              <div className="py-2.5 px-3 my-2.5 rounded-xl bg-slate-900/80 border border-slate-800/80 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-cyan-400" />
                  <span className="text-slate-300">Profile {user.profileCompletionPct || 35}% Complete</span>
                </div>
                <span className="text-[10px] text-cyan-400 hover:underline cursor-pointer font-medium" onClick={() => handleOpenSubscribe()}>
                  View Perks
                </span>
              </div>
            )}

            {/* Quick Plan Switcher & Preview */}
            <div className="my-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">Quick Plan Preview</span>
                <div className="flex items-center p-0.5 rounded-md bg-slate-950 border border-slate-800 text-[10px]">
                  <button
                    onClick={() => setPreviewCycle('MONTHLY')}
                    className={`px-2 py-0.5 rounded ${previewCycle === 'MONTHLY' ? 'bg-cyan-500 text-black font-bold' : 'text-slate-400'}`}
                  >
                    Monthly
                  </button>
                  <button
                    onClick={() => setPreviewCycle('ANNUAL')}
                    className={`px-2 py-0.5 rounded ${previewCycle === 'ANNUAL' ? 'bg-cyan-500 text-black font-bold' : 'text-slate-400'}`}
                  >
                    Annual (-33%)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-1.5">
                {(['FREE', 'SILVER', 'GOLD', 'DIAMOND'] as const).map(p => {
                  const isSelected = previewPlan === p;
                  return (
                    <button
                      key={p}
                      onClick={() => setPreviewPlan(p)}
                      className={`p-2 rounded-xl text-center border transition-all ${
                        isSelected
                          ? 'bg-gradient-to-b from-slate-900 to-[#101b33] border-cyan-400 text-white shadow-md shadow-cyan-500/10'
                          : 'bg-slate-950 border-slate-850 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="text-[10px] font-bold">{p}</div>
                      <div className="text-xs font-black text-cyan-300 mt-0.5">
                        ₹{PLAN_PRICES[p][previewCycle] === 0 ? '0' : PLAN_PRICES[p][previewCycle].toLocaleString('en-IN')}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected preview highlight */}
            <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs space-y-1.5">
              <div className="flex items-center justify-between font-bold text-white">
                <span>{previewPlan} {PLAN_PRICES[previewPlan].tag}</span>
                <span className="text-emerald-400">
                  ₹{PLAN_PRICES[previewPlan][previewCycle].toLocaleString('en-IN')} /{previewCycle.toLowerCase()}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-tight">
                {previewPlan === 'FREE' && 'NSE spot feeds, delayed OI chain matrix, daily CPR checklist.'}
                {previewPlan === 'SILVER' && 'Live broker feeds, 10-indicator confluence, 1-min surge alerts.'}
                {previewPlan === 'GOLD' && 'High-Alpha CE/PE recommendations with WhatsApp & SMS trade alerts.'}
                {previewPlan === 'DIAMOND' && 'VIP desk priority, execution webhooks, 1-on-1 quant strategy desk.'}
              </p>
            </div>

            {/* Action CTA */}
            <div className="mt-3 pt-2 border-t border-slate-800 flex items-center gap-2">
              <button
                onClick={() => handleOpenSubscribe(previewPlan)}
                className="w-full py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-1.5 transition-all transform active:scale-95"
              >
                <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                <span>
                  {previewPlan === 'FREE'
                    ? 'Activate Free Starter'
                    : isPaid && previewPlan === currentPlan
                    ? 'Renew Membership'
                    : isPaid
                    ? `Upgrade to ${previewPlan}`
                    : `Subscribe to ${previewPlan}`}
                </span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
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
